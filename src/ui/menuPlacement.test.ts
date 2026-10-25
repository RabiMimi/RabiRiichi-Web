import { describe, expect, it } from 'vitest';
import { computeMenuPlacement, type AnchorRect } from './menuPlacement';

/** A landscape phone: the case the menus used to run off. */
const PHONE = { width: 740, height: 360 };
const OPTIONS = {
  width: 200,
  maxHeight: 224,
  minHeight: 120,
  align: 'start' as const,
  gap: 6,
  margin: 8,
};

function anchorAt(top: number, left = 100, height = 32, width = 200) {
  const rect: AnchorRect = {
    top,
    bottom: top + height,
    left,
    right: left + width,
  };
  return rect;
}

describe('computeMenuPlacement', () => {
  it('opens below the trigger when there is room', () => {
    const placement = computeMenuPlacement(anchorAt(40), PHONE, OPTIONS);
    expect(placement.top).toBe(78);
    expect(placement.bottom).toBeUndefined();
    expect(placement.maxHeight).toBe(224);
  });

  it('shrinks to the room below rather than running off-screen', () => {
    const placement = computeMenuPlacement(anchorAt(140), PHONE, OPTIONS);
    expect(placement.top).toBe(178);
    // 360 - 172 - 6 - 8: the menu ends at the margin and scrolls inside.
    expect(placement.maxHeight).toBe(174);
  });

  it('flips above a trigger near the bottom edge', () => {
    const placement = computeMenuPlacement(anchorAt(280), PHONE, OPTIONS);
    expect(placement.top).toBeUndefined();
    expect(placement.bottom).toBe(360 - 280 + 6);
    expect(placement.maxHeight).toBe(224);
  });

  it('stays below when above is no roomier', () => {
    const tiny = { width: 740, height: 140 };
    const placement = computeMenuPlacement(anchorAt(20), tiny, OPTIONS);
    expect(placement.top).toBe(58);
    expect(placement.maxHeight).toBe(140 - 52 - 6 - 8);
  });

  it('lines up with the trigger edge it is aligned to', () => {
    const start = computeMenuPlacement(anchorAt(40, 100), PHONE, OPTIONS);
    expect(start.left).toBe(100);
    const end = computeMenuPlacement(anchorAt(40, 100, 32, 300), PHONE, {
      ...OPTIONS,
      align: 'end',
    });
    expect(end.left + end.width).toBe(400);
    expect(end.right).toBe(740 - 400);
  });

  it('keeps the menu inside the viewport horizontally', () => {
    const nearRight = computeMenuPlacement(anchorAt(40, 650, 32, 80), PHONE, {
      ...OPTIONS,
      width: 160,
    });
    expect(nearRight.left + nearRight.width).toBe(740 - 8);
    const nearLeft = computeMenuPlacement(anchorAt(40, 0, 32, 60), PHONE, {
      ...OPTIONS,
      align: 'end',
    });
    expect(nearLeft.left).toBe(8);
  });

  it('never lays out wider than the viewport allows', () => {
    const placement = computeMenuPlacement(anchorAt(40, 0, 32, 900), PHONE, {
      ...OPTIONS,
      width: 900,
    });
    expect(placement.width).toBe(740 - 16);
    expect(placement.left).toBe(8);
  });
});
