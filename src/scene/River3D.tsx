import React from 'react';
import type { IGameTileMsg } from '../proto';
import { Tile3D } from './Tile3D';
import { Tile } from '../domain/tile';
import { getSafeKey } from './assets';

interface River3DProps {
  discarded: IGameTileMsg[];
  riichiTileId?: number; // traceId of the riichi declaration tile
}

export function River3D({
  discarded,
  riichiTileId = 0,
}: River3DProps): React.JSX.Element {
  const spacingX = 0.19; // Tile width (0.18) + small gap
  const spacingZ = 0.25; // Tile height (0.24) + small gap
  const zStart = -1.35; // Start position of the river (further from player, near center)

  return (
    <group>
      {discarded.map((tileMsg, idx) => {
        const row = Math.floor(idx / 6);
        const col = idx % 6;

        // Center columns around X = 0 (left to right: col 0 is left, col 5 is right)
        const x = (col - 2.5) * spacingX;

        const tileStr = tileMsg.tile
          ? Tile.fromByte(tileMsg.tile).toString()
          : null;

        // In Japanese mahjong, the tile discarded to declare riichi is rotated sideways.
        const isRiichi = riichiTileId > 0 && tileMsg.traceId === riichiTileId;

        // Rows grow towards the player (+Z in local space), shift sideways tile to align bottom edge
        const z = zStart + row * spacingZ + (isRiichi ? 0.03 : 0);

        return (
          <Tile3D
            key={getSafeKey(tileMsg.traceId, idx)}
            tile={tileStr}
            displayState={isRiichi ? 'sideways' : 'face'}
            position={[x, 0, z]}
          />
        );
      })}
    </group>
  );
}
