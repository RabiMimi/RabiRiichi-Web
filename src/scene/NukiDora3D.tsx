import React from 'react';
import type { IGameTileMsg } from '../proto';
import { Tile3D } from './Tile3D';
import { Tile } from '../domain/tile';
import { getSafeKey, getSafeTraceId } from './assets';

interface NukiDora3DProps {
  nukiDora: IGameTileMsg[];
}

// Pulled North (拔北) tiles sit in their own compact row so they never widen the
// melds area. Laid out face-up, growing leftward from the same right edge as the
// melds, but shifted toward the table centre (smaller Z) to form a parallel row.
const START_X = 2.3;
const TILE_WIDTH = 0.18;
const TILE_GAP = 0.01;
const ROW_Z = -0.42;

export function NukiDora3D({ nukiDora }: NukiDora3DProps): React.JSX.Element {
  return (
    <group>
      {nukiDora.map((tileMsg, idx) => {
        const tileStr = tileMsg.tile
          ? Tile.fromByte(tileMsg.tile).toString()
          : null;
        const x = START_X - TILE_WIDTH / 2 - idx * (TILE_WIDTH + TILE_GAP);
        return (
          <Tile3D
            key={getSafeKey(tileMsg.traceId, `nuki_${idx}`)}
            tile={tileStr}
            displayState="face"
            position={[x, 0, ROW_Z]}
            traceId={getSafeTraceId(tileMsg.traceId)}
            area="nuki"
          />
        );
      })}
    </group>
  );
}
