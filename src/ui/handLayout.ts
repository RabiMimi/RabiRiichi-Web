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
const MAX_HAND_WIDTH = 820;
/** ...nor past this fraction of the viewport, leaving room for the side HUD. */
const HAND_VIEWPORT_RATIO = 0.6;

/**
 * Share of viewport height the tile row may occupy.
 *
 * Width alone is not enough of a constraint: in landscape the window is wide but
 * short, so a hand sized purely to fit horizontally still ends up towering over
 * the table. Capping height keeps the board readable on a phone.
 */
const MAX_HAND_HEIGHT_RATIO = 0.14;

/**
 * Free tiles in the largest possible hand (13 before the draw).
 *
 * Tile size is derived from this rather than from how many tiles are actually
 * held, so calling a meld — or discarding — never resizes the remaining tiles.
 * A shorter hand simply occupies a shorter row.
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
 * Tile size depends only on the viewport — whichever of three limits binds
 * first: the artwork's own size, the horizontal budget for a full hand, or the
 * share of viewport height the row may occupy. It deliberately does *not*
 * depend on `freeTileCount`, which only affects where the row starts and where
 * the drawn tile sits; otherwise tiles would resize on every call and discard.
 */
export function computeHandLayout(
  viewportWidth: number,
  viewportHeight: number,
  freeTileCount: number,
): HandLayout {
  const widthBudget = Math.min(
    viewportWidth * HAND_VIEWPORT_RATIO,
    MAX_HAND_WIDTH,
  );
  // Budget for a *full* hand, not the current one — see MAX_FREE_TILES.
  const widthPerTile = Math.floor(widthBudget / MAX_FREE_TILES);

  // The row is a tile face plus its bevel, so convert the height allowance back
  // into a width using the artwork's aspect ratio.
  const heightBudget = viewportHeight * MAX_HAND_HEIGHT_RATIO;
  const widthFromHeight = Math.floor(
    (heightBudget * BASE_TILE_WIDTH) / (BASE_TILE_HEIGHT + BASE_BEVEL_HEIGHT),
  );

  const tileWidth = Math.max(
    1,
    Math.min(BASE_TILE_WIDTH, widthPerTile, widthFromHeight),
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
