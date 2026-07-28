/**
 * Fetch-and-decode warming for images the game paints in DOM `<img>` tags.
 *
 * Two distinct problems this solves, both of which show up as a visible glitch
 * rather than a slow load:
 *
 * 1. A never-fetched `<img>` paints nothing until its bytes arrive and decode.
 * 2. Worse, swapping `src` on an *already mounted* `<img>` keeps the OLD bitmap
 *    on screen for the whole fetch+decode window. Once a URL is in the
 *    browser's list of available images, the HTML standard's "update the image
 *    data" algorithm short-circuits and the swap is synchronous, so warming the
 *    URL up front is what makes such swaps glitch-free.
 */

/**
 * Keeps the warmed `Image` objects reachable. Dropping these lets the browser
 * garbage-collect the elements, which both aborts in-flight fetches and evicts
 * the entries from the list of available images — defeating the warm-up.
 */
const warmedImages = new Map<string, HTMLImageElement>();

const inFlight = new Map<string, Promise<void>>();

function canPreload(): boolean {
  return typeof window !== 'undefined' && typeof window.Image !== 'undefined';
}

/**
 * Warms and decodes `paths`, resolving once every one has settled.
 *
 * Idempotent per path: a URL already warmed (or being warmed) is never fetched
 * twice. Never rejects — an image that fails to load simply stays cold rather
 * than taking the caller down with it.
 */
export function preloadImages(paths: readonly string[]): Promise<void> {
  if (!canPreload()) {
    return Promise.resolve();
  }

  const pending = paths.map((path) => {
    const existing = inFlight.get(path);
    if (existing) {
      return existing;
    }

    const img = new window.Image();
    warmedImages.set(path, img);
    img.src = path;

    // decode() does the fetch AND the decode off the render path. Older engines
    // may lack it or reject for images that are not fully fetched yet, so fall
    // back to the load/error events.
    const ready =
      typeof img.decode === 'function'
        ? img.decode().catch(() => undefined)
        : new Promise<void>((resolve) => {
            img.onload = (): void => resolve();
            img.onerror = (): void => resolve();
          });

    const settled = ready.then(() => undefined);
    inFlight.set(path, settled);
    return settled;
  });

  return Promise.all(pending).then(() => undefined);
}

/** Resets the warm-up caches. Used strictly by unit tests to avoid pollution. */
export function _resetImagePreloadCache(): void {
  warmedImages.clear();
  inFlight.clear();
}
