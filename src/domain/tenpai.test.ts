import { describe, it, expect } from 'vitest';
import {
  buildTileSetCounts,
  collectVisibleTileKinds,
  collectVisibleTileKindsFromSnapshot,
  countRemainingWinningTile,
  type TileKindCounts,
  type VisibleHand,
} from './tenpai';
import { Tile } from './tile';

const tile = (s: string): number => Tile.fromString(s).toByte();

/** A standard set: 4 of every kind (one red five per suit). */
function standardSet(): TileKindCounts {
  const initialTiles: number[] = [];
  for (const suit of ['m', 'p', 's']) {
    for (let n = 1; n <= 9; n++) {
      for (let copy = 0; copy < 4; copy++) {
        // The first 5 of each numbered suit is the red five.
        initialTiles.push(
          tile(n === 5 && copy === 0 ? `r5${suit}` : `${n}${suit}`),
        );
      }
    }
  }
  for (let n = 1; n <= 7; n++) {
    for (let copy = 0; copy < 4; copy++) initialTiles.push(tile(`${n}z`));
  }
  return buildTileSetCounts({ initialTiles });
}

const STD = standardSet();

describe('buildTileSetCounts', () => {
  it('counts copies per kind, normalizing akadora into its base five', () => {
    // Map keys are akadora-normalized (& 0x7f). Three normal 5m + one red 5m all
    // collapse to the single "5m" kind => 4.
    expect(STD.get(tile('5m') & 0x7f)).toBe(4);
    expect(STD.get(tile('r5m') & 0x7f)).toBe(4);
    expect(STD.get(tile('1z') & 0x7f)).toBe(4);
    // The count is keyed by kind, so the raw red byte is the same kind as 5m.
    expect((tile('r5m') & 0x7f) === (tile('5m') & 0x7f)).toBe(true);
  });

  it('reflects a custom tile set with non-standard multiplicities', () => {
    const counts = buildTileSetCounts({
      initialTiles: [tile('1m'), tile('1m'), tile('1m'), tile('2p')],
    });
    expect(counts.get(tile('1m'))).toBe(3);
    expect(counts.get(tile('2p'))).toBe(1);
  });

  it('returns an empty map when the tile set is unknown', () => {
    expect(buildTileSetCounts(null).size).toBe(0);
    expect(buildTileSetCounts({}).size).toBe(0);
  });
});

describe('countRemainingWinningTile', () => {
  it('returns the tile-set maximum when no copies are visible', () => {
    expect(countRemainingWinningTile(tile('5m'), [], STD)).toBe(4);
  });

  it('subtracts each visible copy from the maximum', () => {
    const visible = [tile('5m'), tile('5m'), tile('1p')].map((b) => b & 0x7f);
    expect(countRemainingWinningTile(tile('5m'), visible, STD)).toBe(2);
  });

  it('uses the configured (non-four) maximum for a custom tile set', () => {
    // A set with only three 1m: with one visible, two remain.
    const counts = buildTileSetCounts({
      initialTiles: [tile('1m'), tile('1m'), tile('1m')],
    });
    const visible = [tile('1m') & 0x7f];
    expect(countRemainingWinningTile(tile('1m'), visible, counts)).toBe(2);
  });

  it('falls back to four when the kind is absent from the counts', () => {
    expect(countRemainingWinningTile(tile('9s'), [], new Map())).toBe(4);
  });

  it('treats a red five as the same kind as a normal five', () => {
    // Kinds come from collectVisibleTileKinds, which normalizes akadora.
    const visible = collectVisibleTileKinds(
      [
        {
          freeTiles: [
            { traceId: 1, tile: tile('r5m') },
            { traceId: 2, tile: tile('5m') },
          ],
        },
      ],
      [],
    );
    // Both red and normal 5m count against the 5m wait (max 4 - 2 seen).
    expect(countRemainingWinningTile(tile('5m'), visible, STD)).toBe(2);
    expect(countRemainingWinningTile(tile('r5m'), visible, STD)).toBe(2);
  });

  it('never returns a negative count', () => {
    const visible = [
      tile('5m'),
      tile('5m'),
      tile('5m'),
      tile('5m'),
      tile('5m'),
    ].map((b) => b & 0x7f);
    expect(countRemainingWinningTile(tile('5m'), visible, STD)).toBe(0);
  });
});

describe('collectVisibleTileKinds', () => {
  it('gathers free, pending, meld and discard tiles plus revealed doras', () => {
    const hands: VisibleHand[] = [
      {
        freeTiles: [{ traceId: 1, tile: tile('1m') }],
        pendingTile: { traceId: 2, tile: tile('2m') },
        called: [{ tiles: [{ traceId: 3, tile: tile('3m') }] }],
        discarded: [{ traceId: 4, tile: tile('4m') }],
      },
    ];
    const doras = [{ traceId: 5, tile: tile('5m') }];
    const kinds = collectVisibleTileKinds(hands, doras);
    expect(kinds).toHaveLength(5);
    expect(countRemainingWinningTile(tile('3m'), kinds, STD)).toBe(3);
  });

  it('skips face-down tiles (tile <= 0)', () => {
    const hands: VisibleHand[] = [
      { freeTiles: [{ traceId: 1, tile: 0 }, { traceId: 2 }] },
    ];
    expect(collectVisibleTileKinds(hands, [])).toEqual([]);
  });

  it('counts every tile of a 4-tile kan meld, not just three', () => {
    const hands: VisibleHand[] = [
      {
        called: [
          {
            tiles: [
              { traceId: 1, tile: tile('7p') },
              { traceId: 2, tile: tile('7p') },
              { traceId: 3, tile: tile('7p') },
              { traceId: 4, tile: tile('7p') },
            ],
          },
        ],
      },
    ];
    const kinds = collectVisibleTileKinds(hands, []);
    expect(countRemainingWinningTile(tile('7p'), kinds, STD)).toBe(0);
  });
});

describe('collectVisibleTileKindsFromSnapshot', () => {
  it('collects across all players and only revealed doras', () => {
    const kinds = collectVisibleTileKindsFromSnapshot({
      wall: { doras: [{ traceId: 99, tile: tile('1z') }] },
      players: [
        {
          id: 0,
          hand: {
            freeTiles: [{ traceId: 1, tile: tile('5s') }],
            discarded: [{ traceId: 2, tile: tile('5s') }],
          },
        },
        {
          id: 1,
          hand: {
            // Opponent's concealed tiles are hidden (tile 0) and not counted.
            freeTiles: [{ traceId: 3, tile: 0 }],
            discarded: [{ traceId: 4, tile: tile('5s') }],
          },
        },
      ],
    });
    // Three visible 5s (own hand, own discard, opponent discard) => 1 remains.
    expect(countRemainingWinningTile(tile('5s'), kinds, STD)).toBe(1);
  });
});
