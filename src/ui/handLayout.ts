/**
 * Geometry for the DOM-rendered local hand.
 *
 * Kept free of React so the sizing rules stay unit-testable: the hand has to
 * shrink to fit narrow (landscape phone) viewports without the tiles drifting
 * out of the centred row.
 */

/** Intrinsic pixel size of the tile artwork, at scale 1. */
const BASE_TILE_WIDTH = 84;
const BASE_TILE_HEIGHT = 109;
/** Height of the bevel strip rendered above each tile face. */
const BASE_BEVEL_HEIGHT = 21;

/** The hand never grows past this, however wide the window is. */
const MAX_HAND_WIDTH = 1100;
/** ...nor past this fraction of the viewport, leaving room for the side HUD. */
const HAND_VIEWPORT_RATIO = 0.75;

/** Horizontal gap between adjacent free tiles (Tailwind `gap-0.5`). */
const TILE_GAP = 2;
/** Extra gap separating the just-drawn tile from the sorted hand. */
const PENDING_TILE_GAP = 12;

/** Upward drag needed to discard, as a multiple of the tile height. */
const DRAG_THRESHOLD_RATIO = 1.5;

export interface HandLayout {
  /** Width of a single tile. */
  tileWidth: number;
  /** Height of the tile face (excluding the bevel). */
  tileHeight: number;
  /** Height of the bevel strip above the face. */
  bevelHeight: number;
  /** Total row height (face + bevel). */
  rowHeight: number;
  /** Upward drag distance (px) that commits a discard. */
  dragThreshold: number;
  /** Left offset of the first free tile, which centres the whole hand. */
  leftOffset: number;
  /** Left offset of the pending (just-drawn) tile slot. */
  pendingLeft: number;
}

/**
 * Computes the hand row geometry for a viewport width and free-tile count.
 *
 * The pending tile always gets a reserved slot, so the row does not jump
 * horizontally when a tile is drawn or discarded.
 */
export function computeHandLayout(
  viewportWidth: number,
  freeTileCount: number,
): HandLayout {
  const budget = Math.min(viewportWidth * HAND_VIEWPORT_RATIO, MAX_HAND_WIDTH);
  const tileWidth = Math.min(
    BASE_TILE_WIDTH,
    Math.floor(budget / Math.max(freeTileCount, 1)),
  );
  const scale = tileWidth / BASE_TILE_WIDTH;

  const tileHeight = Math.round(BASE_TILE_HEIGHT * scale);
  const bevelHeight = Math.round(BASE_BEVEL_HEIGHT * scale);

  const freeTilesWidth =
    freeTileCount * tileWidth + Math.max(freeTileCount - 1, 0) * TILE_GAP;
  const handWidth = freeTilesWidth + PENDING_TILE_GAP + tileWidth;
  const leftOffset = Math.round((viewportWidth - handWidth) / 2);

  return {
    tileWidth,
    tileHeight,
    bevelHeight,
    rowHeight: tileHeight + bevelHeight,
    dragThreshold: Math.round(BASE_TILE_HEIGHT * scale * DRAG_THRESHOLD_RATIO),
    leftOffset,
    pendingLeft: leftOffset + freeTilesWidth + PENDING_TILE_GAP,
  };
}
