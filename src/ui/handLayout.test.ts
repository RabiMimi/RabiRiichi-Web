import { describe, expect, it } from 'vitest';
import { computeHandLayout } from './handLayout';

const DESKTOP = { width: 1920, height: 1080 };
/** Roughly a phone held in landscape: wide, but very short. */
const LANDSCAPE_PHONE = { width: 844, height: 390 };
/** A laptop window that is wide but not tall. */
const SHORT_LAPTOP = { width: 1512, height: 672 };

const ALL_VIEWPORTS = [DESKTOP, LANDSCAPE_PHONE, SHORT_LAPTOP];
const FULL_HAND = 13;

function layoutFor(
  viewport: { width: number; height: number },
  freeTileCount = FULL_HAND,
) {
  return computeHandLayout(viewport.width, viewport.height, freeTileCount);
}

describe('computeHandLayout', () => {
  it('keeps tiles the same size however many are held', () => {
    // Regression guard: sizing used to divide the width budget by the current
    // tile count, so every call and discard visibly resized the whole hand.
    const full = layoutFor(DESKTOP, 13);
    for (const count of [13, 10, 7, 4, 1, 0]) {
      const layout = layoutFor(DESKTOP, count);
      expect(layout.tileWidth).toBe(full.tileWidth);
      expect(layout.tileHeight).toBe(full.tileHeight);
      expect(layout.rowHeight).toBe(full.rowHeight);
      expect(layout.dragThreshold).toBe(full.dragThreshold);
    }
  });

  it('shortens the row as tiles are called away, keeping it centred', () => {
    const full = layoutFor(DESKTOP, 13);
    const afterPon = layoutFor(DESKTOP, 10);
    // Same tile size, fewer tiles => narrower row, so it starts further right.
    expect(afterPon.leftOffset).toBeGreaterThan(full.leftOffset);
    expect(afterPon.pendingLeft).toBeLessThan(full.pendingLeft);
  });

  it('keeps the row within its share of viewport height', () => {
    // Regression guard: width used to be the only limit, so a wide-but-short
    // window still got a hand tall enough to crowd out the table.
    for (const viewport of ALL_VIEWPORTS) {
      expect(layoutFor(viewport).rowHeight).toBeLessThanOrEqual(
        viewport.height * 0.15,
      );
    }
  });

  it('keeps the whole hand within the viewport width', () => {
    for (const viewport of ALL_VIEWPORTS) {
      const layout = layoutFor(viewport);
      expect(layout.leftOffset).toBeGreaterThanOrEqual(0);
      expect(layout.pendingLeft + layout.tileWidth).toBeLessThanOrEqual(
        viewport.width,
      );
    }
  });

  it('never upscales past the intrinsic artwork size', () => {
    // However large the window, the artwork must not be blown up into blur.
    expect(computeHandLayout(5000, 4000, 5).tileWidth).toBeLessThanOrEqual(84);
  });

  it('caps the row width even on a big screen', () => {
    // A full hand at intrinsic size is a very wide bar; the row cap holds it in.
    expect(layoutFor(DESKTOP).tileWidth).toBeLessThan(84);
  });

  it('shrinks further on a landscape phone than on a desktop', () => {
    expect(layoutFor(LANDSCAPE_PHONE).tileWidth).toBeLessThan(
      layoutFor(DESKTOP).tileWidth,
    );
  });

  it('keeps the artwork aspect ratio at every size', () => {
    for (const viewport of ALL_VIEWPORTS) {
      const layout = layoutFor(viewport);
      expect(layout.tileHeight).toBe(Math.round((109 * layout.tileWidth) / 84));
      expect(layout.rowHeight).toBe(layout.tileHeight + layout.bevelHeight);
    }
  });

  it('centres the hand, reserving the pending tile slot', () => {
    const layout = layoutFor(DESKTOP);
    const rightGap = DESKTOP.width - (layout.pendingLeft + layout.tileWidth);
    expect(Math.abs(rightGap - layout.leftOffset)).toBeLessThanOrEqual(1);
  });

  it('places the pending tile after the free tiles and their gaps', () => {
    const layout = layoutFor(DESKTOP);
    const expected =
      layout.leftOffset +
      FULL_HAND * layout.tileWidth +
      (FULL_HAND - 1) * 2 +
      12;
    expect(layout.pendingLeft).toBe(expected);
  });

  it('scales the discard drag threshold with the tile height', () => {
    const desktop = layoutFor(DESKTOP);
    const phone = layoutFor(LANDSCAPE_PHONE);
    expect(desktop.dragThreshold).toBeGreaterThan(0);
    // A smaller tile must not demand a full-size drag.
    expect(phone.dragThreshold).toBeLessThan(desktop.dragThreshold);
  });

  it('handles an empty hand without dividing by zero', () => {
    const layout = layoutFor(DESKTOP, 0);
    expect(Number.isFinite(layout.tileWidth)).toBe(true);
    expect(layout.tileWidth).toBeGreaterThan(0);
    expect(layout.pendingLeft).toBe(layout.leftOffset + 12);
  });

  it('never collapses tiles to zero width on a tiny viewport', () => {
    expect(
      computeHandLayout(200, 120, FULL_HAND).tileWidth,
    ).toBeGreaterThanOrEqual(1);
  });
});
