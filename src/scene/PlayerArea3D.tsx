import React from 'react';
import type { PlayerGameState } from '../domain/model';
import { Hand3D } from './Hand3D';
import { River3D } from './River3D';
import { Melds3D } from './Melds3D';

interface PlayerArea3DProps {
  gameState: PlayerGameState;
  isLocal: boolean;
}

export function PlayerArea3D({
  gameState,
  isLocal,
}: PlayerArea3DProps): React.JSX.Element {
  const { hand, riichiTileId } = gameState;

  return (
    <group>
      {/* Hand (closed tiles + drawn tile) */}
      <Hand3D
        tiles={hand.freeTiles}
        pendingTile={hand.pendingTile}
        isLocal={isLocal}
      />

      {/* Discard River */}
      <River3D discarded={hand.discarded} riichiTileId={riichiTileId} />

      {/* Called Melds */}
      <Melds3D called={hand.called} />
    </group>
  );
}
