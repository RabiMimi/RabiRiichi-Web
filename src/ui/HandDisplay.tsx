import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useRoom,
  useSelf,
  useCurrentInquiry,
  useIsRiichiSelectMode,
  useCallHighlightTileIds,
} from '../state/store';
import { rabiriichi } from '../net/client';
import { Tile } from '../domain/tile';
import { UiTile } from './UiTile';
import type { ActionOption } from '../domain/inquiry';

/**
 * DOM-rendered hand tile bar for the local player.
 *
 * Replaces the 3D hand tiles so the player sees crisp 2D tile images
 * at the bottom of the screen.  Opponent hands remain in 3D.
 */
export function HandDisplay(): React.JSX.Element | null {
  const room = useRoom();
  const self = useSelf();
  const currentInquiry = useCurrentInquiry();
  const isRiichiSelectMode = useIsRiichiSelectMode();
  const callHighlightIds = useCallHighlightTileIds();

  const selfPlayer = useMemo(
    () => (room && self ? room.players.find((p) => p.id === self.id) : null),
    [room, self],
  );

  const hand = selfPlayer?.gameState?.hand;
  if (!hand) return null;

  const freeTiles = hand.freeTiles;
  const pendingTile = hand.pendingTile;

  // Determine which tiles are playable
  const playableMap = useMemo(() => {
    const map = new Set<number>();
    if (!currentInquiry) return map;
    if (isRiichiSelectMode) {
      const riichiBtn = currentInquiry.mapped.buttons.find((b) => b.type === 'riichi');
      riichiBtn?.legalTiles?.forEach((id) => map.add(id));
    } else {
      currentInquiry.mapped.playTile?.legalTiles?.forEach((id) => map.add(id));
    }
    return map;
  }, [currentInquiry, isRiichiSelectMode]);

  const isInteractive = playableMap.size > 0;

  const handleTileClick = (traceId: number) => {
    if (!isInteractive) return;
    const activeOpt = getActiveOption(currentInquiry, isRiichiSelectMode);
    if (activeOpt) {
      void rabiriichi.submitInquiryResponse(activeOpt, traceId);
    }
  };

  return (
    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-[50] pointer-events-auto flex items-end">
      {freeTiles.map((tileMsg, idx) => {
        const tileStr = tileMsg.tile ? Tile.fromByte(tileMsg.tile).toString() : 'back';
        const isPlayable = tileMsg.traceId != null && playableMap.has(tileMsg.traceId);
        const isDimmed = callHighlightIds != null && tileMsg.traceId != null && !callHighlightIds.has(tileMsg.traceId);

        return (
          <button
            key={tileMsg.traceId ?? idx}
            type="button"
            className={`bg-transparent border-none p-0 cursor-pointer pb-6 relative ${
              isPlayable ? 'hover:-translate-y-3' : ''
            } ${isDimmed ? 'opacity-40' : ''}`}
            onClick={() => tileMsg.traceId != null && handleTileClick(tileMsg.traceId)}
            disabled={!isInteractive}
          >
            <img src="/assets/hand_tiles/slide.jpg" alt="" className="w-10 h-17 object-cover rounded rotate-270 rotate-y-60 absolute -top-10 left-1/2 -translate-x-1/2" />
            <UiTile
              tile={tileStr}
              size="hand"
              isHighlighted={isPlayable}
            />
          </button>
        );
      })}
      {pendingTile && (
        <button
          type="button"
          className={`bg-transparent border-none p-0 cursor-pointer ml-3 pb-6 relative ${
            isInteractive ? 'hover:-translate-y-3' : ''
          }`}
          onClick={() => pendingTile.traceId != null && handleTileClick(pendingTile.traceId)}
          disabled={!isInteractive}
        >
          <img src="/assets/hand_tiles/slide.jpg" alt="" className="w-full h-2 object-cover rounded rotate-180 absolute -top-0.5 left-1/2 -translate-x-1/2" />
          <UiTile
            tile={pendingTile.tile ? Tile.fromByte(pendingTile.tile).toString() : 'back'}
            size="hand"
            isHighlighted
          />
        </button>
      )}
    </div>
  );
}

function getActiveOption(
  inquiry: ReturnType<typeof useCurrentInquiry>,
  isRiichi: boolean,
): ActionOption | null {
  if (!inquiry?.mapped) return null;
  if (isRiichi) {
    const btn = inquiry.mapped.buttons.find((b) => b.type === 'riichi');
    if (!btn) return null;
    return btn.type === 'riichi' ? btn : null;
  }
  if (!inquiry.mapped.playTile) return null;
  return {
    type: 'play-tile',
    label: '打',
    actionIndex: inquiry.mapped.playTile.actionIndex,
    legalTiles: inquiry.mapped.playTile.legalTiles,
    ...(inquiry.mapped.playTile.candidates ? { candidates: inquiry.mapped.playTile.candidates } : {}),
  };
}
