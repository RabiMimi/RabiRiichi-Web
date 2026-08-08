/**
 * Build-time check that the precache manifest is something workbox will accept.
 *
 * Build-time because the failure mode is invisible at runtime. Workbox rejects
 * the whole manifest if one URL appears twice with different revisions, and the
 * generated worker runs that call inside an async `define()` callback, so the
 * rejection surfaces as an unhandled rejection rather than a failed install:
 * the worker reports itself activated, DevTools shows it green, and it caches
 * nothing at all. That shipped once already, from `includeAssets` re-adding
 * every file the glob had already matched.
 */

export interface PrecacheEntry {
  url: string;
  revision?: string | null;
}

export interface PrecacheConflict {
  url: string;
  revisions: string[];
}

/**
 * Finds URLs listed more than once under different revisions.
 *
 * An exact repeat is fine — workbox collapses identical entries — so only
 * differing revisions count, which is precisely what it refuses.
 */
export function findPrecacheConflicts(
  entries: readonly PrecacheEntry[],
): PrecacheConflict[] {
  const revisionsByUrl = new Map<string, Set<string>>();

  for (const entry of entries) {
    const seen = revisionsByUrl.get(entry.url) ?? new Set<string>();
    seen.add(String(entry.revision ?? null));
    revisionsByUrl.set(entry.url, seen);
  }

  return [...revisionsByUrl]
    .filter(([, revisions]) => revisions.size > 1)
    .map(([url, revisions]) => ({ url, revisions: [...revisions].sort() }));
}

/** Formats conflicts for a build failure, naming the usual cause. */
export function formatPrecacheConflicts(
  conflicts: readonly PrecacheConflict[],
): string {
  const sample = conflicts
    .slice(0, 5)
    .map((c) => `  ${c.url} -> ${c.revisions.join(' | ')}`)
    .join('\n');
  const more =
    conflicts.length > 5 ? `\n  ...and ${conflicts.length - 5} more` : '';

  return (
    `${conflicts.length} URL(s) are in the precache manifest twice with ` +
    `different revisions, which workbox rejects at runtime (it would leave ` +
    `the service worker activated but caching nothing):\n${sample}${more}\n` +
    `Usually this means a file is matched by both workbox.globPatterns and ` +
    `includeAssets. Everything in public/ is copied into the build output, so ` +
    `the glob already covers it.`
  );
}

/** Throws if the manifest would be rejected. Returns it unchanged otherwise. */
export function assertNoPrecacheConflicts<T extends PrecacheEntry>(
  entries: readonly T[],
): readonly T[] {
  const conflicts = findPrecacheConflicts(entries);
  if (conflicts.length > 0) {
    throw new Error(formatPrecacheConflicts(conflicts));
  }
  return entries;
}

/**
 * Reads the precache list back out of a generated `sw.js`.
 *
 * The emitted worker is checked rather than the manifest workbox hands to
 * `manifestTransforms`, because those run *second-to-last*: workbox appends
 * `additionalManifestEntries` afterwards (see workbox-build's
 * transform-manifest), so a transform never sees them — and those entries are
 * exactly what collided last time. Only the artifact tells the whole truth.
 */
export function extractPrecacheEntries(swSource: string): PrecacheEntry[] {
  const call = swSource.indexOf('precacheAndRoute(');
  if (call === -1) return [];

  const start = swSource.indexOf('[', call);
  if (start === -1) return [];

  let depth = 0;
  let end = -1;
  for (let i = start; i < swSource.length; i++) {
    const ch = swSource[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return [];

  const body = swSource.slice(start, end + 1);
  const entries: PrecacheEntry[] = [];
  // Entries are flat object literals, so a non-greedy brace match is enough.
  for (const [literal] of body.matchAll(/\{[^{}]*\}/g)) {
    const url = /url\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(literal);
    if (!url?.[1]) continue;
    const revision = /revision\s*:\s*(null|"((?:[^"\\]|\\.)*)")/.exec(literal);
    entries.push({
      url: url[1],
      revision:
        !revision || revision[1] === 'null' ? null : (revision[2] ?? null),
    });
  }
  return entries;
}
