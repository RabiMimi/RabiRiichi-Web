import * as THREE from 'three';

export type TileArea = 'hand' | 'river' | 'meld' | 'wall' | 'ui';

interface LastKnownPose {
  worldPosition: THREE.Vector3;
  worldQuaternion: THREE.Quaternion;
  timestamp: number;
  area: TileArea;
}

const poseRegistry = new Map<number, LastKnownPose>();

// Max age for a cached pose to be considered valid (ms)
const POSE_MAX_AGE_MS = 2000;

/**
 * Saves the current world position and rotation of a tile.
 */
export function saveTilePose(
  traceId: number,
  worldPosition: THREE.Vector3,
  worldQuaternion: THREE.Quaternion,
  area: TileArea,
): void {
  let entry = poseRegistry.get(traceId);
  if (!entry) {
    entry = {
      worldPosition: new THREE.Vector3(),
      worldQuaternion: new THREE.Quaternion(),
      timestamp: 0,
      area,
    };
    poseRegistry.set(traceId, entry);
  }
  entry.worldPosition.copy(worldPosition);
  entry.worldQuaternion.copy(worldQuaternion);
  entry.area = area;
  entry.timestamp = Date.now();
}

/**
 * Retrieves and clears the saved world pose for a tile if it is not stale.
 */
export function getAndClearTilePose(
  traceId: number,
): LastKnownPose | undefined {
  const entry = poseRegistry.get(traceId);
  if (!entry) return undefined;

  const age = Date.now() - entry.timestamp;
  poseRegistry.delete(traceId);

  if (age > POSE_MAX_AGE_MS) {
    return undefined;
  }

  return entry;
}

/**
 * Resets the registry cache (useful for tests).
 */
export function _resetPoseRegistry(): void {
  poseRegistry.clear();
}
