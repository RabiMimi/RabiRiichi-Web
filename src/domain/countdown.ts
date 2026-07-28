/**
 * Turn-clock arithmetic, derived from a deadline rather than accumulated ticks.
 *
 * Counting down by subtracting a fixed step each interval assumes the interval
 * fires on time, and it does not: timers run late under load, and browsers
 * clamp them to a second or more — or suspend them outright — in a background
 * tab. The clock then reads high while the server's has already expired, so the
 * player sees time they do not have. Reading the wall clock each tick makes any
 * late or skipped tick self-correcting.
 */

/** Seconds left, to a tenth, never negative. */
export function remainingSeconds(deadlineMs: number, nowMs: number): number {
  return Math.max(0, Math.round((deadlineMs - nowMs) / 100) / 10);
}

/** The figure actually shown, which is the whole second being counted through. */
export function displayedSeconds(remaining: number): number {
  return Math.ceil(remaining);
}

/** Whether the on-screen figure changed, i.e. whether a repaint is warranted. */
export function displayedSecondChanged(
  previous: number,
  next: number,
): boolean {
  return displayedSeconds(previous) !== displayedSeconds(next);
}

/**
 * Whether the urgency cue should sound on this tick.
 *
 * Once per displayed second inside the final stretch, so a tick that skips
 * several seconds — a tab returning to the foreground — still only sounds once
 * rather than firing a burst for each second it missed.
 */
export function shouldSoundUrgency(
  previous: number,
  next: number,
  thresholdSeconds = 5,
): boolean {
  return (
    next > 0 &&
    displayedSeconds(next) <= thresholdSeconds &&
    displayedSecondChanged(previous, next)
  );
}

/** Monotonic where available, so a system clock change cannot skew the turn. */
export function monotonicNow(): number {
  return typeof performance !== 'undefined' &&
    typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}
