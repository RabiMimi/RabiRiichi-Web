import React from 'react';
import type { IMenLikeMsg } from '../proto';
import { Tile3D } from './Tile3D';
import { Tile } from '../domain/tile';

interface Melds3DProps {
  called: IMenLikeMsg[];
}

export function Melds3D({ called }: Melds3DProps): React.JSX.Element {
  const spacingX = 0.19; // Tile width + small gap
  const startX = 1.8; // Start melds on the right side of the player's area, growing leftwards

  // Flatten all tiles across all melds to lay them out in a sequence
  // (In real mahjong, there is a small gap between melds, and some tiles are rotated,
  // but a simple contiguous sequence going left is a great baseline).
  let flatIndex = 0;

  return (
    <group>
      {called.map((meld, meldIdx) => {
        const meldKey = meld.tiles?.[0]?.traceId ?? meldIdx;
        return (
          <group key={meldKey}>
            {meld.tiles?.map((tileMsg, tileIdx) => {
              const x = startX - flatIndex * spacingX;
              flatIndex++;

              const tileStr = tileMsg.tile
                ? Tile.fromByte(tileMsg.tile).toString()
                : null;

              return (
                <Tile3D
                  key={tileMsg.traceId ?? `${meldKey}_${tileIdx}`}
                  tile={tileStr}
                  displayState="face"
                  position={[x, 0, 0]}
                />
              );
            })}
          </group>
        );
      })}
    </group>
  );
}
