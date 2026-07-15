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

  const animClass =
    animState === 'open'
      ? 'animate-pop'
      : animState === 'close'
        ? 'animate-close'
        : '';

  const [charId, filename] = displaySticker.split('/');
  const srcPath = `/assets/${charId}/stickers/${filename}`;

  return (
    <div className={`${className} ${animClass}`}>
      <img src={srcPath} alt="sticker" className="bubble-sticker-img" />
    </div>
  );
}
