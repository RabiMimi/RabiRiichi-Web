import { describe, it, expect } from 'vitest';
import { WILDCARD_TILE_BYTE } from './tile';
import {
  PRESET_WILDCARD_COUNT,
  TILE_SET_PRESETS,
  buildInitialTiles,
  getRegularTileSet,
  getTileSet,
  getWildcards,
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
  it('returns the chosen tile set as bytes', () => {
    expect(buildInitialTiles('Sanma')).toEqual(toBytes('Sanma'));
    expect(buildInitialTiles('Regular')).toEqual(toBytes('Regular'));
    expect(buildInitialTiles('RegularWildcards')).toEqual(
      toBytes('RegularWildcards'),
    );
  });
});
