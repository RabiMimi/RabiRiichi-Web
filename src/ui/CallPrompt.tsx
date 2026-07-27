import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoom, useSelf } from '../state/store';
import { isTsumoTile } from '../domain/model';
import { getScreenPosition } from '../scene/seat';
import { getCallPromptSeatClass } from './callPromptPosition';
import { findNewMeldCallType, type MeldCallType } from './callPromptEvents';
import { getRyuukyokuArtwork } from './ryuukyokuArtwork';
import type { IMenLikeMsg } from '../proto';

type CallType =
  'chii' | 'pon' | 'kan' | 'agari' | 'tsumo' | 'riichi' | 'ryuukyoku';

const CALL_ASSET_KEYS: Record<Exclude<CallType, 'ryuukyoku'>, string> = {
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
 * A draw is a table-wide event with no owning player, so it flashes under a
 * synthetic id (keeping it in the same "one flash per player" bookkeeping) and
 * is rendered at the table centre rather than at a seat.
 */
const RYUUKYOKU_PLAYER_ID = -1;
const RYUUKYOKU_SEAT = -1;

interface FlashEntry {
  type: CallType;
  seat: number;
  playerId: number;
  exiting: boolean;
  /** Override image for ryuukyoku reasons. */
  imgSrc: string | undefined;
  /** Draw reason, so the banner can be described for screen readers. */
  reason: string | undefined;
}

/** i18n key describing a flash, used as the banner's alt text. */
function flashLabelKey(flash: FlashEntry): string {
  if (flash.type === 'ryuukyoku') {
    return `result.ryuukyoku.${flash.reason ?? 'end_game_ryuukyoku'}`;
  }
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
  ) {
    const old = timerRefs.current.get(playerId);
    if (old) clearTimeout(old);

    setFlashes((prev) => [
      ...prev.filter((f) => f.playerId !== playerId),
      { type, seat, playerId, exiting: false, imgSrc, reason },
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

    // Detect ryuukyoku
    const reason = room.ryuukyokuReason;
    if (reason && reason !== prevRyuukyokuReason.current) {
      prevRyuukyokuReason.current = reason;
      const imgSrc = getRyuukyokuArtwork(reason);
      if (imgSrc) {
        // An abortive draw belongs to the table, not to a player, so it uses
        // the synthetic id/seat below and renders centred (see RYUUKYOKU_SEAT).
        trigger(
          RYUUKYOKU_PLAYER_ID,
          RYUUKYOKU_SEAT,
          'ryuukyoku',
          imgSrc,
          reason,
        );
      }
    }
    if (!reason) prevRyuukyokuReason.current = null;
  }, [room]);

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
        const isTableWide = f.seat === RYUUKYOKU_SEAT;
        let pos: string;
        if (isTableWide) {
          pos = 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
        } else {
          const screenPos =
            selfSeat !== undefined
              ? getScreenPosition(f.seat, selfSeat, playerCount)
              : 0;
          pos = getCallPromptSeatClass(screenPos);
        }
        const imgSrc =
          f.imgSrc ??
          (f.type !== 'ryuukyoku' ? t(CALL_ASSET_KEYS[f.type]) : '');
        if (!imgSrc) return null;
        return (
          <div
            key={f.playerId}
            className={`absolute ${pos} flex flex-col items-center`}
          >
            <div
              className={
                f.exiting
                  ? 'animate-call-prompt-exit'
                  : 'animate-call-prompt-entrance'
              }
              style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.8))' }}
            >
              <img
                src={imgSrc}
                alt={t(flashLabelKey(f))}
                className={
                  isTableWide
                    ? // A draw announcement carries the whole table, so it gets
                      // more presence than a per-seat call flash.
                      'h-auto w-40 object-contain sm:w-56 lg:w-80'
                    : 'h-auto w-16 object-contain sm:w-24 lg:w-40'
                }
                draggable={false}
              />
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
