import type React from 'react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { TilePointerGesture } from './discardGesture';

interface UseDragToDiscardOptions {
  /** Upward travel (px) that commits a discard; scales with the tile size. */
  dragThreshold: number;
  /** Whether the current inquiry accepts this tile, checked on release. */
  canDiscard: (traceId: number) => boolean;
  isDraggable?: (traceId: number) => boolean;
  onDiscard: (traceId: number) => void;
  onTap: (traceId: number, pointerType: string) => void;
  /** Cancel if the dragged tile leaves the hand or changes its layout. */
  contextKey: string;
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
  x: number;
  y: number;
}

export interface DragToDiscard {
  tileProps: (traceId: number | null) => {
    onPointerDown: (e: React.PointerEvent) => void;
    onLostPointerCapture: (e: React.PointerEvent) => void;
  };
  startGesture: (e: PointerStart, traceId: number) => void;
  dragStyle: (traceId: number | null) => React.CSSProperties;
  position: DragPosition;
}

const RESTING_POSITION: DragPosition = { traceId: null, x: 0, y: 0 };

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

  useLayoutEffect(() => cancel, [cancel, options.contextKey]);

  const startGesture = useCallback(
    (e: PointerStart, traceId: number) => {
      if (!e.isPrimary || e.button !== 0 || gestureRef.current) return;
      const gesture = new TilePointerGesture(e);
      gestureRef.current = gesture;
      const move = (pointer: PointerEvent) => {
        if (!gesture.move(pointer) || !gesture.isDragging) return;
        if (optionsRef.current.isDraggable?.(traceId) !== false) {
          setPosition({
            traceId,
            ...gesture.screenOffset,
          });
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
        if (gestureRef.current?.pointerId === e.pointerId) cancel();
      },
    }),
    [cancel, startGesture],
  );

  const dragStyle = (traceId: number | null): React.CSSProperties =>
    traceId != null && position.traceId === traceId
      ? {
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: 'none',
        }
      : {};

  return { tileProps, startGesture, dragStyle, position };
}
