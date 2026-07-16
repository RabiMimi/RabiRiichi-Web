import React, { useEffect, useState, useRef } from 'react';

interface StickerBubbleProps {
  sticker: string | null | undefined;
  className?: string; // e.g. "sticker-bubble-2d" or "sticker-bubble-3d"
}

export function StickerBubble({
  sticker,
  className = 'sticker-bubble-2d',
}: StickerBubbleProps): React.JSX.Element | null {
  const [displaySticker, setDisplaySticker] = useState<string | null>(null);
  const [animState, setAnimState] = useState<'open' | 'close' | 'idle'>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [prevSticker, setPrevSticker] = useState<string | null | undefined>(
    undefined,
  );

  // Detect `sticker` prop changes during render (the React-blessed "adjusting
  // state when a prop changes" pattern - see https://react.dev/learn/you-might-not-need-an-effect)
  // instead of in an effect. This lands the state update in the same
  // render/commit as the prop change rather than triggering an extra
  // cascading render, and satisfies react-hooks/set-state-in-effect.
  if (prevSticker !== sticker) {
    setPrevSticker(sticker);
    if (sticker) {
      if (displaySticker && displaySticker !== sticker) {
        // Switch sticker: play close animation first
        setAnimState('close');
      } else {
        // Brand new sticker
        setDisplaySticker(sticker);
        setAnimState('open');
      }
    } else if (displaySticker) {
      // Sticker expired/cleared: play close animation
      setAnimState('close');
    }
  }

  // The setTimeout below is a real external side effect (a timer), so it
  // still belongs in an effect - but the setState calls it triggers happen
  // inside the timer callback, not synchronously in the effect body.
  useEffect(() => {
    if (animState !== 'close') return;
    timeoutRef.current = setTimeout(() => {
      if (sticker) {
        setDisplaySticker(sticker);
        setAnimState('open');
      } else {
        setDisplaySticker(null);
        setAnimState('idle');
      }
    }, 250); // Match CSS close animation duration (250ms)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [animState, sticker]);

  if (!displaySticker) return null;

  const is3D = className.includes('sticker-bubble-3d');
  const isLocal = className.includes('local');

  const positionClass = is3D
    ? isLocal
      ? 'relative top-0 left-0 translate-x-0 z-[1000]'
      : 'absolute -top-[85px] left-1/2 -translate-x-1/2 z-[1000]'
    : 'absolute -top-[45px] left-1/2 -translate-x-1/2 z-[105]';

  const baseBubbleClass =
    'bg-[#121c32]/95 border-[1.5px] border-[#ff7a99]/80 rounded-xl p-1.5 shadow-[0_4px_15px_rgba(0,0,0,0.6)] flex items-center justify-center';

  const tailClass =
    "before:content-[''] before:absolute before:-bottom-[10px] before:left-1/2 before:-translate-x-1/2 before:border-t-[10px] before:border-x-[10px] before:border-b-0 before:border-solid before:border-t-[#ff7a99]/80 before:border-x-transparent before:block before:w-0 before:z-[-1] after:content-[''] after:absolute after:-bottom-[8px] after:left-1/2 after:-translate-x-1/2 after:border-t-[8px] after:border-x-[8px] after:border-b-0 after:border-solid after:border-t-[#121c32]/95 after:border-x-transparent after:block after:w-0";

  const animClass =
    animState === 'open'
      ? isLocal
        ? 'animate-[pop-bounce-local_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]'
        : 'animate-[pop-bounce_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]'
      : animState === 'close'
        ? isLocal
          ? 'animate-[pop-close-local_0.25s_cubic-bezier(0.6,-0.28,0.735,0.045)_forwards]'
          : 'animate-[pop-close_0.25s_cubic-bezier(0.6,-0.28,0.735,0.045)_forwards]'
        : '';

  const [charId, filename] = displaySticker.split('/');
  const srcPath = `/assets/${charId}/stickers/${filename}`;

  return (
    <div
      className={`${positionClass} ${baseBubbleClass} ${tailClass} ${animClass}`}
    >
      <img src={srcPath} alt="sticker" className="w-16 h-16 object-contain max-w-none" />
    </div>
  );
}
