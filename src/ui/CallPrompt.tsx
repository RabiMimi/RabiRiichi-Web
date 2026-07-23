import { useState, useEffect, useRef } from 'react';
import { useRoom, useSelf } from '../state/store';
import { isTsumoTile } from '../domain/model';
import { TileSource } from '../proto';
import { getScreenPosition } from '../scene/seat';
import type { IMenLikeMsg } from '../proto';

type CallType = 'chii' | 'pon' | 'kan' | 'agari' | 'tsumo' | 'riichi' | 'ryuukyoku';

const CALL_IMAGES: Record<CallType, string> = {
  chii: '/assets/ui/吃.png',
  pon: '/assets/ui/碰.png',
  kan: '/assets/ui/杠.png',
  agari: '/assets/ui/和.png',
  tsumo: '/assets/ui/自摸.png',
  riichi: '/assets/ui/立直.png',
  ryuukyoku: '', // mapped per-reason below
};

/** Maps server ryuukyoku reason names to image paths. */
const RYUUKYOKU_IMAGES: Record<string, string> = {
  suufon_renda: '/assets/ui/四风连打.png',
  kyuushu_kyuuhai: '/assets/ui/九种九牌.png',
  suucha_riichi: '/assets/ui/四家立直.png',
  triple_ron: '/assets/ui/三家和了.png',
  suukan_sanra: '/assets/ui/四杠散了.png',
};

const DISPLAY_DURATION = 1500;
const EXIT_DURATION = 350;

interface FlashEntry {
  type: CallType;
  seat: number;
  playerId: number;
  exiting: boolean;
  /** Override image for ryuukyoku reasons. */
  imgSrc?: string;
}

export function CallPrompt(): React.JSX.Element | null {
  const room = useRoom();
  const currentUser = useSelf();
  const [flashes, setFlashes] = useState<FlashEntry[]>([]);

  const prevCalledCounts = useRef<Map<number, number>>(new Map());
  const prevAgariPlayers = useRef<Set<number>>(new Set());
  const prevRiichiIds = useRef<Map<number, number>>(new Map());
  const prevRyuukyokuReason = useRef<string | null | undefined>(null);
  const initialized = useRef(false);
  const timerRefs = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  function trigger(playerId: number, seat: number, type: CallType, imgSrc?: string) {
    const old = timerRefs.current.get(playerId);
    if (old) clearTimeout(old);

    setFlashes((prev) => [
      ...prev.filter((f) => f.playerId !== playerId),
      { type, seat, playerId, exiting: false, imgSrc },
    ]);

    const hideId = setTimeout(() => {
      setFlashes((prev) =>
        prev.map((f) => (f.playerId === playerId ? { ...f, exiting: true } : f)),
      );
    }, DISPLAY_DURATION);

    const removeId = setTimeout(() => {
      setFlashes((prev) => prev.filter((f) => f.playerId !== playerId));
    }, DISPLAY_DURATION + EXIT_DURATION);

    timerRefs.current.set(playerId, hideId);
    setTimeout(() => timerRefs.current.set(playerId, removeId), DISPLAY_DURATION);
  }

  useEffect(() => {
    if (!room?.players) return;

    // On first observation, seed baselines so historical state doesn't replay
    if (!initialized.current) {
      for (const p of room.players) {
        if (!p.gameState || p.seat === undefined) continue;
        prevCalledCounts.current.set(p.id, p.gameState.hand.called.length);
        prevRiichiIds.current.set(p.id, p.gameState.riichiTileId ?? 0);
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

      // Detect new melds
      const called = gs.hand.called;
      const prevCount = prevCalledCounts.current.get(pid) ?? 0;
      if (called.length > prevCount && prevCount >= 0) {
        for (const m of called.slice(prevCount)) {
          if (m?.tiles?.length) {
            trigger(pid, p.seat, detectCallType(m));
            break;
          }
        }
      }
      prevCalledCounts.current.set(pid, called.length);

      // Detect agari
      if (gs.agari && !prevAgariPlayers.current.has(pid)) {
        if (gs.agari.incoming || gs.agari.isTsumo) {
          prevAgariPlayers.current.add(pid);
          trigger(pid, p.seat, gs.agari.isTsumo ?? isTsumoTile(gs.agari.incoming) ? 'tsumo' : 'agari');
        }
      }
      if (!gs.agari) prevAgariPlayers.current.delete(pid);

      // Detect riichi
      const rid = gs.riichiTileId ?? 0;
      if (rid !== 0 && (prevRiichiIds.current.get(pid) ?? 0) === 0)
        trigger(pid, p.seat, 'riichi');
      prevRiichiIds.current.set(pid, rid);
    }

    // Detect ryuukyoku
    const reason = room.ryuukyokuReason;
    if (reason && reason !== prevRyuukyokuReason.current) {
      prevRyuukyokuReason.current = reason;
      const imgSrc = RYUUKYOKU_IMAGES[reason];
      if (imgSrc) {
        // Table-wide event — flash at table center (use playerId -1 for unique key)
        trigger(-1, room.info?.dealer ?? 0, 'ryuukyoku', imgSrc);
      }
    }
    if (!reason) prevRyuukyokuReason.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  useEffect(() => () => { for (const t of timerRefs.current.values()) clearTimeout(t); }, []);

  if (flashes.length === 0 || !room) return null;

  const selfPlayer = currentUser ? room.players.find((p) => p.id === currentUser.id) : undefined;
  const selfSeat = selfPlayer?.seat;
  const playerCount = room.config?.playerCount ?? room.players.length;

  return (
    <div className="absolute inset-0 pointer-events-none z-[55]">
      {flashes.map((f) => {
        const screenPos = selfSeat !== undefined
          ? getScreenPosition(f.seat, selfSeat, playerCount)
          : 0;
        const pos = getSeatClass(screenPos);
        const imgSrc = f.imgSrc ?? CALL_IMAGES[f.type];
        if (!imgSrc) return null;
        return (
          <div key={f.playerId} className={`absolute ${pos} flex flex-col items-center`}>
            <div
              className={f.exiting ? 'animate-call-prompt-exit' : 'animate-call-prompt-entrance'}
              style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.8))' }}
            >
              <img src={imgSrc} alt={f.type} className="h-auto w-16 object-contain sm:w-24 lg:w-40" draggable={false} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getSeatClass(screenPos: number): string {
  switch (screenPos) {
    case 0: return 'bottom-[20vh] left-1/2 -translate-x-1/2';
    case 1: return 'top-[39%] left-[58%] -translate-x-1/2 -translate-y-1/2';
    case 2: return 'top-[22vh] left-1/2 -translate-x-1/2';
    case 3: return 'top-[39%] left-[42%] -translate-x-1/2 -translate-y-1/2';
    default: return 'bottom-[20vh] left-1/2 -translate-x-1/2';
  }
}

function detectCallType(meld: IMenLikeMsg): CallType {
  const s = meld.tiles?.[0]?.source;
  if (s === TileSource.TILE_SOURCE_PON) return 'pon';
  if (s === TileSource.TILE_SOURCE_CHII) return 'chii';
  if (s === TileSource.TILE_SOURCE_DAIMINKAN || s === TileSource.TILE_SOURCE_KAKAN || s === TileSource.TILE_SOURCE_ANKAN) return 'kan';
  return (meld.tiles ?? []).length >= 4 ? 'kan' : 'pon';
}
