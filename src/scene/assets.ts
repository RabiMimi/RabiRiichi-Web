import { type Tile, isTileUnknown } from '../domain/tile';
import type { IMenLikeMsg } from '../proto';

export const TILE_MODEL_PATH = '/assets/tile.glb';
export const TABLE_DIFFUSE_PATH = '/assets/table_diffuse.webp';
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

  if (tileStr === 'back') {
    return '/assets/hand_tiles/back.jpg';
  }

  // If it represents a back/invalid tile
  if (isTileUnknown(tileStr)) {
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
 * Shared tile/meld layout constants (world units). These MUST stay in sync with
 * the actual rendering in Melds3D.tsx and Hand3D.tsx, otherwise the auto-align
 * shift will not match what is drawn (see RabiMimi/RabiRiichi#77).
 */
export const TILE_LAYOUT = {
  /** Rightmost anchor where the called-meld group starts, growing leftward. */
  meldsStartX: 2.3,
  /** Width of a face/back tile lying flat. */
  normalWidth: 0.18,
  /** Width of a sideways (called) tile: it shows its length instead. */
  sidewaysWidth: 0.24,
  /** Gap between tiles within the same meld. */
  tileGap: 0.005,
  /** Gap between adjacent meld groups. */
  meldGap: 0.08,
  /** Center-to-center spacing of free hand tiles. */
  handSpacing: 0.19,
  /** Extra gap before the freshly drawn (pending) tile. */
  pendingGap: 0.08,
  /** Gap kept between the hand's right edge and the melds' left edge. */
  handMeldGap: 0.15,
} as const;

/**
 * Calculates the left-most coordinate boundary of a player's called meld groups.
 */
export function getMeldsLeftEdge(called: IMenLikeMsg[], seat: number): number {
  const startX = TILE_LAYOUT.meldsStartX;
  if (called.length === 0) return startX;

  const W_NORMAL = TILE_LAYOUT.normalWidth;
  const W_SIDEWAYS = TILE_LAYOUT.sidewaysWidth;
  const gap = TILE_LAYOUT.tileGap;
  const meldGap = TILE_LAYOUT.meldGap;

  let currentMeldRightX = startX;

  for (const meld of called) {
    const tiles = meld.tiles ?? [];
    if (tiles.length === 0) continue;

    const isAnkan =
      tiles.length === 4 &&
      !tiles.some((t) => t.discardInfo && t.discardInfo.from !== seat);

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

/**
 * Computes how far left the free hand must slide so it never overlaps the
 * player's called melds. Returns a non-positive X offset applied to the hand
 * group (0 = no shift needed).
 *
 * The comparison uses the hand's right EDGE against the melds' left EDGE
 * (getMeldsLeftEdge already returns a true edge). Comparing an edge against a
 * tile center was the cause of the ~half-tile overlap in RabiMimi/RabiRiichi#77,
 * which is most visible when a wide kan pushes the melds further left.
 */
export function getHandShiftX(
  called: IMenLikeMsg[],
  seat: number,
  freeTileCount: number,
  hasPendingTile: boolean,
): number {
  if (called.length === 0) return 0;

  const targetRightEdge =
    getMeldsLeftEdge(called, seat) - TILE_LAYOUT.handMeldGap;

  const spacing = TILE_LAYOUT.handSpacing;
  const halfTile = TILE_LAYOUT.normalWidth / 2;
  const k = freeTileCount;

  // Default when the hand is empty: only the pending tile (if any) matters.
  let handRightEdge = -halfTile;
  if (k > 0) {
    const rightmostCenter = hasPendingTile
      ? ((k - 1) / 2 + 1) * spacing + TILE_LAYOUT.pendingGap
      : ((k - 1) / 2) * spacing;
    handRightEdge = rightmostCenter + halfTile;
  }

  return Math.min(0, targetRightEdge - handRightEdge);
}

/**
 * Module-level cache that keeps the preloaded `Image` objects alive. Without
 * holding these references the browser may garbage-collect the in-flight
 * `Image` objects and abort their fetches, defeating the preload entirely.
 */
const preloadedTileImages = new Map<string, HTMLImageElement>();
let tileImagePreloadPromise: Promise<void> | null = null;

/**
 * Preloads and pre-decodes every tile image so DOM `<img>` tags in the in-game
 * UI (meld/tenpai/result panels) paint instantly instead of fetching and
 * decoding on first render.
 *
 * Idempotent: the work runs once and subsequent calls return the same promise.
 * The returned promise resolves when all images are fetched and decoded; it can
 * be awaited but never rejects (individual failures are ignored).
 */
export function preloadAllTileImages(): Promise<void> {
  if (tileImagePreloadPromise) {
    return tileImagePreloadPromise;
  }
  if (typeof window === 'undefined' || typeof window.Image === 'undefined') {
    tileImagePreloadPromise = Promise.resolve();
    return tileImagePreloadPromise;
  }

  const imagesToPreload = [
    ...VALID_TILE_STRINGS,
    'back',
    'blank',
    'front',
  ] as const;

  const decodes = imagesToPreload.map((tile) => {
    const path = getTileTexturePath(tile);
    const img = new window.Image();
    // Retain the reference so the fetch is not aborted by GC.
    preloadedTileImages.set(path, img);
    img.src = path;
    // decode() forces the browser to fetch AND decode the JPEG off the render
    // path. Fall back to onload if decode() is unavailable or rejects (e.g. the
    // image is not yet fully fetched in some engines).
    const ready =
      typeof img.decode === 'function'
        ? img.decode().catch(() => undefined)
        : new Promise<void>((resolve) => {
            img.onload = (): void => resolve();
            img.onerror = (): void => resolve();
          });
    return ready;
  });

  tileImagePreloadPromise = Promise.all(decodes).then(() => undefined);
  return tileImagePreloadPromise;
}

/**
 * Resets the preload cache. Used strictly in unit tests to avoid pollution.
 */
export function _resetPreloadCache(): void {
  tileImagePreloadPromise = null;
  preloadedTileImages.clear();
}
