import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoom, useSelf } from '../state/store';
import { isTsumoTile, yakumanOutlook } from '../domain/model';
import type { YakumanOutlook } from '../domain/model';
import { isKazoeYakumanEnabled, isYakumanEnabled } from '../domain/yakus';
import { getScreenPosition } from '../scene/seat';
import {
  YAKUMAN_PROMPT_CLASS,
  getCallPromptSeatClass,
} from './callPromptPosition';
import { findNewMeldCallType, type MeldCallType } from './callPromptEvents';
import { getRyuukyokuArtwork } from './ryuukyokuArtwork';
import { getYakumanArtwork } from './yakumanArtwork';
import type { IMenLikeMsg } from '../proto';
import { DEFAULT_MIN_HAN } from '../domain/constants';

type CallType =
  | 'chii'
  | 'pon'
  | 'kan'
  | 'agari'
  | 'tsumo'
  | 'riichi'
  | 'ryuukyoku'
  | 'yakuman';

const CALL_ASSET_KEYS: Record<
  Exclude<CallType, 'ryuukyoku' | 'yakuman'>,
  string
> = {
  chii: 'assets.ui.chii',
  pon: 'assets.ui.pon',
  kan: 'assets.ui.kan',
  agari: 'assets.ui.ron',
  tsumo: 'assets.ui.tsumo',
  riichi: 'assets.ui.riichi',
};

const DISPLAY_DURATION = 1500;
const EXIT_DURATION = 350;

/**
 * Banners that belong to no particular seat. They flash under synthetic ids so
 * they keep their own slot in the "one flash per player" bookkeeping, and are
 * positioned by type rather than by seat.
 */
const RYUUKYOKU_PLAYER_ID = -1;
const NO_SEAT = -1;

/**
 * A yakuman announcement is about the viewer's own hand rather than an action,
 * so it gets its own slot and does not displace a call flash for the same seat.
 */
const YAKUMAN_PLAYER_ID = -2;

interface FlashEntry {
  type: CallType;
  seat: number;
  playerId: number;
  exiting: boolean;
  /** Override image for ryuukyoku reasons. */
  imgSrc: string | undefined;
  /** Draw reason, so the banner can be described for screen readers. */
  reason: string | undefined;
  /** Gold overlay for the yakuman-confirmed reveal. */
  glowSrc?: string | undefined;
}

/**
 * i18n key for a call's artwork, or null for the banners that supply their own
 * (ryuukyoku picks art per draw reason, yakuman per outlook).
 */
function callAssetKey(type: CallType): string | null {
  if (type === 'ryuukyoku' || type === 'yakuman') return null;
  return CALL_ASSET_KEYS[type];
}

/** i18n key describing a flash, used as the banner's alt text. */
function flashLabelKey(flash: FlashEntry): string {
  if (flash.type === 'ryuukyoku') {
    return `result.ryuukyoku.${flash.reason ?? 'end_game_ryuukyoku'}`;
  }
  if (flash.type === 'yakuman') return 'hud.yakuman';
  // `agari` is the domain name for a ron; the other types share their key name.
  return `hud.action.${flash.type === 'agari' ? 'ron' : flash.type}`;
}

