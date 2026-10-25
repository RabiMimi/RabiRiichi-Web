import type React from 'react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { TilePointerGesture, slotAdjustedOffset } from './discardGesture';

interface UseDragToDiscardOptions {
  /** Upward travel (px) that commits a discard; scales with the tile size. */
  dragThreshold: number;
  /** Whether the current inquiry accepts this tile, checked on release. */
  canDiscard: (traceId: number) => boolean;
  isDraggable?: (traceId: number) => boolean;
  onDiscard: (traceId: number) => void;
  onTap: (traceId: number, pointerType: string) => void;
  /**
   * Left edge (px) of the slot the tile rests in now, or null once it has left
   * the hand. A drag outlives changes around its tile -- players like to hold a
   * tile while waiting and drop it the moment their draw arrives -- and ends
   * only when that tile itself goes. Omit for a tile that never changes slot.
   */
  getRestingLeft?: (traceId: number) => number | null;
  /** For a component holding a single tile: cancel when its identity changes. */
  contextKey?: string;
}

type PointerStart = Pick<
  PointerEvent,
  | 'pointerId'
  | 'pointerType'
  | 'clientX'
  | 'clientY'
  | 'timeStamp'
  | 'button'
  | 'isPrimary'
>;

interface DragPosition {
  traceId: number | null;
  /** Pointer travel since the press. */
  x: number;
  y: number;
  /** Where the tile's slot started when it was picked up. */
  pickedUpLeft: number;
}

export interface DragToDiscard {
  tileProps: (traceId: number | null) => {
    onPointerDown: (e: React.PointerEvent) => void;
    onLostPointerCapture: (e: React.PointerEvent) => void;
  };
  startGesture: (e: PointerStart, traceId: number) => void;
  dragStyle: (traceId: number | null) => React.CSSProperties;
  /** Where to draw a dragged tile relative to its slot, or null if not dragged. */
  offset: (traceId: number | null) => { x: number; y: number } | null;
  position: DragPosition;
}

const STATIONARY_SLOT = (): number => 0;

const RESTING_POSITION: DragPosition = {
  traceId: null,
  x: 0,
  y: 0,
  pickedUpLeft: 0,
};

/** Tracks the picked-up tile independently of the tile under the pointer. */
export function useDragToDiscard(
  options: UseDragToDiscardOptions,
): DragToDiscard {
  const [position, setPosition] = useState(RESTING_POSITION);
  const optionsRef = useRef(options);
  const gestureRef = useRef<TilePointerGesture | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  const cancel = useCallback(() => {
    gestureRef.current?.cancel();
    gestureRef.current = null;
    cleanupRef.current?.();
    cleanupRef.current = null;
    setPosition(RESTING_POSITION);
  }, []);

  const getRestingLeft = options.getRestingLeft ?? STATIONARY_SLOT;

  // Drop the drag once its tile is discarded or melded away (and on unmount).
  const draggedTileGone =
    position.traceId != null && getRestingLeft(position.traceId) == null;
  useLayoutEffect(() => cancel, [cancel, draggedTileGone, options.contextKey]);

  const startGesture = useCallback(
    (e: PointerStart, traceId: number) => {
      if (!e.isPrimary || e.button !== 0 || gestureRef.current) return;
      const gesture = new TilePointerGesture(e);
      gestureRef.current = gesture;
      const pickedUpLeft =
        (optionsRef.current.getRestingLeft ?? STATIONARY_SLOT)(traceId) ?? 0;
      const move = (pointer: PointerEvent) => {
        if (!gesture.move(pointer) || !gesture.isDragging) return;
        if (optionsRef.current.isDraggable?.(traceId) !== false) {
          setPosition({ traceId, ...gesture.screenOffset, pickedUpLeft });
        }
      };

      const finish = (pointer: PointerEvent) => {
        if (pointer.pointerId !== gesture.pointerId) return;
        const outcome = gesture.release(
          pointer,
          optionsRef.current.dragThreshold,
          optionsRef.current.canDiscard(traceId),
        );
        cancel();
        if (outcome === 'discard') {
          optionsRef.current.onDiscard(traceId);
        } else if (outcome === 'tap') {
          optionsRef.current.onTap(traceId, gesture.pointerType);
        }
      };

      const cancelPointer = (pointer: PointerEvent) => {
        if (pointer.pointerId === gesture.pointerId) cancel();
      };

      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', finish, true);
      window.addEventListener('pointercancel', cancelPointer, true);
      window.addEventListener('blur', cancel);
      cleanupRef.current = () => {
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', finish, true);
        window.removeEventListener('pointercancel', cancelPointer, true);
        window.removeEventListener('blur', cancel);
      };
    },
    [cancel],
  );

  const tileProps = useCallback(
    (traceId: number | null) => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (traceId == null) return;
        startGesture(e, traceId);
        if (gestureRef.current?.pointerId === e.pointerId) {
          e.currentTarget.setPointerCapture(e.pointerId);
        }
      },
      onLostPointerCapture: (e: React.PointerEvent) => {
        if (gestureRef.current?.pointerId !== e.pointerId) return;
        // Re-sorting the hand moves this keyed button in the DOM, which drops
        // the capture mid-drag. The window listeners still follow the pointer,
        // so the drag stands; take the capture back while the button remains.
        const button = e.currentTarget;
        if (!button.isConnected) return;
        try {
          button.setPointerCapture(e.pointerId);
        } catch {
          // The pointer ended in the meantime; its pointerup settles the drag.
        }
      },
    }),
    [startGesture],
  );

  const offset = (traceId: number | null): { x: number; y: number } | null => {
    if (traceId == null || position.traceId !== traceId) return null;
    const currentLeft = getRestingLeft(traceId);
    if (currentLeft == null) return null;
    return slotAdjustedOffset(position, position.pickedUpLeft, currentLeft);
  };

  const dragStyle = (traceId: number | null): React.CSSProperties => {
    const tileOffset = offset(traceId);
    return tileOffset
      ? {
          transform: `translate(${tileOffset.x}px, ${tileOffset.y}px)`,
          transition: 'none',
        }
      : {};
  };

  return { tileProps, startGesture, dragStyle, offset, position };
}
