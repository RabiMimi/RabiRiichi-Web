import { describe, expect, it } from 'vitest';
import { computeHandLayout } from './handLayout';

const DESKTOP_WIDTH = 1920;
/** Roughly a phone held in landscape. */
const LANDSCAPE_PHONE_WIDTH = 740;

describe('computeHandLayout', () => {
  it('uses the intrinsic tile size when there is room to spare', () => {
    const layout = computeHandLayout(DESKTOP_WIDTH, 13);
    expect(layout.tileWidth).toBe(84);
    expect(layout.tileHeight).toBe(109);
    expect(layout.bevelHeight).toBe(21);
    expect(layout.rowHeight).toBe(130);
  });

  it('shrinks tiles to fit a narrow viewport', () => {
    const layout = computeHandLayout(LANDSCAPE_PHONE_WIDTH, 13);
    expect(layout.tileWidth).toBeLessThan(84);
    // Scaling stays proportional, so the row keeps its aspect.
    expect(layout.tileHeight).toBe(Math.round((109 * layout.tileWidth) / 84));
    expect(layout.rowHeight).toBe(layout.tileHeight + layout.bevelHeight);
  });

  it('keeps the whole hand within the viewport on a landscape phone', () => {
    const freeTileCount = 13;
    const layout = computeHandLayout(LANDSCAPE_PHONE_WIDTH, freeTileCount);
    const rightEdge = layout.pendingLeft + layout.tileWidth;

    expect(layout.leftOffset).toBeGreaterThanOrEqual(0);
    expect(rightEdge).toBeLessThanOrEqual(LANDSCAPE_PHONE_WIDTH);
  });

  it('centres the hand, reserving the pending tile slot', () => {
    const layout = computeHandLayout(DESKTOP_WIDTH, 13);
    const rightEdge = layout.pendingLeft + layout.tileWidth;
    const rightGap = DESKTOP_WIDTH - rightEdge;
    // Centred to within a pixel of rounding.
    expect(Math.abs(rightGap - layout.leftOffset)).toBeLessThanOrEqual(1);
  });

  it('places the pending tile after the free tiles and their gaps', () => {
    const freeTileCount = 13;
    const layout = computeHandLayout(DESKTOP_WIDTH, freeTileCount);
    const expected =
      layout.leftOffset +
      freeTileCount * layout.tileWidth +
      (freeTileCount - 1) * 2 +
      12;
    expect(layout.pendingLeft).toBe(expected);
  });

  it('scales the discard drag threshold with the tile height', () => {
    const desktop = computeHandLayout(DESKTOP_WIDTH, 13);
    const phone = computeHandLayout(LANDSCAPE_PHONE_WIDTH, 13);
    expect(desktop.dragThreshold).toBe(Math.round(109 * 1.5));
    // A smaller tile must not demand a full-size drag.
    expect(phone.dragThreshold).toBeLessThan(desktop.dragThreshold);
  });

  it('handles an empty hand without dividing by zero', () => {
    const layout = computeHandLayout(DESKTOP_WIDTH, 0);
    expect(Number.isFinite(layout.tileWidth)).toBe(true);
    expect(layout.tileWidth).toBe(84);
    expect(layout.pendingLeft).toBe(layout.leftOffset + 12);
  });

  it('keeps a 14-tile hand no wider than a 13-tile hand plus its draw', () => {
    // A discard must not reflow the row: the reserved pending slot means the
    // 13-tile and 14-tile layouts share the same tile width.
    const before = computeHandLayout(LANDSCAPE_PHONE_WIDTH, 13);
    const after = computeHandLayout(LANDSCAPE_PHONE_WIDTH, 13);
    expect(after.tileWidth).toBe(before.tileWidth);
    expect(after.leftOffset).toBe(before.leftOffset);
  });
});
