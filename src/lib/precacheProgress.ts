/**
 * How far an installing service worker has got with its precache.
 *
 * Workbox reports no progress while it installs, and a first launch on a slow
 * link spends a long time in there with nothing on screen to say so. It does,
 * however, write each file into its precache as soon as it arrives, so the
 * page can measure progress by comparing that cache against the worker's own
 * manifest. These helpers mirror workbox-precaching's naming so the two agree.
 */
import type { PrecacheEntry } from '../build/precacheGuard';

export interface PrecacheProgress {
  done: number;
  total: number;
}

/** Same query parameter workbox-precaching uses to version a cache key. */
const REVISION_SEARCH_PARAM = '__WB_REVISION__';

/** workbox-core's default precache name: prefix, cache id, then the scope. */
export function precacheCacheName(scope: string): string {
  return ['workbox', 'precache-v2', scope].filter(Boolean).join('-');
}

/**
 * The cache key workbox stores each entry under, resolved against the worker's
 * script URL just as the worker resolves them against its own location.
 */
export function precacheCacheKeys(
  entries: readonly PrecacheEntry[],
  scriptUrl: string,
): string[] {
  return entries.map(({ url, revision }) => {
    const key = new URL(url, scriptUrl);
    if (revision) key.searchParams.set(REVISION_SEARCH_PARAM, revision);
    return key.href;
  });
}

/**
 * Counts the expected keys already cached. Keys from an older build that the
 * new worker has not cleaned up yet carry other revisions, so they do not count.
 */
export function measurePrecacheProgress(
  expectedKeys: readonly string[],
  cachedKeys: Iterable<string>,
): PrecacheProgress {
  const expected = new Set(expectedKeys);
  let done = 0;
  for (const key of new Set(cachedKeys)) {
    if (expected.has(key)) done++;
  }
  return { done, total: expected.size };
}
