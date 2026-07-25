import React, { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TILE_MODEL_PATH } from './assets';
import {
  getRegisteredTileOutlines,
  isEffectivelyVisible,
} from './tileOutlineRegistry';

/** How much larger than the tile the hull is drawn. */
const OUTLINE_SCALE = 1.05;

/**
 * Upper bound on simultaneously outlined tiles. A four-player hand holds at most
 * 3 x 14 concealed tiles plus melds, and four rivers hold 4 x ~24 — 256 leaves
 * plenty of headroom, and an unused instance costs only its matrix slot.
 */
const MAX_OUTLINED_TILES = 256;

/** Shared by every hull; see tileOutlineRegistry for why this is one object. */
const OUTLINE_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#111111',
  side: THREE.BackSide,
  depthTest: true,
  transparent: true,
  opacity: 0.73,
});

/**
 * The tile model's geometry, with its material groups stripped.
 *
 * The hull is a flat silhouette, so it needs only one material; leaving the
 * groups in place would split it back into one draw call per material and
 * defeat the point of instancing.
 */
function findHullGeometry(scene: THREE.Object3D): THREE.BufferGeometry | null {
  const source = scene.getObjectByProperty('type', 'Mesh');
  if (!(source instanceof THREE.Mesh)) return null;

  const geometry = (source.geometry as THREE.BufferGeometry).clone();
  geometry.clearGroups();
  return geometry;
}

/**
 * Draws every tile's toon outline in a single instanced draw call.
 *
 * Mount once, inside the table scene. Tiles opt in by registering themselves
 * (see `useTileOutline`); this component only mirrors their world transforms.
 */
export function TileOutlineLayer(): React.JSX.Element | null {
  const { scene } = useGLTF(TILE_MODEL_PATH);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Matrix4(), []);
  const hullScale = useMemo(
    () =>
      new THREE.Matrix4().makeScale(
        OUTLINE_SCALE,
        OUTLINE_SCALE,
        OUTLINE_SCALE,
      ),
    [],
  );

  const geometry = useMemo(() => findHullGeometry(scene), [scene]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    let count = 0;
    for (const node of getRegisteredTileOutlines()) {
      if (count >= MAX_OUTLINED_TILES) break;
      if (!isEffectivelyVisible(node)) continue;

      // The tile may have moved this frame (deal/discard animations), and the
      // hull is not parented to it, so recompute rather than trust the cache.
      node.updateWorldMatrix(true, false);
      scratch.multiplyMatrices(node.matrixWorld, hullScale);
      mesh.setMatrixAt(count, scratch);
      count += 1;
    }

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!geometry) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, OUTLINE_MATERIAL, MAX_OUTLINED_TILES]}
      // Instances are placed from world matrices, so the mesh itself must not
      // inherit a parent transform, and its bounds cannot be precomputed.
      matrixAutoUpdate={false}
      frustumCulled={false}
    />
  );
}
