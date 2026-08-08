import { describe, expect, it } from 'vitest';
import {
  assertNoPrecacheConflicts,
  findPrecacheConflicts,
  formatPrecacheConflicts,
} from './precacheGuard';

describe('findPrecacheConflicts', () => {
  it('accepts a manifest with no repeats', () => {
    expect(
      findPrecacheConflicts([
        { url: 'index.html', revision: 'a' },
        { url: 'assets/index-DfRgsis5.js', revision: null },
      ]),
    ).toEqual([]);
  });

  it('accepts an exact repeat, which workbox collapses', () => {
    expect(
      findPrecacheConflicts([
        { url: 'favicon.png', revision: 'a' },
        { url: 'favicon.png', revision: 'a' },
      ]),
    ).toEqual([]);
  });

  it('catches the same URL under two revisions', () => {
    // The real regression: the glob listed it unrevisioned, includeAssets
    // listed it with an md5.
    expect(
      findPrecacheConflicts([
        { url: 'assets/tile.glb', revision: null },
        { url: 'assets/tile.glb', revision: '803bf0ce' },
      ]),
    ).toEqual([{ url: 'assets/tile.glb', revisions: ['803bf0ce', 'null'] }]);
  });

  it('treats a missing revision the same as an explicit null', () => {
    expect(
      findPrecacheConflicts([
        { url: 'a.png' },
        { url: 'a.png', revision: null },
      ]),
    ).toEqual([]);
  });

  it('reports every offending URL, once each', () => {
    const conflicts = findPrecacheConflicts([
      { url: 'a.png', revision: null },
      { url: 'a.png', revision: '1' },
      { url: 'a.png', revision: '2' },
      { url: 'b.png', revision: null },
      { url: 'b.png', revision: '1' },
      { url: 'c.png', revision: '1' },
    ]);
    expect(conflicts.map((c) => c.url)).toEqual(['a.png', 'b.png']);
    expect(conflicts[0]?.revisions).toEqual(['1', '2', 'null']);
  });

  it('handles an empty manifest', () => {
    expect(findPrecacheConflicts([])).toEqual([]);
  });
});

describe('assertNoPrecacheConflicts', () => {
  it('passes a clean manifest straight through', () => {
    const entries = [{ url: 'index.html', revision: 'a' }];
    expect(assertNoPrecacheConflicts(entries)).toBe(entries);
  });

  it('fails the build, naming the URL and the likely cause', () => {
    expect(() =>
      assertNoPrecacheConflicts([
        { url: 'assets/tile.glb', revision: null },
        { url: 'assets/tile.glb', revision: 'abc' },
      ]),
    ).toThrow(/assets\/tile\.glb/);

    expect(() =>
      assertNoPrecacheConflicts([
        { url: 'x', revision: null },
        { url: 'x', revision: 'abc' },
      ]),
    ).toThrow(/includeAssets/);
  });
});

describe('formatPrecacheConflicts', () => {
  it('truncates a long list rather than printing hundreds of lines', () => {
    const many = Array.from({ length: 128 }, (_, i) => ({
      url: `a${i}.png`,
      revisions: ['null', 'x'],
    }));
    const msg = formatPrecacheConflicts(many);
    expect(msg).toContain('128 URL(s)');
    expect(msg).toContain('...and 123 more');
    expect(msg.split('\n').filter((l) => l.startsWith('  a')).length).toBe(5);
  });
});
