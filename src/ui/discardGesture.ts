/**
 * Pure decision logic for the drag-up-to-discard gesture on the local hand.
 *
 * Split out of the React hook so the tap-vs-drag rules can be unit tested; they
 * are easy to get subtly wrong on touch devices, where a "tap" always carries a
 * few pixels of jitter.
 */

/**
 * Pointer travel (px) tolerated before a press counts as a drag rather than a
 * tap. Without this dead zone a plain tap would be classified as a drag and
 * silently swallowed instead of discarding.
 */
export const TAP_DEAD_ZONE_PX = 10;

export interface DragGestureState {
  /** Upward travel (px) at the moment the pointer was released. */
  upwardTravel: number;
  /** Upward travel needed to commit a discard. */
  dragThreshold: number;
  /** Whether the pointer ever travelled beyond {@link TAP_DEAD_ZONE_PX}. */
  movedBeyondDeadZone: boolean;
}

export interface DragGestureOutcome {
  /** Release the tile: the drag reached the discard threshold. */
  shouldDiscard: boolean;
  /**
   * Swallow the click event that the browser fires after the pointer sequence.
   * A completed drag already acted; an aborted drag must not fall through to
   * click-to-discard.
   */
  shouldSuppressClick: boolean;
}

/** Returns true once the pointer has travelled far enough to count as a drag. */
export function hasLeftDeadZone(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) > TAP_DEAD_ZONE_PX;
}

/** Decides what a finished pointer gesture means. */
export function resolveDragGesture(
  state: DragGestureState,
): DragGestureOutcome {
  const shouldDiscard = state.upwardTravel >= state.dragThreshold;
  return {
    shouldDiscard,
    shouldSuppressClick: shouldDiscard || state.movedBeyondDeadZone,
  };
}
