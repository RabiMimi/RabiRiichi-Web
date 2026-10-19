import { describe, it, expect } from 'vitest';
import { MAX_WILDCARD_COUNT, MIN_WILDCARD_COUNT } from './constants';
import { WILDCARD_TILE_BYTE } from './tile';
import {
  PRESET_WILDCARD_COUNT,
  TILE_SET_PRESETS,
  buildInitialTiles,
  getRegularTileSet,
  getTileSet,
  getWildcards,
  parseWildcardCount,
} from './tilesets';

const countWildcards = (bytes: readonly number[]): number =>
  bytes.filter((b) => b === WILDCARD_TILE_BYTE).length;

const toBytes = (presetName: string): number[] =>
  getTileSet(presetName).map((t) => t.toByte());

describe('getWildcards', () => {
  it('returns the requested number of distinct wildcard tiles', () => {
    const wildcards = getWildcards(3);
    expect(wildcards).toHaveLength(3);
    expect(wildcards.every((t) => t.isWildcard)).toBe(true);
    expect(new Set(wildcards).size).toBe(3);
    expect(getWildcards(0)).toEqual([]);
  });
});

describe('RegularWildcards preset', () => {
  it('is the regular 136 tiles plus 4 wildcards', () => {
    const bytes = TILE_SET_PRESETS.RegularWildcards().map((t) => t.toByte());
    expect(PRESET_WILDCARD_COUNT).toBe(4);
    expect(bytes).toHaveLength(140);
    expect(countWildcards(bytes)).toBe(4);
    expect(bytes.slice(0, 136)).toEqual(
      getRegularTileSet().map((t) => t.toByte()),
    );
  });

  it('is reachable by name', () => {
    expect(countWildcards(toBytes('RegularWildcards'))).toBe(4);
  });

  it('leaves the other presets wildcard-free', () => {
    for (const name of [
      'Regular',
      'Sanma',
      'TwoSets',
      'OnlySZ',
      'TenchiSouzou',
    ]) {
      expect(countWildcards(toBytes(name))).toBe(0);
    }
  });
});

describe('buildInitialTiles', () => {
  it('returns the chosen tile set unchanged with no extra wildcards', () => {
    expect(buildInitialTiles('Sanma', 0)).toEqual(toBytes('Sanma'));
  });

  it('appends the extra wildcards to the chosen tile set', () => {
    const bytes = buildInitialTiles('Regular', 3);
    expect(bytes).toHaveLength(139);
    expect(bytes.slice(0, 136)).toEqual(toBytes('Regular'));
    expect(bytes.slice(136)).toEqual([
      WILDCARD_TILE_BYTE,
      WILDCARD_TILE_BYTE,
      WILDCARD_TILE_BYTE,
    ]);
  });

  it('adds to the wildcards a preset already holds', () => {
    expect(countWildcards(buildInitialTiles('RegularWildcards', 2))).toBe(6);
  });
});

describe('parseWildcardCount', () => {
  it('treats an empty input as no extra wildcards', () => {
    expect(parseWildcardCount('')).toBe(0);
    expect(parseWildcardCount('  ')).toBe(0);
  });

  it('accepts whole numbers within range', () => {
    expect(parseWildcardCount('4')).toBe(4);
    expect(parseWildcardCount(' 2 ')).toBe(2);
    expect(parseWildcardCount(String(MIN_WILDCARD_COUNT))).toBe(
      MIN_WILDCARD_COUNT,
    );
    expect(parseWildcardCount(String(MAX_WILDCARD_COUNT))).toBe(
      MAX_WILDCARD_COUNT,
    );
  });

  it('rejects out-of-range or malformed counts', () => {
    expect(parseWildcardCount(String(MAX_WILDCARD_COUNT + 1))).toBeNull();
    expect(parseWildcardCount('-1')).toBeNull();
    expect(parseWildcardCount('1.5')).toBeNull();
    expect(parseWildcardCount('abc')).toBeNull();
  });
});
