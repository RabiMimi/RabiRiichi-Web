import { TileSource, type IMenLikeMsg } from '../proto';

export type MeldCallType = 'chii' | 'pon' | 'kan';

export function getMeldCallType(meld: IMenLikeMsg): MeldCallType {
  const tiles = meld.tiles ?? [];
  const sources = new Set(tiles.map((tile) => tile.source));

  if (
    tiles.length >= 4 ||
    sources.has(TileSource.TILE_SOURCE_DAIMINKAN) ||
    sources.has(TileSource.TILE_SOURCE_KAKAN) ||
    sources.has(TileSource.TILE_SOURCE_ANKAN)
  ) {
    return 'kan';
  }
  if (sources.has(TileSource.TILE_SOURCE_CHII)) return 'chii';
  return 'pon';
}

/**
 * Finds the call represented by a hand-state transition. Chi, pon, daiminkan,
 * and ankan append a meld; kakan instead upgrades an existing pon in place.
 */
export function findNewMeldCallType(
  previous: readonly IMenLikeMsg[],
  current: readonly IMenLikeMsg[],
): MeldCallType | null {
  if (current.length > previous.length) {
    const added = current
      .slice(previous.length)
      .find((meld) => meld.tiles?.length);
    return added ? getMeldCallType(added) : null;
  }

  for (let index = 0; index < current.length; index += 1) {
    const currentMeld = current[index];
    const previousMeld = previous[index];
    if (
      currentMeld &&
      previousMeld &&
      getMeldCallType(currentMeld) === 'kan' &&
      getMeldCallType(previousMeld) !== 'kan'
    ) {
      return 'kan';
    }
  }

  return null;
}
