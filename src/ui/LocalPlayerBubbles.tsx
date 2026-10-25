import React from 'react';
import { useActiveChatTexts, useActiveStickers, useSelf } from '../state/store';
import { StickerBubble } from './StickerBubble';
import { ChatBubble } from './ChatBubble';

interface LocalPlayerBubblesProps {
  /** Where the stack's centre sits, measured from the hand container's left. */
  left: number;
  /** Clearance above the hand container's bottom edge, raised tiles included. */
  bottom: number;
}

/**
 * The local player's sticker and chat bubbles, stacked above the left end of the
 * DOM hand.
 *
 * They used to hang off a point in the 3D scene, which projects onto the hand
 * row on most screens and covered the very tiles the player was choosing
 * between. Anchoring to the hand's own geometry keeps them clear at any size.
 */
export function LocalPlayerBubbles({
  left,
  bottom,
}: LocalPlayerBubblesProps): React.JSX.Element | null {
  const currentUser = useSelf();
  const stickers = useActiveStickers();
  const chatTexts = useActiveChatTexts();
  if (!currentUser) return null;

  return (
    <div
      className="absolute z-[60] flex -translate-x-1/2 flex-col items-center gap-1 pointer-events-none"
      style={{ left, bottom }}
    >
      {/* The "local" variants stack in flow with their tails pointing down. */}
      <StickerBubble
        sticker={stickers[currentUser.id]}
        className="sticker-bubble-3d local"
      />
      <ChatBubble
        text={chatTexts[currentUser.id]}
        className="chat-bubble-3d local"
      />
    </div>
  );
}
