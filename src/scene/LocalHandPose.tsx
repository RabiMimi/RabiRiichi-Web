import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { IGameTileMsg } from '../proto';
import { getHandTileX, getPendingTileX, getSafeTraceId } from './assets';
import { saveTilePose } from './tileTransitionRegistry';

/**
 * Where a 'hand' tile stands, mirroring Tile3D's own pose for that state:
 * tilted back to face the camera, and lifted clear of the table.
 */
const HAND_ROTATION: readonly [number, number, number] = [-0.9, Math.PI, 0];
const HAND_Y = 0.13;

const tempPosition = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();

interface LocalHandPoseProps {
  tiles: IGameTileMsg[];
  pendingTile: IGameTileMsg | null;
  shiftX?: number;
}

/**
 * Reports where the local player's hand tiles *would* stand in 3D, without
 * drawing them.
 *
 * Tile3D animates a tile from wherever it last was into its new slot, reading
 * that from a traceId-keyed pose registry which only Tile3D itself writes to.
 * The local hand is DOM (`HandDisplay`), so nothing ever recorded a pose for it
 * and a discard the player made snapped into the river while every opponent's
 * flew. Standing empty groups in the slots `Hand3D` would have used, and
 * publishing their world poses, makes the existing transition fire unchanged —
 * for calls and nuki-dora too, which broke the same way.
 *
 * The groups render nothing, so this costs a matrix update per tile per frame.
 * It has to run every frame rather than on hand changes: poses older than a
 * couple of seconds are discarded as stale, and a player may think for longer.
 */
export function LocalHandPose({
  tiles,
  pendingTile,
  shiftX = 0,
}: LocalHandPoseProps): React.JSX.Element {
  const rootRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const root = rootRef.current;
    if (!root) return;
    root.updateMatrixWorld(true);

    for (const slot of root.children) {
      const traceId = slot.userData.traceId as number | undefined;
      if (traceId === undefined) continue;
      slot.getWorldPosition(tempPosition);
      slot.getWorldQuaternion(tempQuaternion);
      saveTilePose(traceId, tempPosition, tempQuaternion, 'hand');
    }
  });

  const slots: { traceId: number; x: number }[] = [];
  tiles.forEach((tileMsg, idx) => {
    const traceId = getSafeTraceId(tileMsg.traceId);
    if (traceId !== undefined) {
      slots.push({ traceId, x: getHandTileX(idx, tiles.length) });
    }
  });
  const pendingTraceId = pendingTile
    ? getSafeTraceId(pendingTile.traceId)
    : undefined;
  if (pendingTraceId !== undefined) {
    slots.push({ traceId: pendingTraceId, x: getPendingTileX(tiles.length) });
  }

  return (
    <group ref={rootRef} position={[shiftX, 0, 0]}>
      {slots.map(({ traceId, x }) => (
        <group
          key={traceId}
          position={[x, HAND_Y, 0]}
          rotation={[...HAND_ROTATION]}
          userData={{ traceId }}
        />
      ))}
    </group>
  );
}
