import React from 'react';
import type { IGameTileMsg } from '../proto';
import { Tile3D } from './Tile3D';
import { Tile } from '../domain/tile';
import { getSafeKey } from './assets';
import { getRiichiSidewaysTraceId } from '../domain/river';
import {
  createEmptyTileRegistry,
  type TileRegistry,
} from '../domain/tileRegistry';

interface River3DProps {
  discarded: IGameTileMsg[];
  riichiTileId?: number; // traceId of the riichi declaration tile
  tileRegistry?: TileRegistry;
  isLocal?: boolean;
}

export function River3D({
  discarded,
  riichiTileId = 0,
  tileRegistry = createEmptyTileRegistry(),
  isLocal = false,
}: River3DProps): React.JSX.Element {
  // The sideways tile is the riichi declaration discard, or, if that tile has
  // since been called away, the next surviving discard. Resolve it once here.
  const sidewaysTraceId = getRiichiSidewaysTraceId(
    discarded,
    riichiTileId,
    tileRegistry,
  );
  const spacingZ = 0.25; // Tile height (0.24) + small gap
  const zStart = isLocal ? -1.48 : -1.6; // Shift slightly towards local player to expose riichi stick

  // Group discarded tiles into grids of 30 (5 rows of 6 tiles)
  const grids: IGameTileMsg[][][] = [];
  for (let i = 0; i < discarded.length; i += 30) {
    const gridTiles = discarded.slice(i, i + 30);
    const gridRows: IGameTileMsg[][] = [];
    for (let j = 0; j < gridTiles.length; j += 6) {
      gridRows.push(gridTiles.slice(j, j + 6));
    }
    grids.push(gridRows);
  }

  const gridWidth = 1.25; // Shift for second river (and subsequent ones)

  return (
    <group>
      {grids.map((gridRows, gridIndex) => {
        const gridXShift = gridIndex * gridWidth;
        return (
          <group key={gridIndex} position={[gridXShift, 0, 0]}>
            {gridRows.map((rowTiles, rowIndex) => {
              // Fixed left-aligned starting edge for column 0 (so first tile left edge is at -0.565)
              const leftEdgeStart = -0.565;
              let leftEdge = leftEdgeStart;

              return (
                <group key={rowIndex}>
                  {rowTiles.map((tileMsg, colIndex) => {
                    const isRiichi =
                      sidewaysTraceId > 0 &&
                      tileMsg.traceId === sidewaysTraceId;

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
                    const z =
                      zStart + rowIndex * spacingZ + (isRiichi ? 0.03 : 0);

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
      })}
    </group>
  );
}
