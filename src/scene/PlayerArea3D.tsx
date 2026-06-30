import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import { AiType } from '../proto';
import { type PlayerModel, getPlayerDisplayName } from '../domain/model';
import { Hand3D } from './Hand3D';
import { River3D } from './River3D';
import { Melds3D } from './Melds3D';
import { getMeldsLeftEdge } from './assets';

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
}

export function PlayerArea3D({
  player,
  isLocal,
  seat,
  playerCount,
}: PlayerArea3DProps): React.JSX.Element {
  const shiftX = useMemo(() => {
    const hand = player.gameState?.hand;
    if (!hand || hand.called.length === 0) return 0;

    const meldsLeftEdge = getMeldsLeftEdge(hand.called, seat);
    const handMeldGap = 0.15;
    const targetRightX = meldsLeftEdge - handMeldGap;

    const spacing = 0.19;
    const k = hand.freeTiles.length;
    let rightMostX = 0;

    if (k > 0) {
      if (hand.pendingTile) {
        rightMostX = ((k - 1) / 2 + 1) * spacing + 0.08;
      } else {
        rightMostX = ((k - 1) / 2) * spacing;
      }
    }

    const calcShift = targetRightX - rightMostX;
    return Math.min(0, calcShift);
  }, [player.gameState?.hand, seat]);

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
          shiftX={shiftX}
        />
      </group>

      {/* Discard River */}
      <River3D
        discarded={hand.discarded}
        riichiTileId={riichiTileId}
        isLocal={isLocal}
      />

      {/* Called Melds - pushed towards center */}
      <group position={[0, 0, -0.2]}>
        <Melds3D called={hand.called} seat={seat} playerCount={playerCount} />
      </group>
    </group>
  );
}
