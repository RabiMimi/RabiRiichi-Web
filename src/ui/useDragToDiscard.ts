import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { hasLeftDeadZone, resolveDragGesture } from './discardGesture';

interface UseDragToDiscardOptions {
  /** Upward travel (px) that commits a discard; scales with the tile size. */
  dragThreshold: number;
  /** Whether a given tile may be dragged at all (i.e. is a legal discard). */
  canDrag: (traceId: number) => boolean;
  /** Called once a drag has passed the threshold. */
  onDiscard: (traceId: number) => void;
}

export interface DragToDiscard {
  /** Pointer handlers to spread onto a tile button. */
  tileProps: (traceId: number | null) => {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
  };
  /** Inline transform for the tile currently being dragged. */
  dragStyle: (traceId: number | null) => React.CSSProperties;
  /**
   * True when the click that is about to fire is the tail of a drag and should
   * be ignored rather than treated as click-to-discard.
   */
  shouldIgnoreClick: () => boolean;
}

/**
 * Drag-a-tile-upwards-to-discard gesture for the local hand.
 *
 * The browser still fires a click after every pointer sequence, so the hook
 * also tracks whether that click belongs to a drag (ignore it) or to a genuine
 * tap (let it discard).
 */
export function useDragToDiscard({
  dragThreshold,
  canDrag,
  onDiscard,
}: UseDragToDiscardOptions): DragToDiscard {
  const [dragTraceId, setDragTraceId] = useState<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const startX = useRef(0);
  const startY = useRef(0);
  const movedBeyondDeadZone = useRef(false);
  const suppressClick = useRef(false);

  const reset = useCallback(() => {
    setDragTraceId(null);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, traceId: number) => {
      suppressClick.current = false;
      movedBeyondDeadZone.current = false;
      startX.current = e.clientX;
      startY.current = e.clientY;
      setDragTraceId(traceId);
      setOffset({ x: 0, y: 0 });
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragTraceId == null) return;
      const dx = e.clientX - startX.current;
      const dy = startY.current - e.clientY;
      if (hasLeftDeadZone(dx, dy)) movedBeyondDeadZone.current = true;
      setOffset({ x: dx, y: Math.max(0, dy) });
    },
    [dragTraceId],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent, traceId: number) => {
      if (dragTraceId !== traceId) {
        reset();
        return;
      }
      reset();

      const { shouldDiscard, shouldSuppressClick } = resolveDragGesture({
        upwardTravel: startY.current - e.clientY,
        dragThreshold,
        movedBeyondDeadZone: movedBeyondDeadZone.current,
      });
      suppressClick.current = shouldSuppressClick;
      if (shouldDiscard && canDrag(traceId)) onDiscard(traceId);
    },
    [canDrag, dragTraceId, dragThreshold, onDiscard, reset],
  );

  const tileProps = useCallback(
    (traceId: number | null) => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (traceId != null) handlePointerDown(e, traceId);
      },
      onPointerMove: handlePointerMove,
      onPointerUp: (e: React.PointerEvent) => {
        if (traceId != null) handlePointerUp(e, traceId);
      },
    }),
    [handlePointerDown, handlePointerMove, handlePointerUp],
  );

  const dragStyle = useCallback(
    (traceId: number | null): React.CSSProperties =>
      traceId != null && dragTraceId === traceId
        ? {
            transform: `translate(${offset.x}px, -${offset.y}px)`,
            transition: 'none',
          }
        : {},
    [dragTraceId, offset],
  );

  const shouldIgnoreClick = useCallback(() => suppressClick.current, []);

  return { tileProps, dragStyle, shouldIgnoreClick };
}
