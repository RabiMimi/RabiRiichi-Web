import type { IGameTileMsg } from '../proto/index.js';
import { TileSource } from '../proto/index.js';

/**
 * Tooltip-facing facts about a single tile, derived purely from the
 * authoritative record the server stamps onto every `GameTileMsg`.
 *
 * The server records the turn (`jun`) a tile was drawn (`drawnJun`) and, once
 * discarded, the turn it was discarded (`discardInfo.jun`). It also records the
 * turn an in-hand tile joined a meld (`formJun`). We never re-derive these from
 * event timestamps on the client: a timestamp advances on every player's
 * action (draws, calls, kans, ...), so it does not map to a player's own turn
 * count.
 */
export interface TileInfoFacts {
  /** The turn the tile was drawn into a hand, or null if it was never drawn. */
  readonly drawnJun: number | null;
  /** The turn the tile was discarded, or null if it is not (yet) discarded. */
  readonly discardJun: number | null;
  /** The turn this player's tile joined a meld, or null otherwise. */
  readonly formJun: number | null;
  /** Seat that discarded the tile, or null if not discarded. */
  readonly discardedFrom: number | null;
  /**
   * 手切 (tedashi) vs 摸切 (tsumogiri) for a discarded tile, or null if the tile
   * is not discarded. A tile is tsumogiri iff it was discarded on the very turn
   * it was drawn (drawnJun === discardJun); anything else — a tile held from an
   * earlier turn, a dealt tile (drawnJun 0), or a discard after a call (the
   * discarded tile was never drawn) — is tedashi.
   */
  readonly isTedashi: boolean | null;
  /** True if the tile is currently part of a called/kan meld. */
  readonly isClaimed: boolean;
  /**
   * True if the tile is still an undrawn, unclaimed part of the starting hand
   * (dealt before anyone's first turn, so it has no drawn jun of its own).
   */
  readonly isInitialHand: boolean;
}

/** A positive jun (1-based) or null when unset (server sends 0 for "none"). */
function toJun(value: number | null | undefined): number | null {
  return value != null && value > 0 ? value : null;
}

const CLAIMED_SOURCES: ReadonlySet<TileSource> = new Set([
  TileSource.TILE_SOURCE_CHII,
  TileSource.TILE_SOURCE_PON,
  TileSource.TILE_SOURCE_KAKAN,
  TileSource.TILE_SOURCE_ANKAN,
  TileSource.TILE_SOURCE_DAIMINKAN,
]);

/** Derives the tooltip facts for a tile record from the registry. */
export function deriveTileInfo(tile: IGameTileMsg): TileInfoFacts {
  const drawnJun = toJun(tile.drawnJun);
  const discardInfo = tile.discardInfo;
  const discardJun = toJun(discardInfo?.jun);
  const formJun = toJun(tile.formJun);
  const discardedFrom =
    discardInfo?.from != null && discardInfo.from >= 0
      ? discardInfo.from
      : null;

  // Tedashi/tsumogiri only applies once the tile has actually been discarded.
  const isTedashi = discardJun == null ? null : drawnJun !== discardJun;

  const isClaimed = tile.source != null && CLAIMED_SOURCES.has(tile.source);
  const isInitialHand = drawnJun == null && discardJun == null && !isClaimed;

  return {
    drawnJun,
    discardJun,
    formJun,
    discardedFrom,
    isTedashi,
    isClaimed,
    isInitialHand,
  };
}
