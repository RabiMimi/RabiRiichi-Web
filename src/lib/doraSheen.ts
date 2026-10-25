/**
 * One timeline for every Dora sheen, so the 3D tiles (toon shader) and the DOM
 * hand sweep in lockstep instead of each running its own clock.
 *
 * The band travels along `u + v` of the tile face: 0 is the bottom-left
 * corner and 2 the top-right. It starts and ends a little off the face so the
 * sweep enters and leaves cleanly.
 */
export const DORA_SHEEN_PERIOD_MS = 1250;
/** Half-width of the band, in the same `u + v` units. */
export const DORA_SHEEN_WIDTH = 0.2;
/** Peak brightness added at the centre of the band. */
export const DORA_SHEEN_INTENSITY = 0.75;

const SHEEN_START = -0.7;
const SHEEN_TRAVEL = 2.5;

/** Band position at `nowMs` (a `performance.now()`-style timestamp). */
export function getDoraSheenProgress(nowMs: number): number {
  const elapsed =
    ((nowMs % DORA_SHEEN_PERIOD_MS) + DORA_SHEEN_PERIOD_MS) %
    DORA_SHEEN_PERIOD_MS;
  return SHEEN_START + (elapsed / DORA_SHEEN_PERIOD_MS) * SHEEN_TRAVEL;
}

/**
 * The same position as a stop on a `linear-gradient(to top right, …)`, whose
 * 0%..100% runs from the bottom-left to the top-right corner, i.e. `u + v`
 * from 0 to 2.
 */
export function toGradientPercent(progress: number): number {
  return progress * 50;
}
