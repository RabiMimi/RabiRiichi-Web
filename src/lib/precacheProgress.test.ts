import { describe, expect, it } from 'vitest';
import {
  measurePrecacheProgress,
  precacheCacheKeys,
  precacheCacheName,
} from './precacheProgress';

const SCRIPT = 'https://riichi.rabimimi.com/sw.js';

describe('precacheCacheName', () => {
  it('matches the name workbox gives the precache for a scope', () => {
    expect(precacheCacheName('https://riichi.rabimimi.com/')).toBe(
      'workbox-precache-v2-https://riichi.rabimimi.com/',
    );
  });
});

describe('precacheCacheKeys', () => {
  it('keeps hashed files unversioned and versions the rest', () => {
    expect(
      precacheCacheKeys(
        [
          { url: 'assets/index-COKDhf9C.js', revision: null },
          { url: 'index.html', revision: 'abc' },
        ],
        SCRIPT,
      ),
    ).toEqual([
      'https://riichi.rabimimi.com/assets/index-COKDhf9C.js',
      'https://riichi.rabimimi.com/index.html?__WB_REVISION__=abc',
    ]);
  });
});

describe('measurePrecacheProgress', () => {
  const expected = precacheCacheKeys(
    [
      { url: 'a-12345678.js', revision: null },
      { url: 'index.html', revision: 'new' },
      { url: 'tile.png', revision: 'r1' },
    ],
    SCRIPT,
  );

  it('starts at zero against an empty cache', () => {
    expect(measurePrecacheProgress(expected, [])).toEqual({
      done: 0,
      total: 3,
    });
  });

  it('ignores entries left over from an older build', () => {
    // An update installs next to the old precache until it activates.
    const cached = [
      'https://riichi.rabimimi.com/a-12345678.js',
      'https://riichi.rabimimi.com/index.html?__WB_REVISION__=old',
    ];
    expect(measurePrecacheProgress(expected, cached)).toEqual({
      done: 1,
      total: 3,
    });
  });

  it('reaches the total once everything is cached', () => {
    expect(measurePrecacheProgress(expected, expected)).toEqual({
      done: 3,
      total: 3,
    });
  });
});
