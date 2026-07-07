import { describe, it, expect } from 'vitest';
import {
  collectVisibleTileKinds,
  collectVisibleTileKindsFromSnapshot,
  countRemainingWinningTile,
  type VisibleHand,
} from './tenpai';
import { Tile } from './tile';

const tile = (s: string): number => Tile.fromString(s).toByte();

describe('countRemainingWinningTile', () => {
  it('returns 4 when no copies are visible', () => {
    expect(countRemainingWinningTile(tile('5m'), [])).toBe(4);
  });

  it('subtracts each visible copy from four', () => {
    const visible = [tile('5m'), tile('5m'), tile('1p')];
    expect(countRemainingWinningTile(tile('5m'), visible)).toBe(2);
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
    // Both red and normal 5m count against the 5m wait.
    expect(countRemainingWinningTile(tile('5m'), visible)).toBe(2);
    expect(countRemainingWinningTile(tile('r5m'), visible)).toBe(2);
  });

  it('never returns a negative count', () => {
    const visible = [
      tile('5m'),
      tile('5m'),
      tile('5m'),
      tile('5m'),
      tile('5m'),
    ];
    expect(countRemainingWinningTile(tile('5m'), visible)).toBe(0);
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
    expect(countRemainingWinningTile(tile('3m'), kinds)).toBe(3);
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
    expect(countRemainingWinningTile(tile('7p'), kinds)).toBe(0);
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
    expect(countRemainingWinningTile(tile('5s'), kinds)).toBe(1);
  });
});
