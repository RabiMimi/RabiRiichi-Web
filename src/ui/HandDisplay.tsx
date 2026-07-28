import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useRoom,
  useSelf,
  useCurrentInquiry,
  useIsRiichiSelectMode,
  useCallHighlightTileIds,
  useDoraIndicators,
  useHoveredTileTraceId,
  useSelectedTileTraceId,
} from '../state/store';
import { rabiriichi } from '../net/client';
import { Tile, checkIsDora } from '../domain/tile';
import { UiTile } from './UiTile';
import { SOUND_EFFECTS } from '../lib/soundEffects';
import {
  computeHandLayout,
  getHandTileLeft,
  type HandLayout,
} from './handLayout';
import { TileTooltip } from './TileTooltip';
import { useDragToDiscard, type DragToDiscard } from './useDragToDiscard';
import { isTileDimmed } from './handTileState';
import type { ActionOption } from '../domain/inquiry';

/** Tracks the viewport so the hand can shrink on small or short screens. */
function useViewportSize(): { width: number; height: number } {
  const [size, setSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  useEffect(() => {
    const onResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

/** Plays the tile hover blip, reusing a single audio element. */
function useHoverSound(): (traceId: number | null) => void {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  return useCallback((traceId: number | null) => {
    rabiriichi.hoverTile(traceId);
    if (traceId == null) return;
    audioRef.current ??= Object.assign(new Audio(SOUND_EFFECTS.tile.hover), {
      volume: 0.5,
    });
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => undefined);
  }, []);
}

interface HandTileProps {
  tile: number | null | undefined;
  layout: HandLayout;
  /** Highlighted tiles read as selectable; dimmed ones as excluded. */
  isHighlighted: boolean;
  isDimmed: boolean;
  isClickable: boolean;
  /** Dora (or akadora) tiles get the same sweeping sheen as the 3D tiles. */
  isDora: boolean;
  style?: React.CSSProperties;
  onClick: () => void;
  onHover: (isEntering: boolean) => void;
  drag: ReturnType<DragToDiscard['tileProps']>;
  dragStyle: React.CSSProperties;
  /** Lift distance (px) on hover; the drawn tile rises less. */
  hoverLift: number;
}

function HandTile({
  tile,
  layout,
  isHighlighted,
  isDimmed,
  isClickable,
  isDora,
  style,
  onClick,
  onHover,
  drag,
  dragStyle,
  hoverLift,
}: HandTileProps): React.JSX.Element {
  const { tileWidth, tileHeight, bevelHeight, rowHeight } = layout;
  const face = tile ? Tile.fromByte(tile).toString() : 'back';
  const [isHovered, setIsHovered] = useState(false);

  const setHover = (entering: boolean): void => {
    setIsHovered(entering);
    onHover(entering);
  };

  return (
    // The button is the hit area and must never move. Lifting it instead --
    // which is what `hover:-translate-y-*` on this element used to do -- slides
    // it out from under a cursor near the tile's lower edge, which fires
    // mouseleave, drops the tile back, and immediately re-enters: a flicker
    // loop. The box is therefore tall enough to hold both the resting and the
    // raised tile, so the vacated strip along the bottom keeps the hover alive.
    <button
      type="button"
      className={`relative bg-transparent border-none p-0 flex items-end ${
        isClickable ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={{
        width: tileWidth,
        height: rowHeight + hoverLift,
        ...style,
      }}
      onClick={onClick}
      onDragStart={(e) => e.preventDefault()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      {...drag}
    >
      <div
        className="relative w-full"
        style={{
          filter: 'drop-shadow(0 0 2px #000)',
          transform: isHovered ? `translateY(-${hoverLift}px)` : undefined,
          transition: 'transform 150ms ease-out',
          // A drag positions the tile directly and must override the lift.
          ...dragStyle,
        }}
      >
        <div
          className={`relative overflow-hidden rounded-lg ${
            isDora ? 'dora-sheen' : ''
          } ${isDimmed ? 'brightness-50' : ''}`}
        >
          <img
            src="/assets/hand_tiles/bevel.jpg"
            alt=""
            draggable={false}
            style={{ width: tileWidth, height: bevelHeight }}
            className="object-cover brightness-90 block"
          />
          <div>
            <UiTile
              tile={face}
              size="custom"
              isHighlighted={isHighlighted}
              className="bg-[#f7f4eb] block"
              style={{ width: tileWidth, height: tileHeight }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * DOM-rendered hand tile bar for the local player.
 */
export function HandDisplay(): React.JSX.Element | null {
  const room = useRoom();
  const currentUser = useSelf();
  const currentInquiry = useCurrentInquiry();
  const isRiichiSelectMode = useIsRiichiSelectMode();
  const callHighlightIds = useCallHighlightTileIds();
  const viewportSize = useViewportSize();
  const onHoverTile = useHoverSound();
  const doraIndicators = useDoraIndicators();
  const hoveredTraceId = useHoveredTileTraceId();
  const selectedTraceId = useSelectedTileTraceId();

  const isDoraTile = useCallback(
    (tile: number | null | undefined): boolean => {
      if (!tile) return false;
      try {
        return checkIsDora(Tile.fromByte(tile), doraIndicators);
      } catch {
        // A tile we cannot decode simply gets no sheen.
        return false;
      }
    },
    [doraIndicators],
  );

  const hand = useMemo(() => {
    const selfPlayer =
      room && currentUser
        ? room.players.find((p) => p.id === currentUser.id)
        : null;
    return selfPlayer?.gameState?.hand ?? null;
  }, [room, currentUser]);

  /** Tiles the server will accept as a discard right now. */
  const playableIds = useMemo(() => {
    const ids = new Set<number>();
    const legal = isRiichiSelectMode
      ? currentInquiry?.mapped.buttons.find((b) => b.type === 'riichi')
          ?.legalTiles
      : currentInquiry?.mapped.playTile?.legalTiles;
    legal?.forEach((id) => ids.add(id));
    return ids;
  }, [currentInquiry, isRiichiSelectMode]);

  const layout = useMemo(
    () =>
      computeHandLayout(
        viewportSize.width,
        viewportSize.height,
        hand?.freeTiles.length ?? 0,
      ),
    [viewportSize, hand],
  );

  const discard = useCallback(
    (traceId: number) => {
      const option = getActiveOption(currentInquiry, isRiichiSelectMode);
      if (option) void rabiriichi.submitInquiryResponse(option, traceId);
    },
    [currentInquiry, isRiichiSelectMode],
  );

  const canDrag = useCallback(
    (traceId: number) => playableIds.has(traceId),
    [playableIds],
  );

  const drag = useDragToDiscard({
    dragThreshold: layout.dragThreshold,
    canDrag,
    onDiscard: discard,
  });

  if (!hand) return null;

  const { freeTiles, pendingTile } = hand;
  const isInteractive = playableIds.size > 0;

  // Mirrors Tile3D: the hovered tile wins, falling back to the selected one,
  // and a tile with no readable face has no identity to describe.
  const describedTraceId = hoveredTraceId ?? selectedTraceId;
  /** Where to anchor the tooltip: the described tile's centre, or null. */
  const tooltipAnchor = ((): { left: number; bottom: number } | null => {
    if (describedTraceId == null || describedTraceId <= 0) return null;
    // Hovering raises the tile, so raise its anchor to match; a tile shown
    // because it is merely selected has not moved.
    const lift = describedTraceId === hoveredTraceId ? layout.hoverLift : 0;
    const centre = layout.rowHeight / 2;

    const idx = freeTiles.findIndex((t) => t.traceId === describedTraceId);
    if (idx >= 0) {
      if (!freeTiles[idx]?.tile) return null;
      return {
        left: getHandTileLeft(layout, idx) + layout.tileWidth / 2,
        bottom: centre + lift,
      };
    }
    if (pendingTile?.traceId === describedTraceId && pendingTile.tile) {
      const pendingLift =
        describedTraceId === hoveredTraceId ? layout.pendingHoverLift : 0;
      return {
        left: layout.pendingLeft + layout.tileWidth / 2,
        bottom: centre + pendingLift,
      };
    }
    return null;
  })();

  const dimmed = (traceId: number | null | undefined) =>
    isTileDimmed({ traceId, callHighlightIds, playableIds });

  const onTileClick = (traceId: number | null | undefined) => {
    if (
      drag.shouldIgnoreClick() ||
      !isInteractive ||
      traceId == null ||
      !playableIds.has(traceId)
    ) {
      return;
    }
    discard(traceId);
  };

  return (
    <div
      className="absolute bottom-4 left-0 right-0 z-50 pointer-events-auto"
      style={{ height: layout.rowHeight }}
    >
      <div className="relative h-full">
        {/*
          One tooltip for the whole hand, anchored to the hovered tile's centre
          the way drei's <Html center> anchors the 3D one, so both read
          identically. Keeping it out of the tile buttons means it is not
          clipped by their stacking contexts and does not bob with the lift.
        */}
        {tooltipAnchor && (
          <div
            className="absolute z-[60] pointer-events-none"
            style={{ left: tooltipAnchor.left, bottom: tooltipAnchor.bottom }}
          >
            <TileTooltip />
          </div>
        )}

        <div
          className="flex items-end gap-0.5 absolute bottom-0"
          style={{ left: layout.leftOffset }}
        >
          {freeTiles.map((tileMsg, idx) => {
            const { traceId } = tileMsg;
            const isPlayable = traceId != null && playableIds.has(traceId);

            return (
              <HandTile
                key={traceId ?? idx}
                tile={tileMsg.tile}
                layout={layout}
                isHighlighted={isPlayable}
                isDimmed={dimmed(traceId)}
                isClickable={isPlayable}
                isDora={isDoraTile(tileMsg.tile)}
                hoverLift={layout.hoverLift}
                onClick={() => onTileClick(traceId)}
                onHover={(entering) =>
                  onHoverTile(entering ? (traceId ?? null) : null)
                }
                drag={drag.tileProps(traceId ?? null)}
                dragStyle={drag.dragStyle(traceId ?? null)}
              />
            );
          })}
        </div>

        {/* The drawn tile keeps a reserved slot so the row never reflows. */}
        {pendingTile ? (
          (() => {
            const pendingTraceId = pendingTile.traceId;
            const isPlayable =
              pendingTraceId != null && playableIds.has(pendingTraceId);

            return (
              <HandTile
                tile={pendingTile.tile}
                layout={layout}
                isHighlighted={isPlayable}
                isDimmed={dimmed(pendingTraceId)}
                isClickable={isPlayable}
                isDora={isDoraTile(pendingTile.tile)}
                hoverLift={layout.pendingHoverLift}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: layout.pendingLeft,
                }}
                onClick={() => onTileClick(pendingTraceId)}
                onHover={(entering) =>
                  onHoverTile(entering ? (pendingTraceId ?? null) : null)
                }
                drag={drag.tileProps(pendingTraceId ?? null)}
                dragStyle={drag.dragStyle(pendingTraceId ?? null)}
              />
            );
          })()
        ) : (
          <div
            className="invisible absolute bottom-0"
            style={{
              width: layout.tileWidth,
              height: layout.rowHeight,
              left: layout.pendingLeft,
            }}
          />
        )}
      </div>
    </div>
  );
}

function getActiveOption(
  inquiry: ReturnType<typeof useCurrentInquiry>,
  isRiichi: boolean,
): ActionOption | null {
  if (!inquiry?.mapped) return null;
  if (isRiichi) {
    const btn = inquiry.mapped.buttons.find((b) => b.type === 'riichi');
    return btn?.type === 'riichi' ? btn : null;
  }
  const pt = inquiry.mapped.playTile;
  if (!pt) return null;
  return {
    type: 'play-tile',
    label: '打',
    actionIndex: pt.actionIndex,
    legalTiles: pt.legalTiles,
    ...(pt.candidates ? { candidates: pt.candidates } : {}),
  };
}
