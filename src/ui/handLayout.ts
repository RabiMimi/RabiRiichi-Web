/**
 * Geometry for the DOM-rendered local hand.
 *
 * Kept free of React so the sizing rules stay unit-testable.
 *
 * Tiles are sized by projecting the real 3D tile through the table camera, so a
 * DOM hand tile covers the same pixels a rendered one would. Sizing it in CSS
 * units instead is what made the hand drift: the 3D tile scales with the
 * viewport, while `rem`/px bounds do not, so browser zoom slid the two apart —
 * the hand measured 21% larger than a 3D tile at 200% zoom and 34% smaller at
 * 62%.
 */

import {
  LOCAL_HAND_WORLD_POS,
  TILE_WORLD_SIZE,
  getPixelsPerWorldUnit,
} from '../scene/cameraPose';

/**
 * Bevel strip above each face, as a fraction of tile width.
 *
 * The true aspect of `bevel.jpg` (700x193); the face artwork (700x933) is
 * likewise drawn at its own aspect, which happens to be the 3D tile's
 * 0.24/0.18 exactly. Both were previously derived from an assumed 84px-wide
 * source and came out slightly squashed.
 */
const BEVEL_WIDTH_RATIO = 193 / 700;

/** Widest the artwork can be drawn before it is genuinely upscaled. */
const ARTWORK_WIDTH = 700;

/**
 * Guard rail: the row may never exceed this fraction of viewport width.
 *
 * The projected size stays near half the viewport at every realistic landscape
 * aspect, so this only bites on extreme windows.
 */
const HAND_VIEWPORT_RATIO = 0.6;

/**
 * Free tiles in the largest possible hand (13 before the draw).
 *
 * The guard rail is measured against a full hand rather than the current one,
 * so calling a meld — or discarding — never resizes the remaining tiles. A
 * shorter hand simply occupies a shorter row.
 */
const MAX_FREE_TILES = 13;

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
 * Computes the hand row geometry for a viewport and free-tile count.
 *
 * Tile size depends only on the viewport: it is the on-screen size of a 3D tile
 * standing in the local hand row. It deliberately does *not* depend on
 * `freeTileCount`, which only affects where the row starts and where the drawn
 * tile sits; otherwise tiles would resize on every call and discard.
 */
export function computeHandLayout(
  viewportWidth: number,
  viewportHeight: number,
  freeTileCount: number,
): HandLayout {
  const pxPerWorldUnit = getPixelsPerWorldUnit(
    viewportWidth,
    viewportHeight,
    LOCAL_HAND_WORLD_POS,
  );
  const projectedWidth = TILE_WORLD_SIZE.width * pxPerWorldUnit;

  // Guard rail only — measured against a full hand, so it cannot resize the
  // tiles mid-round. The projected size stays well inside it in practice.
  const widthBudget = (viewportWidth * HAND_VIEWPORT_RATIO) / MAX_FREE_TILES;

  const tileWidth = Math.max(
    1,
    Math.round(Math.min(projectedWidth, widthBudget, ARTWORK_WIDTH)),
  );
  const tileHeight = Math.round(
    (tileWidth * TILE_WORLD_SIZE.height) / TILE_WORLD_SIZE.width,
  );
  const bevelHeight = Math.round(tileWidth * BEVEL_WIDTH_RATIO);

  const freeTilesWidth =
    freeTileCount * tileWidth + Math.max(freeTileCount - 1, 0) * TILE_GAP;
  const handWidth = freeTilesWidth + PENDING_TILE_GAP + tileWidth;
  const leftOffset = Math.round((viewportWidth - handWidth) / 2);

  return {
    tileWidth,
    tileHeight,
    bevelHeight,
    rowHeight: tileHeight + bevelHeight,
    dragThreshold: Math.round(tileHeight * DRAG_THRESHOLD_RATIO),
    leftOffset,
    pendingLeft: leftOffset + freeTilesWidth + PENDING_TILE_GAP,
  };
}
