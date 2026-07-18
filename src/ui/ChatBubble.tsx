import React, { useEffect, useState, useRef, useCallback } from 'react';

interface ChatBubbleProps {
  text: string | null | undefined;
  className?: string; // e.g. "chat-bubble-2d" or "chat-bubble-3d"
  placement?: 'top' | 'bottom';
  hasSticker?: boolean;
}

/** Keep this much space between the bubble and the viewport edge. */
const VIEWPORT_MARGIN = 8;

/**
 * Horizontal offset (px) needed so a bubble centered on its anchor does not
 * overflow the viewport. Positive nudges right (off the left edge), negative
 * nudges left (off the right edge). The tail stays on the anchor; only the box
 * body shifts, so the bubble reads as belonging to that player.
 */
function clampShift(rect: DOMRect): number {
  if (rect.left < VIEWPORT_MARGIN) {
    return VIEWPORT_MARGIN - rect.left;
  }
  const overflowRight = rect.right - (window.innerWidth - VIEWPORT_MARGIN);
  if (overflowRight > 0) {
    return -overflowRight;
  }
  return 0;
}

export function ChatBubble({
  text,
  className = 'chat-bubble-2d',
  placement = 'top',
  hasSticker = false,
}: ChatBubbleProps): React.JSX.Element | null {
  const [displayText, setDisplayText] = useState<string | null>(null);
  const [animState, setAnimState] = useState<'open' | 'close' | 'idle'>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [prevText, setPrevText] = useState<string | null | undefined>(
    undefined,
  );
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [shiftX, setShiftX] = useState(0);

  if (prevText !== text) {
    setPrevText(text);
    if (text) {
      if (displayText && displayText !== text) {
        setAnimState('close');
      } else {
        setDisplayText(text);
        setAnimState('open');
      }
    } else if (displayText) {
      setAnimState('close');
    }
  }

  useEffect(() => {
    if (animState !== 'close') return;
    timeoutRef.current = setTimeout(() => {
      if (text) {
        setDisplayText(text);
        setAnimState('open');
      } else {
        setDisplayText(null);
        setAnimState('idle');
      }
    }, 250);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [animState, text]);

  const is3D = className.includes('chat-bubble-3d');
  const isLocal = className.includes('local');
  // Only the non-local 3D bubble is centered on a fixed avatar position and can
  // run off a screen edge (e.g. the left player). Clamp just that one.
  const clampToViewport = is3D && !isLocal;

  // Measure the bubble's natural (unshifted) position and nudge it back inside
  // the viewport if it would overflow an edge (e.g. the left player's bubble
  // running off the left of the screen). Only the non-local 3D bubble, which is
  // centered on a fixed avatar position, needs this.
  const measure = useCallback(() => {
    const el = bubbleRef.current;
    if (!el || !clampToViewport) {
      setShiftX(0);
      return;
    }
    // Neutralize any prior shift before measuring the natural position.
    const prev = el.style.marginLeft;
    el.style.marginLeft = '0px';
    const shift = clampShift(el.getBoundingClientRect());
    el.style.marginLeft = prev;
    setShiftX(shift);
  }, [clampToViewport]);

  // Callback ref: measure on mount and whenever the bubble resizes (text wraps,
  // font loads). This runs at commit time, so setState here does not trigger the
  // effect-cascade the lint rule guards against.
  const observerRef = useRef<ResizeObserver | null>(null);
  const setBubbleRef = useCallback(
    (el: HTMLDivElement | null) => {
      bubbleRef.current = el;
      observerRef.current?.disconnect();
      if (!el) return;
      observerRef.current = new ResizeObserver(measure);
      observerRef.current.observe(el);
      measure();
    },
    [measure],
  );

  // Keep the bubble clamped when the viewport itself changes size.
  useEffect(() => {
    if (!clampToViewport) return;
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, clampToViewport]);

  if (!displayText) return null;

  const positionClass = is3D
    ? isLocal
      ? 'relative top-0 left-0 translate-x-0 z-[1000]'
      : placement === 'bottom'
        ? hasSticker
          ? 'absolute top-full mt-[95px] left-1/2 -translate-x-1/2 z-[1000]'
          : 'absolute top-full mt-3 left-1/2 -translate-x-1/2 z-[1000]'
        : // Anchor by the BOTTOM edge (a fixed gap above the avatar) so the tail
          // stays pinned to the player regardless of how tall the bubble grows.
          'absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-[1000]'
    : placement === 'bottom'
      ? 'absolute top-full left-0 mt-2 z-[105]'
      : 'absolute bottom-full left-0 mb-2 z-[105]';

  const baseBubbleClass =
    // max-h + overflow keeps a long message from growing off the top of the
    // screen for the far (top) seat; it wraps and scrolls instead of clipping.
    'bg-[#121c32]/95 border-[1.5px] border-[#80deea]/80 rounded-xl px-3 py-1.5 shadow-[0_4px_15px_rgba(0,0,0,0.6)] flex items-center justify-center max-w-[220px] sm:max-w-[280px] max-h-[30vh] overflow-y-auto no-scrollbar w-max text-xs text-white break-words text-center font-sans pointer-events-none';

  const tailClass = is3D
    ? placement === 'bottom'
      ? "before:content-[''] before:absolute before:-top-[10px] before:left-1/2 before:-translate-x-1/2 before:border-b-[10px] before:border-x-[10px] before:border-t-0 before:border-solid before:border-b-[#80deea]/80 before:border-x-transparent before:block before:w-0 before:z-[-1] after:content-[''] after:absolute after:-top-[8px] after:left-1/2 after:-translate-x-1/2 after:border-b-[8px] after:border-x-[8px] after:border-t-0 after:border-solid after:border-b-[#121c32]/95 after:border-x-transparent after:block after:w-0"
      : "before:content-[''] before:absolute before:-bottom-[10px] before:left-1/2 before:-translate-x-1/2 before:border-t-[10px] before:border-x-[10px] before:border-b-0 before:border-solid before:border-t-[#80deea]/80 before:border-x-transparent before:block before:w-0 before:z-[-1] after:content-[''] after:absolute after:-bottom-[8px] after:left-1/2 after:-translate-x-1/2 after:border-t-[8px] after:border-x-[8px] after:border-b-0 after:border-solid after:border-t-[#121c32]/95 after:border-x-transparent after:block after:w-0"
    : placement === 'bottom'
      ? "before:content-[''] before:absolute before:-top-[10px] before:left-6 before:-translate-x-1/2 before:border-b-[10px] before:border-x-[10px] before:border-t-0 before:border-solid before:border-b-[#80deea]/80 before:border-x-transparent before:block before:w-0 before:z-[-1] after:content-[''] after:absolute after:-top-[8px] after:left-6 after:-translate-x-1/2 after:border-b-[8px] after:border-x-[8px] after:border-t-0 after:border-solid after:border-b-[#121c32]/95 after:border-x-transparent after:block after:w-0"
      : "before:content-[''] before:absolute before:-bottom-[10px] before:left-6 before:-translate-x-1/2 before:border-t-[10px] before:border-x-[10px] before:border-b-0 before:border-solid before:border-t-[#80deea]/80 before:border-x-transparent before:block before:w-0 before:z-[-1] after:content-[''] after:absolute after:-bottom-[8px] after:left-6 after:-translate-x-1/2 after:border-t-[8px] after:border-x-[8px] after:border-b-0 after:border-solid after:border-t-[#121c32]/95 after:border-x-transparent after:block after:w-0";

  const shouldUseTranslate = is3D && !isLocal;
  const openAnimName =
    placement === 'bottom' ? 'pop-bounce-bottom' : 'pop-bounce';
  const closeAnimName =
    placement === 'bottom' ? 'pop-close-bottom' : 'pop-close';
  const animClass =
    animState === 'open'
      ? shouldUseTranslate
        ? `animate-[${openAnimName}_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]`
        : 'animate-[pop-bounce-local_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]'
      : animState === 'close'
        ? shouldUseTranslate
          ? `animate-[${closeAnimName}_0.25s_cubic-bezier(0.6,-0.28,0.735,0.045)_forwards]`
          : 'animate-[pop-close-local_0.25s_cubic-bezier(0.6,-0.28,0.735,0.045)_forwards]'
        : '';

  return (
    <div
      ref={setBubbleRef}
      className={`${positionClass} ${baseBubbleClass} ${tailClass} ${animClass}`}
      style={shiftX !== 0 ? { marginLeft: `${shiftX}px` } : undefined}
    >
      {displayText}
    </div>
  );
}
