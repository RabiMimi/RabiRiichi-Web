import { describe, expect, it } from 'vitest';
import {
  CAMERA_FOV_DEG,
  LOCAL_HAND_WORLD_POS,
  TILE_WORLD_SIZE,
  getDefaultCameraPose,
  getPixelsPerWorldUnit,
} from './cameraPose';

const WIDE = 1920 / 1080;

describe('getDefaultCameraPose', () => {
  it('uses the plain default pose at 16:9 and wider', () => {
    for (const aspect of [WIDE, 2.0, 3.5]) {
      const { position, target } = getDefaultCameraPose(aspect);
      expect(position).toEqual([0, 3, 3.4]);
      expect(target[0]).toBe(0);
      expect(target[1]).toBe(0);
      expect(target[2]).toBeCloseTo(0.59, 6);
    }
  });

  it('pulls the camera up and back as the window narrows', () => {
    const wide = getDefaultCameraPose(WIDE);
    const narrow = getDefaultCameraPose(1.2);
    expect(narrow.position[1]).toBeGreaterThan(wide.position[1]);
    expect(narrow.position[2]).toBeGreaterThan(wide.position[2]);
    // ...and swings the look-at further from the near edge to keep the table in.
    expect(narrow.target[2]).toBeLessThan(wide.target[2]);
  });
});

describe('getPixelsPerWorldUnit', () => {
  it('scales linearly with viewport height at a fixed aspect', () => {
    // Doubling both dimensions doubles the pixels a world unit covers.
    const small = getPixelsPerWorldUnit(1600, 900, LOCAL_HAND_WORLD_POS);
    const large = getPixelsPerWorldUnit(3200, 1800, LOCAL_HAND_WORLD_POS);
    expect(large / small).toBeCloseTo(2, 6);
  });

  it('matches the perspective divide at the hand row', () => {
    const height = 900;
    const { position, target } = getDefaultCameraPose(1600 / height);
    const forward: [number, number, number] = [
      target[0] - position[0],
      target[1] - position[1],
      target[2] - position[2],
    ];
    const len = Math.hypot(forward[0], forward[1], forward[2]);
    const depth =
      ((LOCAL_HAND_WORLD_POS[0] - position[0]) * forward[0] +
        (LOCAL_HAND_WORLD_POS[1] - position[1]) * forward[1] +
        (LOCAL_HAND_WORLD_POS[2] - position[2]) * forward[2]) /
      len;
    const expected =
      height / (2 * Math.tan((CAMERA_FOV_DEG * Math.PI) / 360) * depth);

    expect(
      getPixelsPerWorldUnit(1600, height, LOCAL_HAND_WORLD_POS),
    ).toBeCloseTo(expected, 6);
  });

  it('puts a hand tile at a plausible on-screen size', () => {
    // Sanity anchor measured against the running client at 1600x900.
    const px = getPixelsPerWorldUnit(1600, 900, LOCAL_HAND_WORLD_POS);
    expect(TILE_WORLD_SIZE.width * px).toBeCloseTo(59.6, 1);
    expect(TILE_WORLD_SIZE.height * px).toBeCloseTo(79.5, 1);
  });

  it('shrinks a tile when the camera retreats for a narrow window', () => {
    const wide = getPixelsPerWorldUnit(1920, 1080, LOCAL_HAND_WORLD_POS);
    const narrow = getPixelsPerWorldUnit(1296, 1080, LOCAL_HAND_WORLD_POS);
    expect(narrow).toBeLessThan(wide);
  });

  it('returns zero rather than a non-finite size for a degenerate viewport', () => {
    expect(getPixelsPerWorldUnit(0, 0, LOCAL_HAND_WORLD_POS)).toBe(0);
    expect(getPixelsPerWorldUnit(100, 0, LOCAL_HAND_WORLD_POS)).toBe(0);
  });

  it('returns zero for a point behind the camera', () => {
    expect(getPixelsPerWorldUnit(1600, 900, [0, 0, 100])).toBe(0);
  });
});
