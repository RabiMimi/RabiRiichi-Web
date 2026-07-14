import React, { useMemo } from 'react';
import { TileSource } from '../proto';
import type { IMenLikeMsg, IGameTileMsg } from '../proto';
import { Tile3D } from './Tile3D';
import { Tile } from '../domain/tile';
import { getSafeKey, getSafeTraceId } from './assets';

interface Melds3DProps {
  called: IMenLikeMsg[];
  seat: number;
  playerCount: number;
}

interface LayoutTileInfo {
  tileMsg: IGameTileMsg;
  displayState: 'face' | 'back' | 'sideways';
  x: number;
  z: number;
}

export function Melds3D({
  called,
  seat,
  playerCount,
}: Melds3DProps): React.JSX.Element {
  const startX = 2.3;
  const meldGap = 0.08; // Gap between different melds
  const tileGap = 0.005; // Small gap between tiles in the same meld

  const W_NORMAL = 0.18;
  const W_SIDEWAYS = 0.24;

  const meldTilesLayout = useMemo(() => {
    const allLayoutTiles: (LayoutTileInfo & { meldIdx: number })[] = [];
    let currentMeldRightX = startX;

    called.forEach((meld, meldIdx) => {
      const tiles = meld.tiles ?? [];
      if (tiles.length === 0) return;

      const isAnkan =
        tiles.length === 4 &&
        !tiles.some((t) => t.discardInfo && t.discardInfo.from !== seat);

      const meldLayout: LayoutTileInfo[] = [];
      let totalMeldWidth: number;

      if (isAnkan) {
        // Closed Kan layout: [Back, Face, Face, Back]
        let currentX = 0;
        const states: ('face' | 'back')[] = ['back', 'face', 'face', 'back'];
        states.forEach((state, i) => {
          const tile = tiles[i];
          if (tile) {
            meldLayout.push({
              tileMsg: tile,
              displayState: state,
              x: currentX + W_NORMAL / 2,
              z: 0,
            });
            currentX += W_NORMAL + tileGap;
          }
        });
        totalMeldWidth = currentX - tileGap;
      } else {
        // Open meld (Chi, Pon, Daiminkan, Kakan)
        const calledTile = tiles.find(
          (t) => t.discardInfo && t.discardInfo.from !== seat,
        );

        if (!calledTile) {
          // Fallback: just lay them flat face-up
          let currentX = 0;
          tiles.forEach((t) => {
            meldLayout.push({
              tileMsg: t,
              displayState: 'face',
              x: currentX + W_NORMAL / 2,
              z: 0,
            });
            currentX += W_NORMAL + tileGap;
          });
          totalMeldWidth = currentX - tileGap;
        } else {
          const isKakan =
            tiles.length === 4 &&
            tiles.some((t) => t.source === TileSource.TILE_SOURCE_KAKAN);

          let orderedTiles: IGameTileMsg[];
          let addedTile: IGameTileMsg | null = null;

          if (isKakan) {
            // Find the added tile (largest formTime)
            const sortedByTime = [...tiles].sort(
              (a, b) => (b.formTime ?? 0) - (a.formTime ?? 0),
            );
            const firstSorted = sortedByTime[0];
            if (firstSorted) {
              addedTile = firstSorted;
              const originalPonTiles = tiles.filter(
                (t) => t.traceId !== firstSorted.traceId,
              );
              const handTiles = originalPonTiles.filter(
                (t) => !t.discardInfo || t.discardInfo.from === seat,
              );
              orderedTiles = orderMeldTiles(
                calledTile,
                handTiles,
                seat,
                playerCount,
              );
            } else {
              orderedTiles = [];
            }
          } else {
            const handTiles = tiles.filter(
              (t) => !t.discardInfo || t.discardInfo.from === seat,
            );
            orderedTiles = orderMeldTiles(
              calledTile,
              handTiles,
              seat,
              playerCount,
            );
          }

          // Lay out the ordered tiles (including the called tile)
          let currentX = 0;
          orderedTiles.forEach((tile) => {
            const isCalled = tile.traceId === calledTile.traceId;
            const displayState = isCalled ? 'sideways' : 'face';
            const width = isCalled ? W_SIDEWAYS : W_NORMAL;

            meldLayout.push({
              tileMsg: tile,
              displayState,
              x: currentX + width / 2,
              z: isCalled ? 0.03 : 0,
            });
            currentX += width + tileGap;
          });
          totalMeldWidth = currentX - tileGap;

          // If Kakan, stack the added tile on top of the called tile
          if (isKakan && addedTile) {
            const calledLayout = meldLayout.find(
              (l) => l.tileMsg.traceId === calledTile.traceId,
            );
            if (calledLayout) {
              meldLayout.push({
                tileMsg: addedTile,
                displayState: 'sideways',
                x: calledLayout.x,
                z: calledLayout.z - 0.18, // Shifted towards table center relative to base tile
              });
            }
          }
        }
      }

      // Shift the meld layout so its right edge ends at currentMeldRightX
      const shiftX = currentMeldRightX - totalMeldWidth;
      meldLayout.forEach((tileLayout) => {
        allLayoutTiles.push({
          ...tileLayout,
          x: tileLayout.x + shiftX,
          meldIdx,
        });
      });

      // Update right edge boundary for next meld
      currentMeldRightX = currentMeldRightX - totalMeldWidth - meldGap;
    });

    return allLayoutTiles;
  }, [called, seat, playerCount]);

  return (
    <group>
      {meldTilesLayout.map(({ tileMsg, displayState, x, z, meldIdx }, idx) => {
        const tileStr = tileMsg.tile
          ? Tile.fromByte(tileMsg.tile).toString()
          : null;

        const tileKey = getSafeKey(tileMsg.traceId, `meld_${meldIdx}_${idx}`);

        return (
          <Tile3D
            key={tileKey}
            tile={tileStr}
            displayState={displayState}
            position={[x, 0, z]}
            traceId={getSafeTraceId(tileMsg.traceId)}
            area="meld"
          />
        );
      })}
    </group>
  );
}

function orderMeldTiles(
  calledTile: IGameTileMsg,
  handTiles: IGameTileMsg[],
  seat: number,
  playerCount: number,
): IGameTileMsg[] {
  const discardInfo = calledTile.discardInfo;
  if (!discardInfo) {
    return handTiles;
  }
  if (discardInfo.from == null) {
    return handTiles;
  }
  const discarderSeat = discardInfo.from;

  let relativePos: number;
  if (playerCount === 2) {
    relativePos = 2; // Always opposite in 2-player
  } else {
    relativePos = (discarderSeat - seat + 4) % 4;
  }

  if (relativePos === 3) {
    // Left player (Kamicha)
    return [calledTile, ...handTiles];
  } else if (relativePos === 1) {
    // Right player (Shimodacha)
    return [...handTiles, calledTile];
  } else {
    // Opposite player (Toimichu)
    const result = [...handTiles];
    result.splice(1, 0, calledTile);
    return result;
  }
}
