import { describe, expect, it } from 'vitest';
import {
  TAP_DEAD_ZONE_PX,
  hasLeftDeadZone,
  resolveDragGesture,
  resolveTileTap,
  TilePointerGesture,
  MAX_TILE_TAP_DURATION_MS,
  slotAdjustedOffset,
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

const start = (pointerType = 'touch', pointerId = 1) =>
  new TilePointerGesture({
    pointerId,
    pointerType,
    clientX: 100,
    clientY: 300,
    timeStamp: 1000,
  });
const point = (dx = 0, upwardTravel = 0, pointerId = 1, duration = 100) => ({
  pointerId,
  clientX: 100 + dx,
  clientY: 300 - upwardTravel,
  timeStamp: 1000 + duration,
});

describe('mobile tile gestures', () => {
  it('selects on the first tap and plays only on another tap of that tile', () => {
    let selectedId: number | null = null;
    const tap = (id: number) => {
      const gesture = start();
      gesture.move(point(2, 3));
      expect(gesture.release(point(3, 2), THRESHOLD)).toBe('tap');
      const action = resolveTileTap(
        gesture.pointerType,
        selectedId === id,
        true,
      );
      if (action === 'select') selectedId = id;
      return action;
    };

    expect(tap(10)).toBe('select');
    expect(tap(11)).toBe('select');
    expect(tap(11)).toBe('discard');
  });

  it('keeps mouse click-to-play and treats a pen like touch', () => {
    expect(resolveTileTap('mouse', false, true)).toBe('discard');
    expect(resolveTileTap('pen', false, true)).toBe('select');
    expect(resolveTileTap('pen', true, true)).toBe('discard');
  });

  it('cannot play an illegal tile, including while waiting or after riichi', () => {
    expect(resolveTileTap('touch', true, false)).toBe('select');
    expect(resolveTileTap('mouse', true, false)).toBe('select');
  });

  it('does not treat a stationary inspection as a tap on release', () => {
    const gesture = start();
    gesture.move(point(2, 1));
    // Even a previously selected tile must not play when its hold ends.
    expect(
      gesture.release(point(1, 2, 1, MAX_TILE_TAP_DURATION_MS + 1), THRESHOLD),
    ).toBe('none');
  });

  it('retains quick taps and mouse clicks regardless of inspection duration', () => {
    expect(
      start().release(point(0, 0, 1, MAX_TILE_TAP_DURATION_MS), THRESHOLD),
    ).toBe('tap');
    expect(start('mouse').release(point(0, 0, 1, 1000), THRESHOLD)).toBe('tap');
  });

  it('allows dragging an unselected tile and dragging after inspecting it', () => {
    const gesture = start();
    gesture.move(point(5, THRESHOLD, 1, 1000));
    expect(gesture.isDragging).toBe(true);
    expect(gesture.release(point(5, THRESHOLD, 1, 1100), THRESHOLD)).toBe(
      'discard',
    );
    expect(start().release(point(0, THRESHOLD), THRESHOLD)).toBe('discard');
  });

  it('tracks full travel to either side and below the starting point', () => {
    const gesture = start();
    gesture.move(point(-400, -250));
    expect(gesture.dx).toBe(-400);
    expect(gesture.upwardTravel).toBe(-250);
    expect(gesture.screenOffset).toEqual({ x: -400, y: 250 });
    gesture.move(point(600, -100));
    expect(gesture.dx).toBe(600);
    expect(gesture.upwardTravel).toBe(-100);
    expect(gesture.screenOffset).toEqual({ x: 600, y: 100 });
    expect(gesture.release(point(600, -100), THRESHOLD)).toBe('none');
  });

  it('returns a dragged tile when it is not your turn or the tile is illegal', () => {
    expect(start().release(point(0, THRESHOLD + 100), THRESHOLD, false)).toBe(
      'none',
    );
  });

  it('uses release-time legality even if the turn changed during the drag', () => {
    const nowLegal = start();
    nowLegal.move(point(100, THRESHOLD));
    expect(nowLegal.release(point(100, THRESHOLD), THRESHOLD, true)).toBe(
      'discard',
    );
    const noLongerLegal = start();
    noLongerLegal.move(point(100, THRESHOLD));
    expect(noLongerLegal.release(point(100, THRESHOLD), THRESHOLD, false)).toBe(
      'none',
    );
  });

  it('uses the release position when no final pointermove arrives', () => {
    const gesture = start();
    gesture.move(point(0, THRESHOLD - 1));
    expect(gesture.release(point(0, THRESHOLD), THRESHOLD)).toBe('discard');
  });

  it('never turns an aborted or horizontal drag into a tap', () => {
    const gesture = start();
    gesture.move(point(30, 0));
    // Returning to the start must not erase the fact that this was a drag.
    expect(gesture.release(point(), THRESHOLD)).toBe('none');
    expect(start().release(point(40, 0), THRESHOLD)).toBe('none');
    expect(start().release(point(0, -50), THRESHOLD)).toBe('none');
  });

  it('ignores movement and release from another finger', () => {
    const gesture = start();
    expect(gesture.move(point(0, THRESHOLD, 2))).toBe(false);
    expect(gesture.release(point(0, THRESHOLD, 2), THRESHOLD)).toBe('none');
    expect(gesture.isDragging).toBe(false);
    expect(gesture.release(point(), THRESHOLD)).toBe('tap');
  });

  it('cancels without playing and ignores late or duplicate releases', () => {
    const gesture = start();
    gesture.move(point(0, THRESHOLD));
    gesture.cancel();
    expect(gesture.move(point())).toBe(false);
    expect(gesture.release(point(0, THRESHOLD), THRESHOLD)).toBe('none');

    const completed = start();
    expect(completed.release(point(0, THRESHOLD), THRESHOLD)).toBe('discard');
    expect(completed.release(point(0, THRESHOLD), THRESHOLD)).toBe('none');
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

describe('slotAdjustedOffset', () => {
  it('passes the pointer offset through while the slot stays put', () => {
    expect(slotAdjustedOffset({ x: 30, y: -80 }, 400, 400)).toEqual({
      x: 30,
      y: -80,
    });
  });

  it('keeps the tile under the pointer when its slot moves', () => {
    // Picked up at 400; the row reflows and the slot now starts at 460. The
    // pointer is 30px right of where it pressed, i.e. at 430 + grab point.
    const offset = slotAdjustedOffset({ x: 30, y: -80 }, 400, 460);
    expect(460 + offset.x).toBe(400 + 30);
    expect(offset.y).toBe(-80);
  });
});
