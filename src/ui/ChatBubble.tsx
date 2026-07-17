import React, { useEffect, useState, useRef } from 'react';

interface ChatBubbleProps {
  text: string | null | undefined;
  className?: string; // e.g. "chat-bubble-2d" or "chat-bubble-3d"
}

export function ChatBubble({
  text,
  className = 'chat-bubble-2d',
}: ChatBubbleProps): React.JSX.Element | null {
  const [displayText, setDisplayText] = useState<string | null>(null);
  const [animState, setAnimState] = useState<'open' | 'close' | 'idle'>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [prevText, setPrevText] = useState<string | null | undefined>(
    undefined,
  );

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

  if (!displayText) return null;

  const is3D = className.includes('chat-bubble-3d');
  const isLocal = className.includes('local');

  const positionClass = is3D
    ? isLocal
      ? 'relative top-0 left-0 translate-x-0 z-[1000]'
      : // Anchor by the BOTTOM edge (a fixed gap above the avatar) so the tail
        // stays pinned to the player regardless of how tall the bubble grows.
        'absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-[1000]'
    : 'absolute bottom-full left-0 mb-2 z-[105]';

  const baseBubbleClass =
    // max-h + overflow keeps a long message from growing off the top of the
    // screen for the far (top) seat; it wraps and scrolls instead of clipping.
    'bg-[#121c32]/95 border-[1.5px] border-[#80deea]/80 rounded-xl px-3 py-1.5 shadow-[0_4px_15px_rgba(0,0,0,0.6)] flex items-center justify-center max-w-[220px] sm:max-w-[280px] max-h-[30vh] overflow-y-auto no-scrollbar w-max text-xs text-white break-words text-center font-sans pointer-events-none';

  const tailClass = is3D
    ? "before:content-[''] before:absolute before:-bottom-[10px] before:left-1/2 before:-translate-x-1/2 before:border-t-[10px] before:border-x-[10px] before:border-b-0 before:border-solid before:border-t-[#80deea]/80 before:border-x-transparent before:block before:w-0 before:z-[-1] after:content-[''] after:absolute after:-bottom-[8px] after:left-1/2 after:-translate-x-1/2 after:border-t-[8px] after:border-x-[8px] after:border-b-0 after:border-solid after:border-t-[#121c32]/95 after:border-x-transparent after:block after:w-0"
    : "before:content-[''] before:absolute before:-bottom-[10px] before:left-6 before:-translate-x-1/2 before:border-t-[10px] before:border-x-[10px] before:border-b-0 before:border-solid before:border-t-[#80deea]/80 before:border-x-transparent before:block before:w-0 before:z-[-1] after:content-[''] after:absolute after:-bottom-[8px] after:left-6 after:-translate-x-1/2 after:border-t-[8px] after:border-x-[8px] after:border-b-0 after:border-solid after:border-t-[#121c32]/95 after:border-x-transparent after:block after:w-0";

  const shouldUseTranslate = is3D && !isLocal;
  const animClass =
    animState === 'open'
      ? shouldUseTranslate
        ? 'animate-[pop-bounce_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]'
        : 'animate-[pop-bounce-local_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]'
      : animState === 'close'
        ? shouldUseTranslate
          ? 'animate-[pop-close_0.25s_cubic-bezier(0.6,-0.28,0.735,0.045)_forwards]'
          : 'animate-[pop-close-local_0.25s_cubic-bezier(0.6,-0.28,0.735,0.045)_forwards]'
        : '';

  return (
    <div
      className={`${positionClass} ${baseBubbleClass} ${tailClass} ${animClass}`}
    >
      {displayText}
    </div>
  );
}
