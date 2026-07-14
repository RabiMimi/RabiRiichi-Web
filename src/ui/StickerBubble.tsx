import React, { useEffect, useState, useRef } from 'react';

interface StickerBubbleProps {
  sticker: string | null | undefined;
  className?: string; // e.g. "sticker-bubble-2d" or "sticker-bubble-3d"
}

export function StickerBubble({ sticker, className = 'sticker-bubble-2d' }: StickerBubbleProps): React.JSX.Element | null {
  const [displaySticker, setDisplaySticker] = useState<string | null>(null);
  const [animState, setAnimState] = useState<'open' | 'close' | 'idle'>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (sticker) {
      if (displaySticker && displaySticker !== sticker) {
        // Switch sticker: play close animation first
        setAnimState('close');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setDisplaySticker(sticker);
          setAnimState('open');
        }, 250); // Match CSS close animation duration (250ms)
      } else {
        // Brand new sticker
        setDisplaySticker(sticker);
        setAnimState('open');
      }
    } else {
      // Sticker expired/cleared: play close animation
      if (displaySticker) {
        setAnimState('close');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setDisplaySticker(null);
          setAnimState('idle');
        }, 250);
      }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [sticker, displaySticker]);

  if (!displaySticker) return null;

  const animClass = animState === 'open' ? 'animate-pop' : animState === 'close' ? 'animate-close' : '';

  return (
    <div className={`${className} ${animClass}`}>
      <img
        src={`/assets/stickers/${displaySticker}`}
        alt="sticker"
        className="bubble-sticker-img"
      />
    </div>
  );
}
