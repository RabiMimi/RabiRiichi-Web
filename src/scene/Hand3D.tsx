import React from 'react';
import type { IGameTileMsg } from '../proto';
import { Tile3D } from './Tile3D';
import { Tile } from '../domain/tile';
import { getSafeKey, getSafeTraceId } from './assets';

interface Hand3DProps {
  tiles: IGameTileMsg[];
  pendingTile: IGameTileMsg | null;
  isLocal: boolean;
  shiftX?: number;
}

export function Hand3D({
  tiles,
  pendingTile,
  isLocal,
  shiftX = 0,
}: Hand3DProps): React.JSX.Element {
  const spacing = 0.19; // Tile width (0.18) + small gap
  const k = tiles.length;

  return (
    <group position={[shiftX, 0, 0]}>
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
            key={getSafeKey(tileMsg.traceId, idx)}
            tile={tileStr}
            displayState={isLocal ? 'hand' : 'opponent-hand'}
            position={[x, 0, 0]}
            traceId={getSafeTraceId(tileMsg.traceId)}
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
              key={getSafeKey(pendingTile.traceId, 'pending')}
              tile={tileStr}
              displayState={isLocal ? 'hand' : 'opponent-hand'}
              position={[x, 0, 0]}
              traceId={getSafeTraceId(pendingTile.traceId)}
            />
          );
        })()}
    </group>
  );
}
