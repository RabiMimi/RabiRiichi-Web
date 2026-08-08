import { Tile, TileSuit } from './tile';
import { STORAGE_KEY_CUSTOM_TILE_SETS } from './constants';

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

export function getTenchiSouzouTileSet(): Tile[] {
  const tiles: Tile[] = [];
  for (let i = 0; i < 136; i++) {
    tiles.push(new Tile(5, TileSuit.Z, false));
  }
  return tiles;
}

export const TILE_SET_PRESETS = {
  Regular: getRegularTileSet,
  Sanma: getSanmaTileSet,
  TwoSets: getTwoSetsTileSet,
  OnlySZ: getOnlySZTileSet,
  TenchiSouzou: getTenchiSouzouTileSet,
} as const;

export type TileSetPresetName = string;

export interface CustomTileSet {
  id: string;
  name: string;
  tiles: string[]; // array of strings like "1m", "r5p", etc.
}

export function loadCustomTileSets(): CustomTileSet[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_TILE_SETS);
    return stored ? (JSON.parse(stored) as CustomTileSet[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomTileSets(sets: CustomTileSet[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_TILE_SETS, JSON.stringify(sets));
  } catch (err) {
    console.error('Failed to save custom tile sets:', err);
  }
}

export function getTileSet(presetName: string): Tile[] {
  if (presetName in TILE_SET_PRESETS) {
    return TILE_SET_PRESETS[presetName as keyof typeof TILE_SET_PRESETS]();
  }
  const customSets = loadCustomTileSets();
  const found = customSets.find(
    (s) => s.id === presetName || s.name === presetName,
  );
  if (found) {
    return found.tiles.map((t) => Tile.fromString(t));
  }
  return getRegularTileSet();
}
