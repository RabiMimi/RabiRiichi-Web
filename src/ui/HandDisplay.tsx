import React, {
  useMemo,
  useRef,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  useRoom,
  useSelf,
  useCurrentInquiry,
  useIsRiichiSelectMode,
  useCallHighlightTileIds,
} from '../state/store';
import { rabiriichi } from '../net/client';
import { Tile } from '../domain/tile';
import { UiTile } from './UiTile';
import { SOUND_EFFECTS } from '../lib/soundEffects';
import type { ActionOption } from '../domain/inquiry';

/**
 * Pointer travel (px) tolerated before a press is treated as a drag rather than
 * a tap. Touch input always jitters a few pixels, so without this dead zone a
 * plain tap on a tile would be swallowed and never discard.
 */
const TAP_DEAD_ZONE_PX = 10;

/**
 * DOM-rendered hand tile bar for the local player.
 */
export function HandDisplay(): React.JSX.Element | null {
  const room = useRoom();
  const currentUser = useSelf();
  const currentInquiry = useCurrentInquiry();
  const isRiichiSelectMode = useIsRiichiSelectMode();
  const callHighlightIds = useCallHighlightTileIds();

  const selfPlayer = useMemo(
    () =>
      room && currentUser
        ? room.players.find((p) => p.id === currentUser.id)
        : null,
    [room, currentUser],
  );

  // Playable tiles — hook must be before any early return
  const playableMap = useMemo(() => {
    const map = new Set<number>();
    if (!currentInquiry) return map;
    const legal = isRiichiSelectMode
      ? currentInquiry.mapped.buttons.find((b) => b.type === 'riichi')
          ?.legalTiles
      : currentInquiry.mapped.playTile?.legalTiles;
    legal?.forEach((id) => map.add(id));
    return map;
  }, [currentInquiry, isRiichiSelectMode]);

  // Drag-up-to-discard — hooks before any early return
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const [dragTraceId, setDragTraceId] = useState<number | null>(null);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const didDragRef = useRef(false);
  const didExceedRef = useRef(false);
  const didMoveRef = useRef(false);
  const dragThresholdRef = useRef(164);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, traceId: number) => {
      if (!playableMap.has(traceId)) return;
      didDragRef.current = false;
      didExceedRef.current = false;
      didMoveRef.current = false;
      dragStartX.current = e.clientX;
      dragStartY.current = e.clientY;
      setDragTraceId(traceId);
      setDragOffsetX(0);
      setDragOffsetY(0);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [playableMap],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragTraceId == null) return;
      const dx = e.clientX - dragStartX.current;
      const dy = dragStartY.current - e.clientY;
      if (Math.hypot(dx, dy) > TAP_DEAD_ZONE_PX) {
        didMoveRef.current = true;
      }
      setDragOffsetX(dx);
      setDragOffsetY(Math.max(0, dy));
      if (dy >= dragThresholdRef.current) {
        didExceedRef.current = true;
      }
    },
    [dragTraceId],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent, traceId: number) => {
      if (dragTraceId !== traceId) {
        setDragTraceId(null);
        setDragOffsetX(0);
        setDragOffsetY(0);
        return;
      }
      setDragTraceId(null);
      setDragOffsetX(0);
      setDragOffsetY(0);
      // If user ever dragged past threshold, treat as drag — suppress click
      if (didExceedRef.current) {
        didDragRef.current = true;
      }
      const dy = dragStartY.current - e.clientY;
      if (dy < dragThresholdRef.current) {
        // Moved but didn't reach threshold — also suppress click, no discard
        if (didMoveRef.current) {
          didDragRef.current = true;
        }
        return;
      }
      didDragRef.current = true;
      const opt = getActiveOption(currentInquiry, isRiichiSelectMode);
      if (opt) void rabiriichi.submitInquiryResponse(opt, traceId);
    },
    [currentInquiry, isRiichiSelectMode, dragTraceId],
  );

  useEffect(() => {
    return () => {
      setDragTraceId(null);
      setDragOffsetX(0);
      setDragOffsetY(0);
    };
  }, []);

  // Responsive tile width based on viewport
  const [vw, setVw] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const hand = selfPlayer?.gameState?.hand;

  // Pre-compute tile geometry from raw data (before early return)
  const tileGeo = useMemo(() => {
    if (!hand) return null;
    const { freeTiles, pendingTile } = hand;
    const maxW = Math.min(vw * 0.75, 1100);
    const tw = Math.min(84, Math.floor(maxW / Math.max(freeTiles.length, 1)));
    const s = tw / 84;
    const gap = 2; // gap-0.5 = 2px
    const pendingGap = 12; // ml-3 ≈ 12px
    const handWidth =
      freeTiles.length * tw + (freeTiles.length - 1) * gap + pendingGap + tw;
    const leftOffset = Math.round((vw - handWidth) / 2);
    return {
      freeTiles,
      pendingTile,
      tileWidth: tw,
      scale: s,
      TILE_HEIGHT: Math.round(109 * s),
      BEVEL_HEIGHT: Math.round(21 * s),
      ROW_HEIGHT: Math.round(109 * s) + Math.round(21 * s),
      threshold: Math.round(109 * s * 1.5),
      leftOffset,
    };
  }, [hand, vw]);

  useEffect(() => {
    if (tileGeo) dragThresholdRef.current = tileGeo.threshold;
  }, [tileGeo]);

  if (!tileGeo) return null;

  const {
    freeTiles,
    pendingTile,
    tileWidth,
    TILE_HEIGHT,
    BEVEL_HEIGHT,
    ROW_HEIGHT,
    leftOffset,
  } = tileGeo;

  const isInteractive = playableMap.size > 0;

  const handleTileClick = (traceId: number) => {
    if (!isInteractive) return;
    const opt = getActiveOption(currentInquiry, isRiichiSelectMode);
    if (opt) void rabiriichi.submitInquiryResponse(opt, traceId);
  };

  const handleTileHover = (traceId: number | null) => {
    rabiriichi.hoverTile(traceId);
    if (traceId != null) {
      if (!hoverAudioRef.current) {
        hoverAudioRef.current = new Audio(SOUND_EFFECTS.tile.hover);
        hoverAudioRef.current.volume = 0.5;
      }
      hoverAudioRef.current.currentTime = 0;
      hoverAudioRef.current.play().catch(() => undefined);
    }
  };

  return (
    <div
      className="absolute bottom-1 left-0 right-0 z-50 pointer-events-auto"
      style={{ height: ROW_HEIGHT }}
    >
      <div className="relative h-full">
        {/* Free tiles — at 20% from left */}
        <div
          className="flex items-end gap-0.5 absolute"
          style={{ left: leftOffset }}
        >
          {freeTiles.map((tileMsg, idx) => {
            const tileStr = tileMsg.tile
              ? Tile.fromByte(tileMsg.tile).toString()
              : 'back';
            const isPlayable =
              tileMsg.traceId != null && playableMap.has(tileMsg.traceId);
            const isDimmed =
              (callHighlightIds != null &&
                tileMsg.traceId != null &&
                !callHighlightIds.has(tileMsg.traceId)) ||
              (isRiichiSelectMode &&
                tileMsg.traceId != null &&
                !playableMap.has(tileMsg.traceId));

            return (
              <button
                key={tileMsg.traceId ?? idx}
                type="button"
                className={`relative bg-transparent border-none p-0 hover:-translate-y-5
                  ${isPlayable ? 'cursor-pointer' : 'cursor-default'}
                `}
                style={{
                  width: tileWidth,
                  filter: 'drop-shadow(0 0 2px #000)',
                  transform:
                    dragTraceId === tileMsg.traceId
                      ? `translate(${dragOffsetX}px, -${dragOffsetY}px)`
                      : undefined,
                  transition:
                    dragTraceId === tileMsg.traceId ? 'none' : undefined,
                }}
                onClick={() => {
                  if (didDragRef.current) return;
                  if (tileMsg.traceId != null) handleTileClick(tileMsg.traceId);
                }}
                onPointerDown={(e) => {
                  if (tileMsg.traceId != null)
                    handlePointerDown(e, tileMsg.traceId);
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => {
                  if (tileMsg.traceId != null)
                    handlePointerUp(e, tileMsg.traceId);
                }}
                onDragStart={(e) => e.preventDefault()}
                onMouseEnter={() =>
                  tileMsg.traceId != null && handleTileHover(tileMsg.traceId)
                }
                onMouseLeave={() => handleTileHover(null)}
              >
                <div
                  className={`overflow-hidden rounded-lg ${isDimmed ? 'brightness-50' : ''}`}
                >
                  <img
                    src="/assets/hand_tiles/bevel.jpg"
                    alt=""
                    draggable={false}
                    style={{ width: tileWidth, height: BEVEL_HEIGHT }}
                    className="object-cover brightness-90 block"
                  />
                  <UiTile
                    tile={tileStr}
                    size="custom"
                    isHighlighted={isPlayable}
                    className="bg-[#f7f4eb] block"
                    style={{ width: tileWidth, height: TILE_HEIGHT }}
                  />
                </div>
                <div
                  className="absolute left-0 right-0 h-1.25"
                  style={{ bottom: -4 }}
                />
              </button>
            );
          })}
        </div>

        {/* Pending tile — absolute, placed to the right of free tiles */}
        {pendingTile ? (
          <button
            type="button"
            className={`bg-transparent border-none p-0 absolute bottom-0 hover:-translate-y-3
              ${isInteractive ? 'cursor-pointer' : 'cursor-default'}
            `}
            style={{
              width: tileWidth,
              left: `${leftOffset + freeTiles.length * tileWidth + (freeTiles.length - 1) * 2 + 12}px`,
              filter: 'drop-shadow(0 0 2px #000)',
              transform:
                dragTraceId === pendingTile.traceId
                  ? `translate(${dragOffsetX}px, -${dragOffsetY}px)`
                  : undefined,
              transition:
                dragTraceId === pendingTile.traceId ? 'none' : undefined,
            }}
            onClick={() => {
              if (didDragRef.current) return;
              if (pendingTile.traceId != null)
                handleTileClick(pendingTile.traceId);
            }}
            onPointerDown={(e) => {
              if (pendingTile.traceId != null)
                handlePointerDown(e, pendingTile.traceId);
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => {
              if (pendingTile.traceId != null)
                handlePointerUp(e, pendingTile.traceId);
            }}
            onDragStart={(e) => e.preventDefault()}
            onMouseEnter={() =>
              pendingTile.traceId != null &&
              handleTileHover(pendingTile.traceId)
            }
            onMouseLeave={() => handleTileHover(null)}
          >
            <div className="overflow-hidden rounded-lg">
              <img
                src="/assets/hand_tiles/bevel.jpg"
                alt=""
                draggable={false}
                style={{ width: tileWidth, height: BEVEL_HEIGHT }}
                className="object-cover brightness-90 block"
              />
              <UiTile
                tile={
                  pendingTile.tile
                    ? Tile.fromByte(pendingTile.tile).toString()
                    : 'back'
                }
                size="custom"
                isHighlighted
                className="bg-[#f7f4eb] block"
                style={{ width: tileWidth, height: TILE_HEIGHT }}
              />
            </div>
            <div
              className="absolute left-0 right-0 h-1.25"
              style={{ bottom: -4 }}
            />
          </button>
        ) : (
          <div
            className="invisible absolute bottom-0"
            style={{
              width: tileWidth,
              height: ROW_HEIGHT,
              left: `${leftOffset + freeTiles.length * tileWidth + (freeTiles.length - 1) * 2 + 12}px`,
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
