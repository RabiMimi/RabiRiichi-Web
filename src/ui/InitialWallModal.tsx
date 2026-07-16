import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tile } from '../domain/tile';
import type { RoomModel } from '../domain/model';
import { deadWallRinshanCount, NUM_DORA } from '../domain/model';
import { getCurrentRoundEvents } from '../replay/replayDriver';
import type { IGameTileMsg } from '../proto';
import { Tooltip } from './Tooltip';
import { Button } from './Button';
import { UiTile } from './UiTile';
import { MODAL } from './styles';

const SEAT_LEGEND_STYLES = [
  'bg-[#4a90e2]/30 border-[#4a90e2]',
  'bg-[#f5a623]/30 border-[#f5a623]',
  'bg-[#7ed321]/30 border-[#7ed321]',
  'bg-[#d0021b]/30 border-[#d0021b]',
];

const SEAT_BORDER_STYLES = [
  'border-2 border-[#4a90e2] shadow-[0_0_6px_rgba(74,144,226,0.5)]',
  'border-2 border-[#f5a623] shadow-[0_0_6px_rgba(245,166,35,0.5)]',
  'border-2 border-[#7ed321] shadow-[0_0_6px_rgba(126,211,33,0.5)]',
  'border-2 border-[#d0021b] shadow-[0_0_6px_rgba(208,2,27,0.5)]',
];

interface InitialWallModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomModel;
}

