import { Tile, TileSuit } from './tile';

export function getRegularTileSet(): Tile[] {
  const tiles: Tile[] = [];
  for (const suit of [
    TileSuit.M,
    TileSuit.P,
    TileSuit.S,
    TileSuit.Z,
  ] as const) {
    const maxNum = suit === TileSuit.Z ? 7 : 9;
    for (let num = 1; num <= maxNum; num++) {
      for (let count = 0; count < 4; count++) {
        const isAka = maxNum === 9 && num === 5 && count === 0;
        tiles.push(new Tile(num, suit, isAka));
      }
    }
  }
  return tiles;
}

export function getSanmaTileSet(): Tile[] {
  const tiles: Tile[] = [];
  for (const suit of [
    TileSuit.M,
    TileSuit.P,
    TileSuit.S,
    TileSuit.Z,
  ] as const) {
    const maxNum = suit === TileSuit.Z ? 7 : 9;
    for (let num = 1; num <= maxNum; num++) {
      if (suit === TileSuit.M && num >= 2 && num <= 8) {
        continue;
      }
      for (let count = 0; count < 4; count++) {
        const isAka = maxNum === 9 && num === 5 && count === 0;
        tiles.push(new Tile(num, suit, isAka));
      }
    }
  }
  return tiles;
}

export function getTwoSetsTileSet(): Tile[] {
  return [...getRegularTileSet(), ...getRegularTileSet()];
}

export function getOnlySZTileSet(): Tile[] {
  const tiles: Tile[] = [];
  for (const suit of [TileSuit.S, TileSuit.Z] as const) {
    const maxNum = suit === TileSuit.Z ? 7 : 9;
    for (let num = 1; num <= maxNum; num++) {
      for (let count = 0; count < 4; count++) {
        const isAka = maxNum === 9 && num === 5 && count === 0;
        tiles.push(new Tile(num, suit, isAka));
      }
    }
  }
  return tiles;
}

export const TILE_SET_PRESETS = {
  Regular: getRegularTileSet,
  Sanma: getSanmaTileSet,
  TwoSets: getTwoSetsTileSet,
  OnlySZ: getOnlySZTileSet,
} as const;

export type TileSetPresetName = keyof typeof TILE_SET_PRESETS;
