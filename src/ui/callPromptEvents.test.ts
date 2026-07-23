import { describe, expect, it } from 'vitest';
import { TileSource, type IMenLikeMsg } from '../proto';
import { findNewMeldCallType, getMeldCallType } from './callPromptEvents';

function meld(source: TileSource, count: number): IMenLikeMsg {
  return {
    tiles: Array.from({ length: count }, (_, index) => ({
      traceId: index + 1,
      tile: 17,
      source,
    })),
  };
}

describe('call prompt meld detection', () => {
  it.each([
    ['chii', meld(TileSource.TILE_SOURCE_CHII, 3), 'chii'],
    ['pon', meld(TileSource.TILE_SOURCE_PON, 3), 'pon'],
    ['daiminkan', meld(TileSource.TILE_SOURCE_DAIMINKAN, 4), 'kan'],
    ['ankan', meld(TileSource.TILE_SOURCE_ANKAN, 4), 'kan'],
    ['kakan', meld(TileSource.TILE_SOURCE_KAKAN, 4), 'kan'],
  ] as const)('classifies %s', (_name, value, expected) => {
    expect(getMeldCallType(value)).toBe(expected);
  });

  it('detects appended chii, pon, daiminkan, and ankan melds', () => {
    expect(
      findNewMeldCallType([], [meld(TileSource.TILE_SOURCE_CHII, 3)]),
    ).toBe('chii');
    expect(findNewMeldCallType([], [meld(TileSource.TILE_SOURCE_PON, 3)])).toBe(
      'pon',
    );
    expect(
      findNewMeldCallType([], [meld(TileSource.TILE_SOURCE_DAIMINKAN, 4)]),
    ).toBe('kan');
    expect(
      findNewMeldCallType([], [meld(TileSource.TILE_SOURCE_ANKAN, 4)]),
    ).toBe('kan');
  });

  it('detects a provisional daiminkan before the server stamps its tile sources', () => {
    const daiminkan = meld(TileSource.TILE_SOURCE_HAND, 4);

    expect(findNewMeldCallType([], [daiminkan])).toBe('kan');
  });

  it('detects a kakan upgrading an existing pon without growing the meld list', () => {
    const pon = meld(TileSource.TILE_SOURCE_PON, 3);
    const kakan = meld(TileSource.TILE_SOURCE_KAKAN, 4);

    expect(findNewMeldCallType([pon], [kakan])).toBe('kan');
    expect(findNewMeldCallType([kakan], [kakan])).toBeNull();
  });
});
