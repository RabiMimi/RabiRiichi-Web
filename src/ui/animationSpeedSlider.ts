/**
 * Discrete animation-speed multipliers offered by the settings slider.
 *
 * The slider is index-based rather than a linear `min`/`max` range so the
 * fast-forward steps (4x/8x, mainly useful when watching a replay) stay
 * reachable without giving up the fine-grained slow end.
 */
export const ANIMATION_SPEEDS = [0.25, 0.5, 1, 2, 4, 8] as const;

/** Maps a stored speed multiplier to the closest slider index. */
export function speedToSliderIndex(speed: number): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  ANIMATION_SPEEDS.forEach((candidate, index) => {
    const distance = Math.abs(candidate - speed);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

/** Maps a slider index back to its speed multiplier, clamped to the range. */
export function sliderIndexToSpeed(index: number): number {
  const clamped = Math.min(
    Math.max(Math.round(index), 0),
    ANIMATION_SPEEDS.length - 1,
  );
  // The clamp above guarantees an in-range index.
  return ANIMATION_SPEEDS[clamped] ?? 1;
}
