import React, { useMemo } from 'react';
import { useHoverOrTouchHold } from '../ui/useHoverOrTouchHold';
import { Html } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import { AiType } from '../proto';
import {
  type PlayerModel,
  getPlayerDisplayName,
  shouldRevealHand,
} from '../domain/model';
import { Hand3D } from './Hand3D';
import { LocalHandPose } from './LocalHandPose';
import { River3D } from './River3D';
import { Melds3D } from './Melds3D';
import { NukiDora3D } from './NukiDora3D';
import { getHandShiftX } from './assets';
import type { TileRegistry } from '../domain/tileRegistry';
import {
  useResultAnimation,
  useIsReplay,
  useActiveStickers,
  useActiveChatTexts,
} from '../state/store';
import { StickerBubble } from '../ui/StickerBubble';
import { ChatBubble } from '../ui/ChatBubble';
import { playerOverlayPortalTarget } from '../ui/portal';

interface PlayerIndicator3DProps {
  player: PlayerModel;
  isLocal: boolean;
  screenPos?: number | undefined;
}

function PlayerIndicator3D({
  player,
  isLocal,
  screenPos,
}: PlayerIndicator3DProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const isAi = player.aiType !== AiType.AI_TYPE_NONE;
  const displayName = getPlayerDisplayName(player, t);
  const initials = isAi ? 'AI' : displayName.slice(0, 2).toUpperCase();
  const activeStickers = useActiveStickers();
  const activeChatTexts = useActiveChatTexts();
  const sticker = activeStickers[player.id];
  const chatText = activeChatTexts[player.id];

  const [showName, showNameBind] = useHoverOrTouchHold(300);

  if (isLocal) {
    return (
      <Html
        position={[0, 0.3, 0.1]}
        portal={playerOverlayPortalTarget as React.RefObject<HTMLElement>}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div className="flex flex-col items-center justify-center -translate-x-1/2 -translate-y-full gap-1">
          <StickerBubble
            sticker={sticker}
            className="sticker-bubble-3d local"
          />
          <ChatBubble text={chatText} className="chat-bubble-3d local" />
        </div>
      </Html>
    );
  }

  const placement = screenPos === 2 ? 'bottom' : 'top';

  return (
    <Html
      position={[1.2, 0.15, -0.2]}
      portal={playerOverlayPortalTarget as React.RefObject<HTMLElement>}
      style={{
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      <div
        className="relative cursor-pointer flex items-center justify-center animate-pop"
        onPointerEnter={showNameBind.onPointerEnter}
        onPointerLeave={showNameBind.onPointerLeave}
        onPointerDown={showNameBind.onPointerDown}
        onPointerUp={showNameBind.onPointerUp}
        onPointerCancel={showNameBind.onPointerCancel}
      >
        {isAi ? (
          <div className="w-6 h-6 rounded-full relative border-[1.5px] border-white shadow-[0_0_8px_rgba(155,81,224,0.7)] bg-[linear-gradient(135deg,#4285f4,#9b51e0,#e91e63,#f2994a)] bg-[length:200%_200%] animate-[gemini-gradient_3s_ease_infinite] before:content-[''] before:absolute before:-top-2 before:w-1.5 before:h-3 before:[background:inherit] before:rounded-t-full before:border-t-[1.5px] before:border-x-[1.5px] before:border-white before:left-[3px] before:rotate-[-15deg] after:content-[''] after:absolute after:-top-2 after:w-1.5 after:h-3 after:[background:inherit] after:rounded-t-full after:border-t-[1.5px] after:border-x-[1.5px] after:border-white after:right-[3px] after:rotate-[15deg]" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-[#3f51b5] text-white flex items-center justify-center font-sans text-[10px] font-bold shadow-[0_0_6px_rgba(63,81,181,0.6)] border-[1.5px] border-white">
            {initials}
          </div>
        )}
        <div
          className={`absolute bottom-full left-1/2 -translate-x-1/2 bg-black/85 text-white py-1 px-2 rounded text-[11px] whitespace-nowrap pointer-events-none transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-[#444] z-[1000] ${
            showName ? 'opacity-100 -translate-y-2' : 'opacity-0 -translate-y-1'
          }`}
        >
          {displayName}
        </div>
        <StickerBubble
          sticker={sticker}
          className="sticker-bubble-3d"
          placement={placement}
        />
        <ChatBubble
          text={chatText}
          className="chat-bubble-3d"
          placement={placement}
          hasSticker={Boolean(sticker)}
        />
      </div>
    </Html>
  );
}

interface PlayerArea3DProps {
  player: PlayerModel;
  isLocal: boolean;
  seat: number;
  screenPos?: number | undefined;
  playerCount: number;
  tileRegistry: TileRegistry;
  winningTileTraceId: number | null;
}

export function PlayerArea3D({
  player,
  isLocal,
  seat,
  screenPos,
  playerCount,
  tileRegistry,
  winningTileTraceId,
}: PlayerArea3DProps): React.JSX.Element {
  const shiftX = useMemo(() => {
    const hand = player.gameState?.hand;
    if (!hand) return 0;
    return getHandShiftX(
      hand.called,
      seat,
      hand.freeTiles.length,
      Boolean(hand.pendingTile),
    );
  }, [player.gameState?.hand, seat]);

  const resultAnimation = useResultAnimation();

  const isReplay = useIsReplay();
  const isRevealed = useMemo(() => {
    if (isReplay) {
      return true;
    }
    if (isLocal) {
      return Boolean(resultAnimation); // Lay local hand flat at round end
    }
    return shouldRevealHand(player.gameState?.agari, isLocal);
  }, [isLocal, player.gameState?.agari, resultAnimation, isReplay]);

  if (!player.gameState) {
    return <group />;
  }
  const { hand, riichiTileId } = player.gameState;

  return (
    <group>
      {/* Player Indicator Overlay (Billboarded near hand) */}
      <PlayerIndicator3D
        player={player}
        isLocal={isLocal}
        screenPos={screenPos}
      />

      {/* Hand (closed tiles + drawn tile) - pushed towards center */}
      <group position={[0, 0, -0.2]}>
        {isLocal ? (
          // The local hand is drawn in DOM by HandDisplay; this only publishes
          // where its tiles stand, so discards still fly into the river.
          <LocalHandPose
            tiles={hand.freeTiles}
            pendingTile={hand.pendingTile}
            shiftX={shiftX}
          />
        ) : (
          <Hand3D
            tiles={hand.freeTiles}
            pendingTile={hand.pendingTile}
            isLocal={isLocal}
            isRevealed={isRevealed}
            winningTileTraceId={winningTileTraceId}
            shiftX={shiftX}
          />
        )}
      </group>

      {/* Discard River */}
      <River3D
        discarded={hand.discarded}
        riichiTileId={riichiTileId}
        tileRegistry={tileRegistry}
        isLocal={isLocal}
        winningTileTraceId={winningTileTraceId}
      />

      {/* Called Melds - pushed towards center */}
      <group position={[0, 0, -0.2]}>
        <Melds3D called={hand.called} seat={seat} playerCount={playerCount} />
      </group>

      {/* Pulled North (拔北) - its own row so it never widens the melds */}
      <group position={[0, 0, -0.2]}>
        <NukiDora3D nukiDora={hand.nukiDora} />
      </group>
    </group>
  );
}
