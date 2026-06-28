import React from 'react';
import type { IGameTileMsg } from '../proto';
import { Tile3D } from './Tile3D';
import { Tile } from '../domain/tile';
import { getSafeKey } from './assets';

interface River3DProps {
  discarded: IGameTileMsg[];
  riichiTileId?: number; // traceId of the riichi declaration tile
  isLocal?: boolean;
}

export function River3D({
  discarded,
  riichiTileId = 0,
  isLocal = false,
}: River3DProps): React.JSX.Element {
  const spacingZ = 0.25; // Tile height (0.24) + small gap
  const zStart = isLocal ? -1.48 : -1.6; // Shift slightly towards local player to expose riichi stick

  // Group discarded tiles into rows of 6
  const rows: IGameTileMsg[][] = [];
  for (let i = 0; i < discarded.length; i += 6) {
    rows.push(discarded.slice(i, i + 6));
  }

  return (
    <group>
      {rows.map((rowTiles, rowIndex) => {
        // Fixed left-aligned starting edge for column 0 (so first tile left edge is at -0.565)
        const leftEdgeStart = -0.565;
        let leftEdge = leftEdgeStart;

        return (
          <group key={rowIndex}>
            {rowTiles.map((tileMsg, colIndex) => {
              const isRiichi =
                riichiTileId > 0 && tileMsg.traceId === riichiTileId;

              const tileWidth = 0.18;
              const tileHeight = 0.24;
              const gap = 0.01;
              const currentWidth = isRiichi ? tileHeight : tileWidth;

              // Tile pivot is center, so place at leftEdge + half width
              const x = leftEdge + currentWidth / 2;
              leftEdge += currentWidth + gap;

              const tileStr = tileMsg.tile
                ? Tile.fromByte(tileMsg.tile).toString()
                : null;

              // Rows grow towards the player (+Z in local space)
              const z = zStart + rowIndex * spacingZ + (isRiichi ? 0.03 : 0);

              return (
                <Tile3D
                  key={getSafeKey(tileMsg.traceId, colIndex)}
                  tile={tileStr}
                  displayState={isRiichi ? 'sideways' : 'face'}
                  position={[x, 0, z]}
                />
              );
            })}
          </group>
        );
      })}
    </group>
  );
}
