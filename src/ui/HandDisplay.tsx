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
} from '../state/store';
import { rabiriichi } from '../net/client';
import { Tile, checkIsDora } from '../domain/tile';
import { UiTile } from './UiTile';
import { SOUND_EFFECTS } from '../lib/soundEffects';
import { computeHandLayout, type HandLayout } from './handLayout';
import { useDragToDiscard, type DragToDiscard } from './useDragToDiscard';
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
  /** Lift distance on hover; the drawn tile sits slightly lower. */
  hoverLift: string;
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
  const { tileWidth, tileHeight, bevelHeight } = layout;
  const face = tile ? Tile.fromByte(tile).toString() : 'back';

  return (
    <button
      type="button"
      className={`relative bg-transparent border-none p-0 ${hoverLift} ${
        isClickable ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={{
        width: tileWidth,
        filter: 'drop-shadow(0 0 2px #000)',
        ...style,
        ...dragStyle,
      }}
      onClick={onClick}
      onDragStart={(e) => e.preventDefault()}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      {...drag}
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

  const onTileClick = (traceId: number | null | undefined) => {
    if (drag.shouldIgnoreClick() || !isInteractive || traceId == null) return;
    discard(traceId);
  };

  return (
    <div
      className="absolute bottom-1 left-0 right-0 z-50 pointer-events-auto"
      style={{ height: layout.rowHeight }}
    >
      <div className="relative h-full">
        <div
          className="flex items-end gap-0.5 absolute"
          style={{ left: layout.leftOffset }}
        >
          {freeTiles.map((tileMsg, idx) => {
            const { traceId } = tileMsg;
            const isPlayable = traceId != null && playableIds.has(traceId);
            const isDimmed =
              traceId != null &&
              ((callHighlightIds != null && !callHighlightIds.has(traceId)) ||
                (isRiichiSelectMode && !playableIds.has(traceId)));

            return (
              <HandTile
                key={traceId ?? idx}
                tile={tileMsg.tile}
                layout={layout}
                isHighlighted={isPlayable}
                isDimmed={isDimmed}
                isClickable={isPlayable}
                isDora={isDoraTile(tileMsg.tile)}
                hoverLift="hover:-translate-y-5"
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
          <HandTile
            tile={pendingTile.tile}
            layout={layout}
            isHighlighted
            isDimmed={false}
            isClickable={isInteractive}
            isDora={isDoraTile(pendingTile.tile)}
            hoverLift="hover:-translate-y-3"
            style={{
              position: 'absolute',
              bottom: 0,
              left: layout.pendingLeft,
            }}
            onClick={() => onTileClick(pendingTile.traceId)}
            onHover={(entering) =>
              onHoverTile(entering ? (pendingTile.traceId ?? null) : null)
            }
            drag={drag.tileProps(pendingTile.traceId ?? null)}
            dragStyle={drag.dragStyle(pendingTile.traceId ?? null)}
          />
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
