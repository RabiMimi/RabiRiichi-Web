import React from 'react';
import type { IGameTileMsg } from '../proto';
import { Tile3D } from './Tile3D';
import { Tile } from '../domain/tile';
import { getSafeKey, getSafeTraceId } from './assets';

interface Hand3DProps {
  tiles: IGameTileMsg[];
  pendingTile: IGameTileMsg | null;
  isLocal: boolean;
  isRevealed?: boolean;
  winningTileTraceId?: number | null;
  shiftX?: number;
}

export function Hand3D({
  tiles,
  pendingTile,
  isLocal,
  isRevealed = false,
  winningTileTraceId = null,
  shiftX = 0,
}: Hand3DProps): React.JSX.Element {
  const spacing = 0.19; // Tile width (0.18) + small gap
  const k = tiles.length;

  const showTiles = isLocal || isRevealed;
  const displayState = isLocal
    ? 'hand'
    : isRevealed
      ? 'face' // Revealed opponent hands lie flat face up
      : 'opponent-hand';

  return (
    <group position={[shiftX, 0, 0]}>
      {/* Free tiles in hand */}
      {tiles.map((tileMsg, idx) => {
        // Center the hand at X = 0
        const x = (idx - (k - 1) / 2) * spacing;

        // Only decode tile value if it is revealed or local player's hand.
        const tileStr =
          showTiles && tileMsg.tile
            ? Tile.fromByte(tileMsg.tile).toString()
            : null; // null renders as back texture

        const isWinningTile =
          winningTileTraceId != null && tileMsg.traceId === winningTileTraceId;

        return (
          <Tile3D
            key={getSafeKey(tileMsg.traceId, idx)}
            tile={tileStr}
            displayState={displayState}
            position={[x, 0, 0]}
            traceId={getSafeTraceId(tileMsg.traceId)}
            isWinningTile={isWinningTile}
          />
        );
      })}

      {/* Newly drawn tile (pending tile) placed on the right with a larger gap */}
      {pendingTile &&
        (() => {
          const x = ((k - 1) / 2 + 1) * spacing + 0.08;
          const tileStr =
            showTiles && pendingTile.tile
              ? Tile.fromByte(pendingTile.tile).toString()
              : null;

          const isWinningTile =
            winningTileTraceId != null &&
            pendingTile.traceId === winningTileTraceId;

          return (
            <Tile3D
              key={getSafeKey(pendingTile.traceId, 'pending')}
              tile={tileStr}
              displayState={displayState}
              position={[x, 0, 0]}
              traceId={getSafeTraceId(pendingTile.traceId)}
              isWinningTile={isWinningTile}
            />
          );
        })()}
    </group>
  );
}
