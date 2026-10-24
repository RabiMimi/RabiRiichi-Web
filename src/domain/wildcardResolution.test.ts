import { describe, it, expect } from 'vitest';
import { Tile, WILDCARD_TILE_BYTE } from './tile';
import {
  resolveHandTiles,
  resolveTile,
  toWildcardAssignments,
} from './wildcardResolution';

const byte = (s: string): number => Tile.fromString(s).toByte();

describe('toWildcardAssignments', () => {
  it('maps trace ids to effective tiles, skipping empty entries', () => {
    expect(
      toWildcardAssignments([
        { traceId: 7, tile: byte('3s') },
        { traceId: 0, tile: byte('1m') },
        { traceId: 8 },
      ]),
    ).toEqual(new Map([[7, byte('3s')]]));
    expect(toWildcardAssignments(undefined).size).toBe(0);
  });
});

describe('resolveTile', () => {
  const assignments = new Map([[7, byte('3s')]]);

  it('shows an assigned wildcard as the tile it stood for', () => {
    expect(
      resolveTile({ traceId: 7, tile: WILDCARD_TILE_BYTE }, assignments),
    ).toEqual({ traceId: 7, tile: byte('3s'), fromWildcard: true });
  });

  it('leaves other tiles, and wildcards without an assignment, alone', () => {
    expect(resolveTile({ traceId: 1, tile: byte('5m') }, assignments)).toEqual({
      traceId: 1,
      tile: byte('5m'),
      fromWildcard: false,
    });
    expect(
      resolveTile({ traceId: 9, tile: WILDCARD_TILE_BYTE }, undefined),
    ).toEqual({ traceId: 9, tile: WILDCARD_TILE_BYTE, fromWildcard: false });
  });
});

describe('resolveHandTiles', () => {
  it('sorts by effective tile so the scored groups line up', () => {
    const hand = [
      { traceId: 1, tile: byte('2s') },
      { traceId: 2, tile: byte('1m') },
      { traceId: 3, tile: WILDCARD_TILE_BYTE },
      { traceId: 4, tile: byte('4s') },
      { traceId: 5, tile: byte('3s') },
    ];
    const resolved = resolveHandTiles(hand, new Map([[3, byte('3s')]]));
    expect(
      resolved.map((t) => [Tile.fromByte(t.tile).toString(), t.fromWildcard]),
    ).toEqual([
      ['1m', false],
      ['2s', false],
      // A natural tile comes before the wildcard standing for the same tile.
      ['3s', false],
      ['3s', true],
      ['4s', false],
    ]);
  });
});
