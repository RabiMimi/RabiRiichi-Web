import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import {
  TILE_MODEL_PATH,
  getTileTexturePath,
  VALID_TILE_STRINGS,
} from './assets';
import {
  useCurrentInquiry,
  useIsRiichiSelectMode,
  useAnimationSpeed,
} from '../state/store';
import { rabiriichi } from '../net/client';
import type { ActionOption } from '../domain/inquiry';
import { Logger } from '../lib/logger';

const logger = new Logger('Tile3D');

export type TileDisplayState =
  | 'hand'
  | 'opponent-hand'
  | 'face'
  | 'back'
  | 'sideways';

function createMappedMaterial(
  mat: THREE.Material,
  frontTexture: THREE.Texture,
  backTexture: THREE.Texture,
): THREE.Material {
  const matName = mat.name;
  if (matName === 'Front.001') {
    return new THREE.MeshStandardMaterial({
      map: frontTexture,
      roughness: 0.15,
      metalness: 0.05,
    });
  } else if (matName === 'Back.001') {
    return new THREE.MeshStandardMaterial({
      map: backTexture,
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
  traceId?: number | undefined;
}

export function Tile3D({
  tile,
  displayState = 'face',
  position = [0, 0, 0],
  onClick,
  traceId,
}: Tile3DProps): React.JSX.Element {
  const currentInquiry = useCurrentInquiry();
  const isRiichiSelectMode = useIsRiichiSelectMode();
  const animationSpeed = useAnimationSpeed();
  const [isHovered, setIsHovered] = useState(false);

  const { isPlayable, activeActionOption } = useMemo(() => {
    let playable = false;
    let activeOpt: ActionOption | null = null;

    if (currentInquiry?.mapped && traceId !== undefined) {
      const mapped = currentInquiry.mapped;
      if (isRiichiSelectMode) {
        const riichiOpt = mapped.buttons.find((b) => b.type === 'riichi');
        if (
          riichiOpt &&
          'legalTiles' in riichiOpt &&
          riichiOpt.legalTiles.includes(traceId)
        ) {
          playable = true;
          activeOpt = riichiOpt;
        }
      } else if (mapped.playTile?.legalTiles.includes(traceId)) {
        playable = true;
        activeOpt = {
          type: 'play-tile',
          label: '打',
          actionIndex: mapped.playTile.actionIndex,
          legalTiles: mapped.playTile.legalTiles,
        };
      }
    }

    return { isPlayable: playable, activeActionOption: activeOpt };
  }, [currentInquiry, isRiichiSelectMode, traceId]);
  // Load the shared GLTF model (cached by drei)
  const { scene } = useGLTF(TILE_MODEL_PATH);

  // Load the face texture for this specific tile
  const texturePath = getTileTexturePath(tile);
  const texture = useTexture(texturePath);

  // Always load the back face texture
  const backTexture = useTexture('/assets/hand_tiles/back.jpg');

  // Clone the textures and configure them.
  // This avoids mutating the raw hook return value which violates strict react-hooks rules.
  const clonedTexture = useMemo(() => {
    const tex = texture.clone();
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.flipY = false;
    tex.needsUpdate = true;
    return tex;
  }, [texture]);

  const clonedBackTexture = useMemo(() => {
    const tex = backTexture.clone();
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.flipY = false;
    tex.needsUpdate = true;
    return tex;
  }, [backTexture]);

  // Clone the scene graph so this tile has its own material instances
  const clone = useMemo(() => scene.clone(), [scene]);

  // Apply materials to the cloned meshes
  useMemo(() => {
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const childMat = child.material as THREE.Material | THREE.Material[];
        if (Array.isArray(childMat)) {
          child.material = childMat.map((mat) =>
            createMappedMaterial(mat, clonedTexture, clonedBackTexture),
          );
        } else {
          child.material = createMappedMaterial(
            childMat,
            clonedTexture,
            clonedBackTexture,
          );
        }

        // Enable shadows
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [clone, clonedTexture, clonedBackTexture]);

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
        // and tilted back more to face the camera directly (like a 2D hand)
        rot = [-0.65, Math.PI, 0];
        yOff = 0.14;
        break;
      case 'opponent-hand':
        // Upright in opponent's hand, facing them (no tilt relative to their seat)
        rot = [0, Math.PI, 0];
        yOff = 0.12;
        break;
      case 'face':
        // Lying flat on the table, face up
        rot = [-Math.PI / 2, Math.PI, 0];
        yOff = 0.07;
        break;
      case 'back':
        // Lying flat on the table, face down
        rot = [Math.PI / 2, Math.PI, 0];
        yOff = 0.07;
        break;
      case 'sideways':
        // Lying flat, face up, rotated 90 degrees CCW
        rot = [-Math.PI / 2, Math.PI, Math.PI / 2];
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
    let finalY = posY + yOffset;
    if (isPlayable) {
      finalY += 0.03; // Lift slightly if playable
      if (isHovered) {
        finalY += 0.04; // Lift more if hovered
      }
    }
    targetPos.set(posX, finalY, posZ);
    targetRot.setFromEuler(new THREE.Euler(rotX, rotY, rotZ));
  }, [
    posX,
    posY,
    posZ,
    rotX,
    rotY,
    rotZ,
    yOffset,
    targetPos,
    targetRot,
    isPlayable,
    isHovered,
  ]);

  const isFirstFrame = useRef(true);

  const prevPlayable = useRef(false);
  const prevHovered = useRef(false);

  // Animate position and rotation towards targets
  useFrame((_, delta) => {
    if (ref.current) {
      // We make it frame-rate independent by incorporating delta:
      // lerpFactor = 1 - Math.exp(-speed * delta)
      const factor = isFirstFrame.current
        ? 1
        : 1 - Math.exp(-12 * animationSpeed * delta);
      isFirstFrame.current = false;

      ref.current.position.lerp(targetPos, factor);
      ref.current.quaternion.slerp(targetRot, factor);

      // Emissive glow for playable tiles (only update on state changes to avoid per-frame traversal)
      if (
        prevPlayable.current !== isPlayable ||
        prevHovered.current !== isHovered
      ) {
        prevPlayable.current = isPlayable;
        prevHovered.current = isHovered;
        ref.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const childMat = child.material as
              | THREE.Material
              | THREE.Material[];
            const mats = Array.isArray(childMat) ? childMat : [childMat];
            mats.forEach((mat) => {
              if (mat instanceof THREE.MeshStandardMaterial) {
                if (isPlayable && isHovered) {
                  mat.emissive.setHex(0x333311); // Soft yellow glow
                } else if (isPlayable) {
                  mat.emissive.setHex(0x111111); // Faint glow
                } else {
                  mat.emissive.setHex(0x000000);
                }
              }
            });
          }
        });
      }
    }
  });

  return (
    <primitive
      ref={ref}
      object={clone}
      scale={[0.18, 0.24, 0.14]}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        if (isPlayable) {
          e.stopPropagation();
          setIsHovered(true);
        }
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        if (isPlayable) {
          e.stopPropagation();
          setIsHovered(false);
        }
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (
          isPlayable &&
          traceId !== undefined &&
          currentInquiry &&
          activeActionOption
        ) {
          try {
            void rabiriichi.submitInquiryResponse(activeActionOption, traceId);
          } catch (err) {
            logger.error('Failed to submit tile discard choice:', err);
          }
        } else if (onClick) {
          onClick();
        }
      }}
    />
  );
}

// Pre-load the GLTF to avoid pop-in
useGLTF.preload(TILE_MODEL_PATH);

// Pre-load all tile face textures to prevent Suspense flashes at runtime
VALID_TILE_STRINGS.forEach((tileStr) => {
  useTexture.preload(getTileTexturePath(tileStr));
});
useTexture.preload('/assets/hand_tiles/back.jpg');
useTexture.preload('/assets/hand_tiles/blank.jpg');
useTexture.preload('/assets/hand_tiles/front.jpg');
