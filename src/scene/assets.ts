import type { Tile } from '../domain/tile';

export const TILE_MODEL_PATH = '/assets/tile.glb';
export const TABLE_DIFFUSE_PATH = '/assets/table_diffuse.jpg';
export const MIMI_PATH = '/assets/mimi.png';
export const ROBOTO_FONT_PATH = '/assets/roboto.woff2';

// Valid tile face strings
export const VALID_TILE_STRINGS = [
  '1m',
  '2m',
  '3m',
  '4m',
  '5m',
  '6m',
  '7m',
  '8m',
  '9m',
  'r5m',
  '1p',
  '2p',
  '3p',
  '4p',
  '5p',
  '6p',
  '7p',
  '8p',
  '9p',
  'r5p',
  '1s',
  '2s',
  '3s',
  '4s',
  '5s',
  '6s',
  '7s',
  '8s',
  '9s',
  'r5s',
  '1z',
  '2z',
  '3z',
  '4z',
  '5z',
  '6z',
  '7z',
] as const;

export type ValidTileString = (typeof VALID_TILE_STRINGS)[number];

/**
 * Returns the texture path for a given tile or tile string.
 * Falls back to 'back.jpg' if the tile is invalid or a back-face is requested.
 */
export function getTileTexturePath(tile: string | Tile | null): string {
  if (!tile) {
    return '/assets/hand_tiles/back.jpg';
  }

  const tileStr = typeof tile === 'string' ? tile : tile.toString();

  // If it's explicitly 'back' or represents a back/invalid tile
  if (tileStr === 'back' || tileStr === '0x' || tileStr.includes('x')) {
    return '/assets/hand_tiles/back.jpg';
  }

  if (tileStr === 'blank' || tileStr === 'front') {
    return `/assets/hand_tiles/${tileStr}.jpg`;
  }

  // Verify it is a valid tile face texture we have
  if ((VALID_TILE_STRINGS as readonly string[]).includes(tileStr)) {
    return `/assets/hand_tiles/${tileStr}.jpg`;
  }

  // Fallback to back
  return '/assets/hand_tiles/back.jpg';
}

/**
 * Returns the texture path for a table mid indicator graphic.
 */
export function getTableMidTexturePath(textureName: string): string {
  return `/assets/table_mid/${textureName}.png`;
}
