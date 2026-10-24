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
/** A stationary inspection is not a tap, but its info appears immediately. */
export const MAX_TILE_TAP_DURATION_MS = 300;

export type TileTapAction = 'select' | 'discard';

/** Touch selects first; mouse and keyboard retain single-click play. */
export function resolveTileTap(
  pointerType: string,
  isSelected: boolean,
  isPlayable: boolean,
): TileTapAction {
  return isPlayable && (pointerType === 'mouse' || isSelected)
    ? 'discard'
    : 'select';
}

export interface TilePointerPosition {
  pointerId: number;
  clientX: number;
  clientY: number;
  timeStamp: number;
}

export type TileGestureOutcome = 'tap' | 'discard' | 'none';

/** One pointer owns a press, including its hold and any subsequent drag. */
export class TilePointerGesture {
  readonly pointerId: number;
  readonly pointerType: string;
  private readonly startX: number;
  private readonly startY: number;
  private readonly startTime: number;
  private movedBeyondDeadZone = false;
  private ended = false;
  dx = 0;
  upwardTravel = 0;

  constructor(start: TilePointerPosition & { pointerType: string }) {
    this.pointerId = start.pointerId;
    this.pointerType = start.pointerType;
    this.startX = start.clientX;
    this.startY = start.clientY;
    this.startTime = start.timeStamp;
  }

  get isDragging(): boolean {
    return this.movedBeyondDeadZone;
  }

  get screenOffset(): { x: number; y: number } {
    return { x: this.dx, y: -this.upwardTravel };
  }

  move(position: TilePointerPosition): boolean {
    if (this.ended || position.pointerId !== this.pointerId) return false;
    this.dx = position.clientX - this.startX;
    this.upwardTravel = this.startY - position.clientY;
    this.movedBeyondDeadZone ||= hasLeftDeadZone(this.dx, this.upwardTravel);
    return true;
  }

  release(
    position: TilePointerPosition,
    threshold: number,
    canDiscard = true,
  ): TileGestureOutcome {
    // Include release coordinates even when the browser sent no final move.
    if (!this.move(position)) return 'none';
    this.ended = true;
    if (this.movedBeyondDeadZone) {
      return resolveDragGesture({
        upwardTravel: this.upwardTravel,
        dragThreshold: threshold,
        movedBeyondDeadZone: true,
        canDiscard,
      }).shouldDiscard
        ? 'discard'
        : 'none';
    }
    const isInspection =
      this.pointerType !== 'mouse' &&
      position.timeStamp - this.startTime > MAX_TILE_TAP_DURATION_MS;
    return isInspection ? 'none' : 'tap';
  }

  cancel(): void {
    this.ended = true;
  }
}

export interface DragGestureState {
  /** Upward travel (px) at the moment the pointer was released. */
  upwardTravel: number;
  /** Upward travel needed to commit a discard. */
  dragThreshold: number;
  /** Whether the pointer ever travelled beyond {@link TAP_DEAD_ZONE_PX}. */
  movedBeyondDeadZone: boolean;
  /** Whether the current prompt accepts the tile at release. */
  canDiscard?: boolean;
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
  const shouldDiscard =
    state.canDiscard !== false && state.upwardTravel >= state.dragThreshold;
  return {
    shouldDiscard,
    shouldSuppressClick: shouldDiscard || state.movedBeyondDeadZone,
  };
}
