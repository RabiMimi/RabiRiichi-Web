import type { Tile } from '../domain/tile';
import { TileSource } from '../proto';
import type { IMenLikeMsg } from '../proto';

export const TILE_MODEL_PATH = '/assets/tile.glb';
export const TABLE_DIFFUSE_PATH = '/assets/table_diffuse.jpg';
export const MIMI_PATH = '/assets/mimi.png';
export const ROBOTO_FONT_PATH = '/assets/roboto.ttf';

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
 * Falls back to 'blank.jpg' if the tile is invalid or a back-face is requested.
 */
export function getTileTexturePath(tile: string | Tile | null): string {
  if (!tile) {
    return '/assets/hand_tiles/blank.jpg';
  }

  const tileStr = typeof tile === 'string' ? tile : tile.toString();

  // If it's explicitly 'back' or represents a back/invalid tile
  if (tileStr === 'back' || tileStr === '0x' || tileStr.includes('x')) {
    return '/assets/hand_tiles/blank.jpg';
  }

  if (tileStr === 'blank' || tileStr === 'front') {
    return `/assets/hand_tiles/${tileStr}.jpg`;
  }

  // Verify it is a valid tile face texture we have
  if ((VALID_TILE_STRINGS as readonly string[]).includes(tileStr)) {
    return `/assets/hand_tiles/${tileStr}.jpg`;
  }

  // Fallback to blank
  return '/assets/hand_tiles/blank.jpg';
}

/**
 * Returns the texture path for a table mid indicator graphic.
 */
export function getTableMidTexturePath(textureName: string): string {
  return `/assets/table_mid/${textureName}.png`;
}

/**
 * Returns a valid traceId (number) or undefined if the traceId is falsy, nullish, or 0.
 * Useful for filtering out protobuf default 0 values for hidden opponent tiles.
 */
export function getSafeTraceId(
  traceId: number | null | undefined,
): number | undefined {
  if (traceId === undefined || traceId === null || traceId === 0) {
    return undefined;
  }
  return traceId;
}

/**
 * Returns a unique key for rendering React elements, falling back if traceId is 0 or nullish.
 */
export function getSafeKey(
  traceId: number | null | undefined,
  fallback: string | number,
): string | number {
  return getSafeTraceId(traceId) ?? fallback;
}

/**
 * Calculates the left-most coordinate boundary of a player's called meld groups.
 */
export function getMeldsLeftEdge(called: IMenLikeMsg[], seat: number): number {
  const startX = 2.3;
  if (called.length === 0) return startX;

  const W_NORMAL = 0.18;
  const W_SIDEWAYS = 0.24;
  const gap = 0.005;
  const meldGap = 0.08;

  let currentMeldRightX = startX;

  for (const meld of called) {
    const tiles = meld.tiles ?? [];
    if (tiles.length === 0) continue;

    // Determine if Ankan (Closed Kan)
    // Closed kan tiles all have source TILE_SOURCE_ANKAN.
    const isAnkan =
      tiles.length === 4 &&
      tiles.every((t) => t.source === TileSource.TILE_SOURCE_ANKAN);

    let meldWidth: number;
    if (isAnkan) {
      meldWidth = 4 * W_NORMAL + 3 * gap;
    } else {
      const calledTile = tiles.find(
        (t) => t.discardInfo && t.discardInfo.from !== seat,
      );
      const isKakan =
        tiles.length === 4 &&
        tiles.some((t) => t.formTime !== tiles[0]?.formTime);

      if (isKakan) {
        // Kakan behaves horizontally like Pon (1 sideways, 2 normal, 4th stacked on top)
        meldWidth = W_SIDEWAYS + 2 * W_NORMAL + 2 * gap;
      } else {
        const sidewaysCount = calledTile ? 1 : 0;
        const normalCount = tiles.length - sidewaysCount;
        meldWidth =
          sidewaysCount * W_SIDEWAYS +
          normalCount * W_NORMAL +
          (tiles.length - 1) * gap;
      }
    }

    currentMeldRightX = currentMeldRightX - meldWidth - meldGap;
  }

  return currentMeldRightX + meldGap;
}
