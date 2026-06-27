import React, { useMemo, useRef, useEffect } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { TILE_MODEL_PATH, getTileTexturePath } from './assets';

export type TileDisplayState = 'hand' | 'face' | 'back' | 'sideways';

function createMappedMaterial(
  mat: THREE.Material,
  texture: THREE.Texture,
): THREE.Material {
  const matName = mat.name;
  if (matName === 'Front.001') {
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.15,
      metalness: 0.05,
    });
  } else if (matName === 'Back.001') {
    return new THREE.MeshStandardMaterial({
      color: '#136a3e', // Rich green
      roughness: 0.25,
      metalness: 0.05,
    });
  } else if (matName === 'Side.001') {
    return new THREE.MeshStandardMaterial({
      color: '#f7f4eb', // Ivory/Bone white
      roughness: 0.35,
      metalness: 0.02,
    });
  }
  return mat;
}

interface Tile3DProps {
  tile: string | null; // e.g. '1m', 'r5s', 'back', or null for back
  displayState?: TileDisplayState;
  position?: [number, number, number];
  onClick?: () => void;
}

export function Tile3D({
  tile,
  displayState = 'face',
  position = [0, 0, 0],
  onClick,
}: Tile3DProps): React.JSX.Element {
  // Load the shared GLTF model (cached by drei)
  const { scene } = useGLTF(TILE_MODEL_PATH);

  // Load the face texture for this specific tile
  const texturePath = getTileTexturePath(tile);
  const texture = useTexture(texturePath);

  // Clone the texture and configure it.
  // This avoids mutating the raw hook return value which violates strict react-hooks rules.
  const clonedTexture = useMemo(() => {
    const tex = texture.clone();
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }, [texture]);

  // Clone the scene graph so this tile has its own material instances
  const clone = useMemo(() => scene.clone(), [scene]);

  // Apply materials to the cloned meshes
  useMemo(() => {
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const childMat = child.material as THREE.Material | THREE.Material[];
        if (Array.isArray(childMat)) {
          child.material = childMat.map((mat) =>
            createMappedMaterial(mat, clonedTexture),
          );
        } else {
          child.material = createMappedMaterial(childMat, clonedTexture);
        }

        // Enable shadows
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [clone, clonedTexture]);

  // Determine rotation and Y-offset based on the display state
  const { rotation, yOffset } = useMemo(() => {
    let rot: [number, number, number] = [0, 0, 0];
    let yOff = 0;

    // Dimensions of the tile after scale is applied:
    // Scale is [0.18, 0.24, 0.14]
    // Height upright: 0.24. Bottom is at y = -0.12, so yOff = 0.12
    // Height flat: 0.14. Bottom is at y = -0.07, so yOff = 0.07
    switch (displayState) {
      case 'hand':
        // Upright in hand, facing the player (rotated 180 around Y)
        // and tilted slightly back (e.g. -12 degrees = -0.2 rad) for visibility
        rot = [-0.2, Math.PI, 0];
        yOff = 0.12;
        break;
      case 'face':
        // Lying flat on the table, face up
        rot = [-Math.PI / 2, 0, 0];
        yOff = 0.07;
        break;
      case 'back':
        // Lying flat on the table, face down
        rot = [Math.PI / 2, 0, 0];
        yOff = 0.07;
        break;
      case 'sideways':
        // Lying flat, face up, rotated 90 degrees CCW
        rot = [-Math.PI / 2, -Math.PI / 2, 0];
        yOff = 0.07;
        break;
    }

    return { rotation: rot, yOffset: yOff };
  }, [displayState]);

  const [posX, posY, posZ] = position;
  const [rotX, rotY, rotZ] = rotation;

  const ref = useRef<THREE.Object3D>(null);

  // Target position and rotation (stored in refs to avoid recreating vectors on every render)
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetRot = useMemo(() => new THREE.Quaternion(), []);

  // Set targets on prop changes (depend on numeric array elements to avoid ref comparison triggers)
  useEffect(() => {
    targetPos.set(posX, posY + yOffset, posZ);
    targetRot.setFromEuler(new THREE.Euler(rotX, rotY, rotZ));
  }, [posX, posY, posZ, rotX, rotY, rotZ, yOffset, targetPos, targetRot]);

  const isFirstFrame = useRef(true);

  // Animate position and rotation towards targets
  useFrame((_, delta) => {
    if (ref.current) {
      // 0.15 is the lerp speed. Adjust this to speed up/slow down the slide.
      // We make it frame-rate independent by incorporating delta:
      // lerpFactor = 1 - Math.exp(-speed * delta)
      const speed = 10; // units per second-ish
      const factor = isFirstFrame.current ? 1 : 1 - Math.exp(-speed * delta);
      isFirstFrame.current = false;

      ref.current.position.lerp(targetPos, factor);
      ref.current.quaternion.slerp(targetRot, factor);
    }
  });

  return (
    <primitive
      ref={ref}
      object={clone}
      scale={[0.18, 0.24, 0.14]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    />
  );
}

// Pre-load the GLTF to avoid pop-in
useGLTF.preload(TILE_MODEL_PATH);
