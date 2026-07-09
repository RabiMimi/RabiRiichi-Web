import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import { AiType } from '../proto';
import {
  type PlayerModel,
  getPlayerDisplayName,
  shouldRevealHand,
} from '../domain/model';
import { Hand3D } from './Hand3D';
import { River3D } from './River3D';
import { Melds3D } from './Melds3D';
import { NukiDora3D } from './NukiDora3D';
import { getHandShiftX } from './assets';
import type { TileRegistry } from '../domain/tileRegistry';
import { useResultAnimation } from '../state/store';

interface PlayerIndicator3DProps {
  player: PlayerModel;
}

function PlayerIndicator3D({
  player,
}: PlayerIndicator3DProps): React.JSX.Element {
  const { t } = useTranslation();
  const isAi = player.aiType !== AiType.AI_TYPE_NONE;
  const displayName = getPlayerDisplayName(player, t);
  const initials = isAi ? 'AI' : displayName.slice(0, 2).toUpperCase();

  return (
    <Html
      position={[1.2, 0.15, -0.2]}
      style={{
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      <div className="player-indicator-3d">
        {isAi ? (
          <div className="ai-rabbit-indicator" />
        ) : (
          <div className="human-avatar-indicator">{initials}</div>
        )}
        <div className="tooltip-name">{displayName}</div>
      </div>
    </Html>
  );
}

interface PlayerArea3DProps {
  player: PlayerModel;
  isLocal: boolean;
  seat: number;
  playerCount: number;
  tileRegistry: TileRegistry;
  winningTileTraceId: number | null;
}

export function PlayerArea3D({
  player,
  isLocal,
  seat,
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

  const isRevealed = useMemo(() => {
    if (isLocal) {
      return Boolean(resultAnimation); // Lay local hand flat at round end
    }
    return shouldRevealHand(player.gameState?.agari, isLocal);
  }, [isLocal, player.gameState?.agari, resultAnimation]);

  if (!player.gameState) {
    return <group />;
  }
  const { hand, riichiTileId } = player.gameState;

  return (
    <group>
      {/* Player Indicator Overlay (Billboarded near hand) - hide for current player */}
      {!isLocal && <PlayerIndicator3D player={player} />}

      {/* Hand (closed tiles + drawn tile) - pushed towards center */}
      <group position={[0, 0, -0.2]}>
        <Hand3D
          tiles={hand.freeTiles}
          pendingTile={hand.pendingTile}
          isLocal={isLocal}
          isRevealed={isRevealed}
          winningTileTraceId={winningTileTraceId}
          shiftX={shiftX}
        />
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
