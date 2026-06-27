import React from 'react';
import type { IGameTileMsg } from '../proto';
import { Tile3D } from './Tile3D';
import { Tile } from '../domain/tile';

interface Hand3DProps {
  tiles: IGameTileMsg[];
  pendingTile: IGameTileMsg | null;
  isLocal: boolean;
}

export function Hand3D({
  tiles,
  pendingTile,
  isLocal,
}: Hand3DProps): React.JSX.Element {
  const spacing = 0.19; // Tile width (0.18) + small gap
  const k = tiles.length;

  return (
    <group>
      {/* Free tiles in hand */}
      {tiles.map((tileMsg, idx) => {
        // Center the hand at X = 0
        const x = (idx - (k - 1) / 2) * spacing;

        // Only decode tile value if it is the local player's hand.
        // For opponents, the server might send 0 or we want to hide it anyway.
        const tileStr =
          isLocal && tileMsg.tile
            ? Tile.fromByte(tileMsg.tile).toString()
            : null; // null renders as back texture

        return (
          <Tile3D
            key={tileMsg.traceId ?? idx}
            tile={tileStr}
            displayState="hand"
            position={[x, 0, 0]}
            traceId={tileMsg.traceId ?? undefined}
          />
        );
      })}

      {/* Newly drawn tile (pending tile) placed on the right with a larger gap */}
      {pendingTile &&
        (() => {
          const x = ((k - 1) / 2 + 1) * spacing + 0.08;
          const tileStr =
            isLocal && pendingTile.tile
              ? Tile.fromByte(pendingTile.tile).toString()
              : null;

          return (
            <Tile3D
              key={pendingTile.traceId ?? 'pending'}
              tile={tileStr}
              displayState="hand"
              position={[x, 0, 0]}
              traceId={pendingTile.traceId ?? undefined}
            />
          );
        })()}
    </group>
  );
}