export function CallPrompt(): React.JSX.Element | null {
  const { t } = useTranslation();
  const room = useRoom();
  const currentUser = useSelf();
  const [flashes, setFlashes] = useState<FlashEntry[]>([]);

  const prevCalledMelds = useRef<Map<number, readonly IMenLikeMsg[]>>(
    new Map(),
  );
  const prevAgariPlayers = useRef<Set<number>>(new Set());
  const prevRiichiIds = useRef<Map<number, number>>(new Map());
  const prevRyuukyokuReason = useRef<string | null | undefined>(null);
  const prevYakumanOutlook = useRef<YakumanOutlook>(null);
  const initialized = useRef(false);
  const timerRefs = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  function trigger(
    playerId: number,
    seat: number,
    type: CallType,
    imgSrc?: string,
    reason?: string,
    glowSrc?: string,
  ) {
    const old = timerRefs.current.get(playerId);
    if (old) clearTimeout(old);

    setFlashes((prev) => [
      ...prev.filter((f) => f.playerId !== playerId),
      { type, seat, playerId, exiting: false, imgSrc, reason, glowSrc },
    ]);

    const hideId = setTimeout(() => {
      setFlashes((prev) =>
        prev.map((f) =>
          f.playerId === playerId ? { ...f, exiting: true } : f,
        ),
      );
    }, DISPLAY_DURATION);

    const removeId = setTimeout(() => {
      setFlashes((prev) => prev.filter((f) => f.playerId !== playerId));
    }, DISPLAY_DURATION + EXIT_DURATION);

    timerRefs.current.set(playerId, hideId);
    setTimeout(
      () => timerRefs.current.set(playerId, removeId),
      DISPLAY_DURATION,
    );
  }

  useEffect(() => {
    if (!room?.players) return;

    /** The viewer's own yakuman prospects, or null if they have none. */
    const currentYakumanOutlook = (): YakumanOutlook => {
      const viewer = currentUser
        ? room.players.find((p) => p.id === currentUser.id)
        : undefined;
      const waits = viewer?.gameState?.awaitedTiles;
      if (!waits || waits.length === 0) return null;
      return yakumanOutlook(waits, {
        minHan: room.config?.minHan ?? DEFAULT_MIN_HAN,
        yakumanEnabled: isYakumanEnabled(room.config?.scoringOption),
        kazoeEnabled: isKazoeYakumanEnabled(room.config?.scoringOption),
      });
    };

    // On first observation, seed baselines so historical state doesn't replay
    if (!initialized.current) {
      for (const p of room.players) {
        if (!p.gameState || p.seat === undefined) continue;
        prevCalledMelds.current.set(p.id, p.gameState.hand.called);
        prevRiichiIds.current.set(p.id, p.gameState.riichiTileId);
        if (p.gameState.agari?.incoming || p.gameState.agari?.isTsumo)
          prevAgariPlayers.current.add(p.id);
      }
      prevRyuukyokuReason.current = room.ryuukyokuReason;
      prevYakumanOutlook.current = currentYakumanOutlook();
      initialized.current = true;
      return;
    }

    for (const p of room.players) {
      const gs = p.gameState;
      if (!gs || p.seat === undefined) continue;
      const pid = p.id;

      // Detect new melds. findNewMeldCallType covers both shapes a call can
      // take: chii/pon/daiminkan/ankan append a meld, while kakan upgrades an
      // existing pon in place and so leaves the meld count unchanged.
      const called = gs.hand.called;
      const prevCalled = prevCalledMelds.current.get(pid);
      if (prevCalled !== undefined) {
        const meldType = findNewMeldCallType(prevCalled, called);
        if (meldType) {
          trigger(pid, p.seat, meldCallToCallType(meldType));
        }
      }
      prevCalledMelds.current.set(pid, called);

      // Detect agari
      if (gs.agari && !prevAgariPlayers.current.has(pid)) {
        if (gs.agari.incoming || gs.agari.isTsumo) {
          prevAgariPlayers.current.add(pid);
          trigger(
            pid,
            p.seat,
            (gs.agari.isTsumo ?? isTsumoTile(gs.agari.incoming))
              ? 'tsumo'
              : 'agari',
          );
        }
      }
      if (!gs.agari) prevAgariPlayers.current.delete(pid);

      // Detect riichi
      const rid = gs.riichiTileId;
      // `get` legitimately returns undefined for a player seen for the first
      // time; treat that as "was not in riichi".
      if (rid !== 0 && (prevRiichiIds.current.get(pid) ?? 0) === 0)
        trigger(pid, p.seat, 'riichi');
      prevRiichiIds.current.set(pid, rid);
    }

    // Announce the viewer's own yakuman prospects, but only as they improve --
    // re-announcing when a hand gets worse would just be noise.
    const outlook = currentYakumanOutlook();
    const prevOutlook = prevYakumanOutlook.current;
    const improved =
      (outlook === 'chance' && prevOutlook === null) ||
      (outlook === 'confirmed' && prevOutlook !== 'confirmed');
    if (improved) {
      const art = getYakumanArtwork(outlook);
      if (art) {
        // Rendered at a fixed position, so the seat is irrelevant here.
        trigger(
          YAKUMAN_PLAYER_ID,
          NO_SEAT,
          'yakuman',
          art.src,
          undefined,
          art.glowSrc,
        );
      }
    }
    prevYakumanOutlook.current = outlook;

    // Detect ryuukyoku
    const reason = room.ryuukyokuReason;
    if (reason && reason !== prevRyuukyokuReason.current) {
      prevRyuukyokuReason.current = reason;
      const imgSrc = getRyuukyokuArtwork(reason);
      if (imgSrc) {
        // An abortive draw belongs to the table, not a player: it renders
        // centred, so no seat is involved.
        trigger(RYUUKYOKU_PLAYER_ID, NO_SEAT, 'ryuukyoku', imgSrc, reason);
      }
    }
    if (!reason) prevRyuukyokuReason.current = null;
  }, [room, currentUser]);

  useEffect(
    () => () => {
      for (const timer of timerRefs.current.values()) clearTimeout(timer);
    },
    [],
  );

  if (flashes.length === 0 || !room) return null;

  const selfPlayer = currentUser
    ? room.players.find((p) => p.id === currentUser.id)
    : undefined;
  const selfSeat = selfPlayer?.seat;
  const playerCount = room.config?.playerCount ?? room.players.length;

  return (
    <div className="absolute inset-0 pointer-events-none z-[55]">
      {flashes.map((f) => {
        const isTableWide = f.type === 'ryuukyoku';
        const isYakuman = f.type === 'yakuman';
        let pos: string;
        if (isTableWide) {
          pos = 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
        } else if (isYakuman) {
          pos = YAKUMAN_PROMPT_CLASS;
        } else {
          const screenPos =
            selfSeat !== undefined
              ? getScreenPosition(f.seat, selfSeat, playerCount)
              : 0;
          pos = getCallPromptSeatClass(screenPos);
        }
        const assetKey = callAssetKey(f.type);
        const imgSrc = f.imgSrc ?? (assetKey ? t(assetKey) : '');
        if (!imgSrc) return null;

        const label = t(flashLabelKey(f));
        // A draw or yakuman announcement carries more weight than a per-seat
        // call, so it is drawn larger.
        const imgSize =
          isTableWide || isYakuman
            ? 'h-auto w-40 object-contain sm:w-56 lg:w-80'
            : 'h-auto w-16 object-contain sm:w-24 lg:w-40';

        let enterClass = 'animate-call-prompt-entrance';
        if (f.exiting) {
          enterClass = 'animate-call-prompt-exit';
        } else if (isYakuman) {
          enterClass = 'animate-yakuman-slam';
        }

        return (
          <div
            key={f.playerId}
            className={`absolute ${pos} flex flex-col items-center`}
          >
            <div
              className={enterClass}
              style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.8))' }}
            >
              <div className="relative">
                <img
                  src={imgSrc}
                  alt={label}
                  className={imgSize}
                  draggable={false}
                />
                {f.glowSrc && !f.exiting && (
                  // The gold wordmark flares over the plain one; it repeats the
                  // same image, so hide it from assistive tech.
                  <img
                    src={f.glowSrc}
                    alt=""
                    aria-hidden
                    draggable={false}
                    className={`absolute inset-0 ${imgSize} animate-yakuman-flare mix-blend-plus-lighter`}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function meldCallToCallType(meldType: MeldCallType | null): CallType {
  if (!meldType) return 'pon';
  return meldType;
}
