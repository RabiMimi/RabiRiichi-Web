import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  saveTilePose,
  getAndClearTilePose,
  _resetPoseRegistry,
} from './tileTransitionRegistry';

describe('tileTransitionRegistry', () => {
  beforeEach(() => {
    _resetPoseRegistry();
  });

  it('should save and retrieve tile poses correctly', () => {
    const pos = new THREE.Vector3(1, 2, 3);
    const rot = new THREE.Quaternion(0, 0, 0, 1);

    saveTilePose(42, pos, rot, 'hand');

    const retrieved = getAndClearTilePose(42);
    expect(retrieved).toBeDefined();
    expect(retrieved!.worldPosition.x).toBe(1);
    expect(retrieved!.worldPosition.y).toBe(2);
    expect(retrieved!.worldPosition.z).toBe(3);
    expect(retrieved!.worldQuaternion.w).toBe(1);
    expect(retrieved!.area).toBe('hand');
  });

  it('copies the pose rather than aliasing the caller’s vectors', () => {
    // Tile3D and LocalHandPose both reuse one scratch Vector3 for every tile
    // they report in a frame. Storing the reference would give each tile the
    // last one's pose, so a whole hand would fly in from the same slot.
    const scratch = new THREE.Vector3(1, 2, 3);
    const rot = new THREE.Quaternion(0, 0, 0, 1);

    saveTilePose(1, scratch, rot, 'hand');
    scratch.set(9, 9, 9);
    saveTilePose(2, scratch, rot, 'hand');

    expect(getAndClearTilePose(1)!.worldPosition.toArray()).toEqual([1, 2, 3]);
    expect(getAndClearTilePose(2)!.worldPosition.toArray()).toEqual([9, 9, 9]);
  });

  it('should clear pose after retrieval', () => {
    const pos = new THREE.Vector3(1, 2, 3);
    const rot = new THREE.Quaternion(0, 0, 0, 1);

    saveTilePose(42, pos, rot, 'hand');

    expect(getAndClearTilePose(42)).toBeDefined();
    expect(getAndClearTilePose(42)).toBeUndefined(); // should be cleared
  });

  it('should ignore stale poses older than POSE_MAX_AGE_MS (2 seconds)', () => {
    const pos = new THREE.Vector3(1, 2, 3);
    const rot = new THREE.Quaternion(0, 0, 0, 1);

    saveTilePose(42, pos, rot, 'hand');

    // Mock date.now or use real delay since it is 2 seconds
    // Let's just mock Date.now if possible, or wait.
    // To make tests fast, we can mock Date.now.
    const originalNow = Date.now;
    try {
      let mockTime = Date.now();
      Date.now = () => mockTime;

      saveTilePose(42, pos, rot, 'hand');

      // Advance time by 2.1 seconds
      mockTime += 2100;

      expect(getAndClearTilePose(42)).toBeUndefined(); // should be stale
    } finally {
      Date.now = originalNow;
    }
  });
});