export function InitialWallModal({
  isOpen,
  onClose,
  room,
}: InitialWallModalProps): React.JSX.Element | null {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const initialWall = room.info?.initialWall;
  const tileRegistry = room.tileRegistry;

  // 1. Gather initial hand traceIds for each player seat
  const roundEvents = getCurrentRoundEvents();
  const initialHandTraceIds = new Map<number, Set<number>>(); // seat -> Set of traceId

  for (const ev of roundEvents) {
    if (ev.dealHandEvent) {
      const seat = ev.dealHandEvent.playerId ?? 0;
      let set = initialHandTraceIds.get(seat);
      if (!set) {
        set = new Set<number>();
        initialHandTraceIds.set(seat, set);
      }
      for (const tile of ev.dealHandEvent.tiles ?? []) {
        if (tile.traceId) {
          set.add(tile.traceId);
        }
      }
    }
  }

  // Helper to determine if a tile was in a player's initial hand, returning seat index or null
  const getInitialHandSeat = (
    traceId: number | null | undefined,
  ): number | null => {
    if (traceId == null) return null;
    for (const [seat, set] of initialHandTraceIds.entries()) {
      if (set.has(traceId)) {
        return seat;
      }
    }
    return null;
  };

  // Render a single tile item
  const renderTile = (
    tileMsg: IGameTileMsg | null | undefined,
    isWanpai = false,
  ) => {
    if (!tileMsg)
      return <div className="w-[28px] h-[38px] bg-transparent shrink-0" />;
    const tileVal = tileMsg.tile ?? 0;
    const traceId = tileMsg.traceId ?? undefined;
    const tileStr = tileVal !== 0 ? Tile.fromByte(tileVal).toString() : 'back';
    const isDrawn =
      typeof traceId === 'number' ? tileRegistry.has(traceId) : false;
    const initialHandSeat = getInitialHandSeat(traceId);

    const classes = [
      'w-[28px] h-[38px] rounded overflow-hidden bg-[#e0e0e0] relative transition-all duration-200 ease-in-out shrink-0',
      isWanpai
        ? 'outline-[1.5px] outline-dashed outline-[#d08a4a] outline-offset-1 shadow-[0_0_6px_rgba(208,138,74,0.6)]'
        : initialHandSeat !== null
          ? SEAT_BORDER_STYLES[initialHandSeat]
          : 'shadow-[0_1px_3px_rgba(0,0,0,0.3)]',
      isDrawn ? 'opacity-25' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const nickname =
      initialHandSeat !== null
        ? (room.players.find((p) => p.seat === initialHandSeat)?.nickname ??
          `P${initialHandSeat}`)
        : '';

    const titleText = [
      tileStr,
      initialHandSeat !== null
        ? `${t('replay.initialHand', 'Initial Hand')}: ${nickname}`
        : '',
      isDrawn
        ? t('replay.tileDrawn', 'Drawn')
        : t('replay.tileInWall', 'In Wall'),
    ]
      .filter(Boolean)
      .join(' | ');

    return (
      <Tooltip content={titleText} position="top">
        <div className={classes}>
          <UiTile
            tile={tileStr}
            size="custom"
            className="w-full h-full object-cover block"
          />
        </div>
      </Tooltip>
    );
  };

  const renderWall = () => {
    if (!initialWall) return null;

    // The dead wall sits at the end of the flattened list: NUM_DORA dora/ura
    // stacks followed by the rinshan stacks. Each stack is [top, bottom] because
    // the top tile is drawn first (server layout, see Wall.BuildInitialWall).
    const rinshanCount = deadWallRinshanCount(room.config);
    const deadWallTiles = 2 * NUM_DORA + rinshanCount;
    const deadWallStart = Math.max(0, initialWall.length - deadWallTiles);
    const totalStacks = Math.ceil(initialWall.length / 2);

    // Each drawn rinshan is replenished from the tail of the draw wall, so the
    // dead wall grows by one tile per rinshan drawn so far. The rinshan tiles
    // are the region after the dora/ura block; count how many are drawn.
    let rinshanDrawn = 0;
    for (let i = deadWallStart + 2 * NUM_DORA; i < initialWall.length; i++) {
      const tid = initialWall[i]?.traceId;
      if (typeof tid === 'number' && tileRegistry.has(tid)) {
        rinshanDrawn++;
      }
    }
    const effectiveDeadWallStart = Math.max(0, deadWallStart - rinshanDrawn);

    const stacks = [];
    for (let i = 0; i < totalStacks; i++) {
      const topIdx = 2 * i;
      const bottomIdx = 2 * i + 1;
      stacks.push(
        <div
          key={i}
          className="flex flex-col bg-white/[0.04] border-[1.5px] border-white/[0.08] rounded-md p-1 items-center gap-1 shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-150 ease-out hover:bg-white/10 hover:border-[#82aaf0]/50 hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
        >
          {renderTile(initialWall[topIdx], topIdx >= effectiveDeadWallStart)}
          {renderTile(
            initialWall[bottomIdx],
            bottomIdx >= effectiveDeadWallStart,
          )}
        </div>,
      );
    }

    return (
      <div className="flex flex-wrap gap-2 justify-center p-4 bg-black/40 rounded-lg border border-white/5 max-h-[450px] overflow-y-auto">
        {stacks}
      </div>
    );
  };

  return (
    <div className={MODAL.overlay} onClick={onClose}>
      <div
        className={`${MODAL.card} w-[95%] max-w-[920px] border border-[#82aaf0]/40 bg-[#0f172a]/95`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={MODAL.header}>
          <h3 className={MODAL.title}>
            {t('replay.initialWallTitle', 'Initial Wall')}
          </h3>
          <button type="button" className={MODAL.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>

        <div
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Wall Grid Section */}
          {initialWall && initialWall.length > 0 ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-4 text-xs bg-black/20 px-3.5 py-2.5 rounded-md border border-white/5">
                <span className="font-bold text-neutral-400">
                  {t('replay.legend', 'Legend')}:
                </span>
                {room.players.map((p) => (
                  <span
                    key={p.id}
                    className="flex items-center gap-1.5 text-neutral-300"
                  >
                    <span
                      className={`w-3 h-3 rounded-sm border-[1.5px] ${p.seat !== undefined ? (SEAT_LEGEND_STYLES[p.seat] ?? '') : ''}`}
                    />
                    {p.nickname} ({t('replay.initialHand', 'Initial Hand')})
                  </span>
                ))}
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <span className="w-3 h-3 rounded-sm border-[1.5px] bg-[#8b572a]/25 border-[#8b572a]" />
                  {t('replay.wanpai', 'Dead Wall (Wanpai)')}
                </span>
              </div>

              {renderWall()}
            </div>
          ) : (
            <div className="text-center p-12 text-neutral-500 italic bg-black/20 rounded-lg">
              {t(
                'replay.noWallData',
                'Initial wall data is not available in this replay log.',
              )}
            </div>
          )}
        </div>

        <div className={MODAL.footer}>
          <Button type="button" onClick={onClose}>
            {t('result.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
