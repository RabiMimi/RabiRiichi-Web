import { useState, useEffect, useRef } from 'react';
import { useRoom, useSelf } from '../state/store';
import { isTsumoTile } from '../domain/model';
import type { IMenLikeMsg } from '../proto';
import { getScreenPosition } from '../scene/seat';
import { getCallPromptSeatClass } from './callPromptPosition';
import { findNewMeldCallType, type MeldCallType } from './callPromptEvents';

type CallType = MeldCallType | 'agari' | 'tsumo' | 'riichi';

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
  const currentUser = useSelf();
  const [flashes, setFlashes] = useState<FlashEntry[]>([]);

  const prevCalledMelds = useRef<Map<number, IMenLikeMsg[]>>(new Map());
  const prevAgariPlayers = useRef<Set<number>>(new Set());
  const prevRiichiIds = useRef<Map<number, number>>(new Map());
  const initializedPlayerIds = useRef<Set<number>>(new Set());
  const timerRefs = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  function trigger(playerId: number, seat: number, type: CallType) {
    const old = timerRefs.current.get(playerId);
    if (old) clearTimeout(old);

    setFlashes((prev) => [
      ...prev.filter((f) => f.playerId !== playerId),
      { type, seat, playerId, exiting: false },
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

    timerRefs.current.set(playerId, removeId);
    timerRefs.current.set(playerId, hideId);
    setTimeout(
      () => timerRefs.current.set(playerId, removeId),
      DISPLAY_DURATION,
    );
  }

  useEffect(() => {
    if (!room?.players) return;
    for (const p of room.players) {
      const gs = p.gameState;
      if (!gs || p.seat === undefined) continue;
      const pid = p.id;

      // A refreshed/reconnected room is an authoritative snapshot, not a
      // sequence of newly played events. Seed the baseline the first time a
      // player is observed so historical melds, riichi, and results do not
      // replay their prompt animations.
      if (!initializedPlayerIds.current.has(pid)) {
        initializedPlayerIds.current.add(pid);
        prevCalledMelds.current.set(pid, gs.hand.called);
        prevRiichiIds.current.set(pid, gs.riichiTileId);
        if (gs.agari) prevAgariPlayers.current.add(pid);
        continue;
      }

      const called = gs.hand.called;
      const callType = findNewMeldCallType(
        prevCalledMelds.current.get(pid) ?? [],
        called,
      );
      if (callType) trigger(pid, p.seat, callType);
      prevCalledMelds.current.set(pid, called);

      if (gs.agari && !prevAgariPlayers.current.has(pid)) {
        // Only flash if this player actually won (has incoming tile or isTsumo)
        if (gs.agari.incoming || gs.agari.isTsumo) {
          prevAgariPlayers.current.add(pid);
          const isT = gs.agari.isTsumo ?? isTsumoTile(gs.agari.incoming);
          trigger(pid, p.seat, isT ? 'tsumo' : 'agari');
        }
      }
      if (!gs.agari) prevAgariPlayers.current.delete(pid);

      const rid = gs.riichiTileId;
      const prvRid = prevRiichiIds.current.get(pid) ?? 0;
      if (rid !== 0 && prvRid === 0) trigger(pid, p.seat, 'riichi');
      prevRiichiIds.current.set(pid, rid);
    }
  }, [room]);

  useEffect(
    () => () => {
      for (const t of timerRefs.current.values()) clearTimeout(t);
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
        const screenPos =
          selfSeat !== undefined
            ? getScreenPosition(f.seat, selfSeat, playerCount)
            : 0;
        const pos = getCallPromptSeatClass(screenPos);
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
                src={CALL_IMAGES[f.type]}
                alt={f.type}
                className="h-auto w-16 object-contain sm:w-24 lg:w-40"
                draggable={false}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
