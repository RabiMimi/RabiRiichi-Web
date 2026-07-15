import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tile } from '../domain/tile';
import { getTileTexturePath } from '../scene/assets';
import type { RoomModel } from '../domain/model';
import { deadWallRinshanCount, NUM_DORA } from '../domain/model';
import { getCurrentRoundEvents } from '../replay/replayDriver';
import type { IGameTileMsg } from '../proto';
import { Tooltip } from './Tooltip';
import { Button } from './Button';
import { MODAL } from './styles';

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
    if (!tileMsg) return <div className="wall-tile-empty" />;
    const tileVal = tileMsg.tile ?? 0;
    const traceId = tileMsg.traceId ?? undefined;
    const tileStr = tileVal !== 0 ? Tile.fromByte(tileVal).toString() : 'back';
    const isDrawn =
      typeof traceId === 'number' ? tileRegistry.has(traceId) : false;
    const initialHandSeat = getInitialHandSeat(traceId);

    // Classes for styling
    let classes = 'wall-tile';
    if (isWanpai) classes += ' wanpai';
    if (isDrawn) classes += ' dimmed';
    if (initialHandSeat !== null)
      classes += ` initial-hand-seat-${initialHandSeat}`;

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
          <img
            src={getTileTexturePath(tileStr)}
            alt={tileStr}
            className="wall-tile-img"
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
        <div key={i} className="wall-stack">
          {renderTile(initialWall[topIdx], topIdx >= effectiveDeadWallStart)}
          {renderTile(
            initialWall[bottomIdx],
            bottomIdx >= effectiveDeadWallStart,
          )}
        </div>,
      );
    }

    return <div className="initial-wall-stacks-flex">{stacks}</div>;
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

        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          {/* Wall Grid Section */}
          {initialWall && initialWall.length > 0 ? (
            <div className="initial-wall-grid-container">
              <div className="color-legend">
                <span className="legend-title">
                  {t('replay.legend', 'Legend')}:
                </span>
                {room.players.map((p) => (
                  <span
                    key={p.id}
                    className={`legend-item legend-seat-${p.seat}`}
                  >
                    <span className="legend-color-box" />
                    {p.nickname} ({t('replay.initialHand', 'Initial Hand')})
                  </span>
                ))}
                <span className="legend-item legend-wanpai">
                  <span className="legend-color-box" />
                  {t('replay.wanpai', 'Dead Wall (Wanpai)')}
                </span>
              </div>

              {renderWall()}
            </div>
          ) : (
            <div className="no-wall-data">
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
