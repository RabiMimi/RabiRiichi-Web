import { describe, expect, it } from 'vitest';
import {
  TAP_DEAD_ZONE_PX,
  hasLeftDeadZone,
  resolveDragGesture,
} from './discardGesture';

const THRESHOLD = 164;

describe('hasLeftDeadZone', () => {
  it('ignores the jitter a touch tap always carries', () => {
    expect(hasLeftDeadZone(0, 0)).toBe(false);
    expect(hasLeftDeadZone(2, 2)).toBe(false);
    expect(hasLeftDeadZone(0, TAP_DEAD_ZONE_PX)).toBe(false);
  });

  it('reports travel beyond the dead zone, in any direction', () => {
    expect(hasLeftDeadZone(0, TAP_DEAD_ZONE_PX + 1)).toBe(true);
    expect(hasLeftDeadZone(-40, 0)).toBe(true);
    expect(hasLeftDeadZone(30, 30)).toBe(true);
  });
});

describe('resolveDragGesture', () => {
  it('discards when the drag reaches the threshold', () => {
    expect(
      resolveDragGesture({
        upwardTravel: THRESHOLD,
        dragThreshold: THRESHOLD,
        movedBeyondDeadZone: true,
      }),
    ).toEqual({ shouldDiscard: true, shouldSuppressClick: true });
  });

  it('lets a jittery tap fall through to click-to-discard', () => {
    // Regression guard: any movement at all used to suppress the click, so a
    // tap on a touchscreen did nothing.
    expect(
      resolveDragGesture({
        upwardTravel: 3,
        dragThreshold: THRESHOLD,
        movedBeyondDeadZone: false,
      }),
    ).toEqual({ shouldDiscard: false, shouldSuppressClick: false });
  });

  it('swallows the click when a real drag is aborted short of the threshold', () => {
    expect(
      resolveDragGesture({
        upwardTravel: THRESHOLD - 1,
        dragThreshold: THRESHOLD,
        movedBeyondDeadZone: true,
      }),
    ).toEqual({ shouldDiscard: false, shouldSuppressClick: true });
  });

  it('does not discard on a downward drag', () => {
    expect(
      resolveDragGesture({
        upwardTravel: -50,
        dragThreshold: THRESHOLD,
        movedBeyondDeadZone: true,
      }),
    ).toEqual({ shouldDiscard: false, shouldSuppressClick: true });
  });

  it('scales with the threshold, so small tiles need a smaller drag', () => {
    const smallThreshold = 80;
    expect(
      resolveDragGesture({
        upwardTravel: 90,
        dragThreshold: smallThreshold,
        movedBeyondDeadZone: true,
      }).shouldDiscard,
    ).toBe(true);
    expect(
      resolveDragGesture({
        upwardTravel: 90,
        dragThreshold: THRESHOLD,
        movedBeyondDeadZone: true,
      }).shouldDiscard,
    ).toBe(false);
  });
});
