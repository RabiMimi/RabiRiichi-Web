import React, { useMemo } from 'react';
import type { PlayerGameState } from '../domain/model';
import { Hand3D } from './Hand3D';
import { River3D } from './River3D';
import { Melds3D } from './Melds3D';
import { getMeldsLeftEdge } from './assets';

interface PlayerArea3DProps {
  gameState: PlayerGameState;
  isLocal: boolean;
  seat: number;
  playerCount: number;
}

export function PlayerArea3D({
  gameState,
  isLocal,
  seat,
  playerCount,
}: PlayerArea3DProps): React.JSX.Element {
  const { hand, riichiTileId } = gameState;

  const shiftX = useMemo(() => {
    if (hand.called.length === 0) return 0;

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
  }, [hand.called, hand.freeTiles.length, hand.pendingTile, seat]);

  return (
    <group>
      {/* Hand (closed tiles + drawn tile) */}
      <Hand3D
        tiles={hand.freeTiles}
        pendingTile={hand.pendingTile}
        isLocal={isLocal}
        shiftX={shiftX}
      />

      {/* Discard River */}
      <River3D discarded={hand.discarded} riichiTileId={riichiTileId} />

      {/* Called Melds */}
      <Melds3D called={hand.called} seat={seat} playerCount={playerCount} />
    </group>
  );
}
