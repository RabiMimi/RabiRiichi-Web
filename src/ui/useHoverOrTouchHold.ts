import { useState, useCallback, useRef, useEffect } from 'react';

export interface HoverOrTouchHoldBind {
  onPointerEnter: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  onFocus: (e: React.FocusEvent) => void;
  onBlur: (e: React.FocusEvent) => void;
}

/**
 * A unified hook to handle hover-on-desktop and touch-hold-on-mobile.
 * - Desktop: triggers immediately on pointerenter, clears on pointerleave.
 * - Touchscreen: triggers only after holding down for delayMs (defaults to 300ms),
 *   clears immediately on pointerup/pointercancel. Quick taps are ignored.
 * - Keyboard focus: triggers on focus, clears on blur.
 */
export function useHoverOrTouchHold(delayMs = 300): [boolean, HoverOrTouchHoldBind] {
  const [active, setActive] = useState(false);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTouchTimeRef = useRef(0);

  const recordTouch = useCallback(() => {
    lastTouchTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
      }
    };
  }, []);

  const onPointerEnter = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') {
      if (Date.now() - lastTouchTimeRef.current < 800) {
        return;
      }
      setActive(true);
    }
  }, []);

  const onPointerLeave = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') {
      if (Date.now() - lastTouchTimeRef.current < 800) {
        return;
      }
      setActive(false);
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') {
        recordTouch();
        if (touchTimerRef.current) {
          clearTimeout(touchTimerRef.current);
        }
        touchTimerRef.current = setTimeout(() => {
          setActive(true);
          touchTimerRef.current = null;
        }, delayMs);
      }
    },
    [delayMs, recordTouch],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      recordTouch();
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      } else {
        setActive(false);
      }
    }
  }, [recordTouch]);

  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      recordTouch();
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      } else {
        setActive(false);
      }
    }
  }, [recordTouch]);

  const onFocus = useCallback(() => {
    if (Date.now() - lastTouchTimeRef.current < 800) {
      return;
    }
    setActive(true);
  }, []);

  const onBlur = useCallback(() => {
    setActive(false);
  }, []);

  return [
    active,
    {
      onPointerEnter,
      onPointerLeave,
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      onFocus,
      onBlur,
    },
  ];
}
