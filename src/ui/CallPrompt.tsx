import { useState, useEffect, useRef } from 'react';
import { useRoom, useSelf } from '../state/store';
import { isTsumoTile } from '../domain/model';
import { TileSource } from '../proto';
import type { IMenLikeMsg } from '../proto';

type CallType = 'chii' | 'pon' | 'kan' | 'agari' | 'tsumo' | 'riichi';

const CALL_IMAGES: Record<CallType, string> = {
  chii: '/assets/ui/吃.png',
  pon: '/assets/ui/碰.png',
  kan: '/assets/ui/杠.png',
  agari: '/assets/ui/和.png',
  tsumo: '/assets/ui/自摸.png',
  riichi: '/assets/ui/立直.png',
};

const DISPLAY_DURATION = 1500;
const EXIT_DURATION = 350;

interface FlashEntry {
  type: CallType;
  seat: number;
  playerId: number;
  exiting: boolean;
}

export function CallPrompt(): React.JSX.Element | null {
  const room = useRoom();
  const self = useSelf();
  const [flashes, setFlashes] = useState<FlashEntry[]>([]);

  const prevCalledCounts = useRef<Map<number, number>>(new Map());
  const prevAgariPlayers = useRef<Set<number>>(new Set());
  const prevRiichiIds = useRef<Map<number, number>>(new Map());
  const timerRefs = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  function trigger(playerId: number, seat: number, type: CallType) {
    const old = timerRefs.current.get(playerId);
    if (old) clearTimeout(old);

    setFlashes((prev) => [
      ...prev.filter((f) => f.playerId !== playerId),
      { type, seat, playerId, exiting: false },
    ]);

    const hideId = setTimeout(() => {
      setFlashes((prev) => prev.map((f) => (f.playerId === playerId ? { ...f, exiting: true } : f)));
    }, DISPLAY_DURATION);

    const removeId = setTimeout(() => {
      setFlashes((prev) => prev.filter((f) => f.playerId !== playerId));
    }, DISPLAY_DURATION + EXIT_DURATION);

    timerRefs.current.set(playerId, removeId);
    timerRefs.current.set(playerId, hideId);
    setTimeout(() => timerRefs.current.set(playerId, removeId), DISPLAY_DURATION);
  }

  useEffect(() => {
    if (!room?.players) return;
    for (const p of room.players) {
      const gs = p.gameState;
      if (!gs || p.seat === undefined) continue;
      const pid = p.id;

      let pc = prevCalledCounts.current.get(pid) ?? 0;
      const called = gs.hand.called;
      if (called.length > pc && pc >= 0) {
        for (const m of called.slice(pc)) {
          if (m?.tiles?.length) { trigger(pid, p.seat, detectCallType(m)); break; }
        }
      }
      prevCalledCounts.current.set(pid, called.length);

      if (gs.agari && !prevAgariPlayers.current.has(pid)) {
        // Only flash if this player actually won (has incoming tile or isTsumo)
        if (gs.agari.incoming || gs.agari.isTsumo) {
          prevAgariPlayers.current.add(pid);
          const isT = gs.agari.isTsumo ?? isTsumoTile(gs.agari.incoming);
          trigger(pid, p.seat, isT ? 'tsumo' : 'agari');
        }
      }
      if (!gs.agari) prevAgariPlayers.current.delete(pid);

      const rid = gs.riichiTileId ?? 0;
      const prvRid = prevRiichiIds.current.get(pid) ?? 0;
      if (rid !== 0 && prvRid === 0) trigger(pid, p.seat, 'riichi');
      prevRiichiIds.current.set(pid, rid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  useEffect(() => () => { for (const t of timerRefs.current.values()) clearTimeout(t); }, []);

  if (flashes.length === 0 || !room) return null;

  const selfPlayer = self ? room.players.find((p) => p.id === self.id) : undefined;
  const selfSeat = selfPlayer?.seat;
  const playerCount = room.players.length;

  return (
    <div className="absolute inset-0 pointer-events-none z-[55]">
      {flashes.map((f) => {
        const relSeat = selfSeat !== undefined
          ? ((f.seat - selfSeat) % playerCount + playerCount) % playerCount
          : 0;
        const pos = getSeatClass(relSeat);
        return (
          <div key={f.playerId} className={`absolute ${pos} flex flex-col items-center`}>
            <div
              className={f.exiting ? 'animate-call-prompt-exit' : 'animate-call-prompt-entrance'}
              style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.8))' }}
            >
              <img
                src={CALL_IMAGES[f.type]}
                alt={f.type}
                className="w-16 h-auto sm:w-24 lg:w-32 object-contain"
                draggable={false}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getSeatClass(relSeat: number): string {
  switch (relSeat) {
    case 0: return 'bottom-[20vh] left-1/2 -translate-x-1/2';
    case 1: return 'top-[41%] left-[58%] -translate-x-1/2 -translate-y-1/2';
    case 2: return 'top-[22vh] left-1/2 -translate-x-1/2';
    case 3: return 'top-[41%] left-[42%] -translate-x-1/2 -translate-y-1/2';
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
