import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
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
  useSelectedTileTraceId,
} from '../state/store';
import { rabiriichi } from '../net/client';
import type { ActionOption } from '../domain/inquiry';
import {
  TILE_LIFT_IDLE,
  TILE_LIFT_SELECTED,
  TILE_LIFT_HOVERED,
} from '../domain/constants';
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

  const { viewport: threeViewport, size } = useThree();
  const factorX = (threeViewport.width / size.width) * 0.5;
  const factorY = (threeViewport.height / size.height) * 0.5;
  const selectedTileTraceId = useSelectedTileTraceId();
  const isSelected = selectedTileTraceId === traceId;
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartY = useRef<number>(0);
  const lastClientY = useRef<number>(0);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [dragOffsetZ, setDragOffsetZ] = useState(0);

  const hasTileSelectionActive = useMemo(() => {
    return Boolean(
      currentInquiry?.mapped.playTile != null || isRiichiSelectMode,
    );
  }, [currentInquiry, isRiichiSelectMode]);

  const { isPlayable, activeActionOption } = useMemo(() => {
    return checkPlayableState(currentInquiry, isRiichiSelectMode, traceId);
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
    return getTileOrientation(displayState);
  }, [displayState]);

  const [posX, posY, posZ] = position;
  const [rotX, rotY, rotZ] = rotation;

  const ref = useRef<THREE.Object3D>(null);

  // Target position and rotation (stored in refs to avoid recreating vectors on every render)
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetRot = useMemo(() => new THREE.Quaternion(), []);

  // Set targets on prop changes (depend on numeric array elements to avoid ref comparison triggers)
  useEffect(() => {
    updateTargetPosition(
      targetPos,
      posX,
      posY,
      posZ,
      yOffset,
      isPlayable,
      isDragging,
      isSelected,
      isHovered,
      { dragOffsetX, dragOffsetY, dragOffsetZ },
    );
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
    isSelected,
    isDragging,
    dragOffsetX,
    dragOffsetY,
    dragOffsetZ,
  ]);

  const isFirstFrame = useRef(true);

  const prevPlayable = useRef(false);
  const prevHovered = useRef(false);
  const prevSelected = useRef(false);
  const prevHasSelection = useRef(false);

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
        prevHovered.current !== isHovered ||
        prevSelected.current !== isSelected ||
        prevHasSelection.current !== hasTileSelectionActive
      ) {
        prevPlayable.current = isPlayable;
        prevHovered.current = isHovered;
        prevSelected.current = isSelected;
        prevHasSelection.current = hasTileSelectionActive;
        applyTileAppearance(
          ref.current,
          displayState,
          hasTileSelectionActive,
          isPlayable,
          isSelected,
          isHovered,
        );
      }
    }
  });

  return (
    <primitive
      ref={ref}
      object={clone}
      scale={[0.18, 0.24, 0.14]}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        if (isPlayable && e.nativeEvent.pointerType === 'mouse') {
          e.stopPropagation();
          setIsHovered(true);
        }
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        if (isPlayable && e.nativeEvent.pointerType === 'mouse') {
          e.stopPropagation();
          setIsHovered(false);
        }
      }}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        dragStartX.current = e.nativeEvent.clientX;
        dragStartY.current = e.nativeEvent.clientY;
        lastClientY.current = e.nativeEvent.clientY;
        const isMouse = e.nativeEvent.pointerType === 'mouse';

        const isDragInteract =
          isPlayable &&
          traceId !== undefined &&
          currentInquiry &&
          activeActionOption;

        if (isDragInteract) {
          setIsDragging(true);
          setDragOffsetX(0);
          setDragOffsetY(0);
          setDragOffsetZ(0);
          rabiriichi.selectTile(traceId); // Instantly select the tile when drag starts
        }

        const handleGlobalMove = (moveEvent: PointerEvent) => {
          lastClientY.current = moveEvent.clientY;
          if (isDragInteract) {
            const deltaX = moveEvent.clientX - dragStartX.current;
            const deltaY = moveEvent.clientY - dragStartY.current;

            // Follow screen movement projected into 3D:
            // X matches 3D X
            setDragOffsetX(deltaX * factorX);

            // Screen Y offset:
            // - moving up (deltaY < 0) => lifts tile (+Y) and moves forward (-Z)
            if (deltaY < 0) {
              setDragOffsetY(-deltaY * factorY * 0.78);
              setDragOffsetZ(deltaY * factorY * 0.62);
            } else {
              setDragOffsetY(0);
              setDragOffsetZ(0);
            }
          }
        };

        const handleGlobalUp = () => {
          window.removeEventListener('pointermove', handleGlobalMove);
          window.removeEventListener('pointerup', handleGlobalUp);

          const finalClientY = lastClientY.current;
          const deltaY = finalClientY - dragStartY.current;

          if (isDragInteract) {
            setIsDragging(false);
            setDragOffsetX(0);
            setDragOffsetY(0);
            setDragOffsetZ(0);

            if (deltaY < -60) {
              try {
                void rabiriichi.submitInquiryResponse(
                  activeActionOption,
                  traceId,
                );
              } catch (err) {
                logger.error(
                  'Failed to submit tile discard choice via drag:',
                  err,
                );
              }
            } else {
              // Tap behavior (using 15px threshold for drag vs tap)
              if (Math.abs(deltaY) < 15) {
                if (isMouse) {
                  try {
                    void rabiriichi.submitInquiryResponse(
                      activeActionOption,
                      traceId,
                    );
                  } catch (err) {
                    logger.error(
                      'Failed to submit tile discard choice via mouse click:',
                      err,
                    );
                  }
                } else {
                  if (isSelected) {
                    try {
                      void rabiriichi.submitInquiryResponse(
                        activeActionOption,
                        traceId,
                      );
                    } catch (err) {
                      logger.error(
                        'Failed to submit tile discard choice via double tap:',
                        err,
                      );
                    }
                  } else {
                    rabiriichi.selectTile(traceId);
                  }
                }
              }
            }
          } else {
            // Non-playable tile clicks: trigger onClick if tap is close
            if (Math.abs(deltaY) < 10 && onClick) {
              onClick();
            }
          }
        };

        window.addEventListener('pointermove', handleGlobalMove);
        window.addEventListener('pointerup', handleGlobalUp);
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

/* Pure helper functions and type declarations to keep Tile3D component modular & compact */

interface PlayableState {
  isPlayable: boolean;
  activeActionOption: ActionOption | null;
}

function checkPlayableState(
  currentInquiry: ReturnType<typeof useCurrentInquiry>,
  isRiichiSelectMode: boolean,
  traceId: number | undefined,
): PlayableState {
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
}

interface TileOrientation {
  rotation: [number, number, number];
  yOffset: number;
}

function getTileOrientation(displayState: TileDisplayState): TileOrientation {
  let rot: [number, number, number] = [0, 0, 0];
  let yOff = 0;

  switch (displayState) {
    case 'hand':
      // Upright in hand, facing the player (rotated 180 around Y)
      // and tilted back more to face the camera directly (like a 2D hand)
      rot = [-0.9, Math.PI, 0];
      yOff = 0.13;
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
}

interface TargetOffsets {
  dragOffsetX: number;
  dragOffsetY: number;
  dragOffsetZ: number;
}

function updateTargetPosition(
  targetPos: THREE.Vector3,
  posX: number,
  posY: number,
  posZ: number,
  yOffset: number,
  isPlayable: boolean,
  isDragging: boolean,
  isSelected: boolean,
  isHovered: boolean,
  offsets: TargetOffsets,
): void {
  let finalX = posX;
  let finalY = posY + yOffset;
  let finalZ = posZ;

  if (isPlayable) {
    if (isDragging) {
      finalX += offsets.dragOffsetX;
      finalY += offsets.dragOffsetY;
      finalZ += offsets.dragOffsetZ;
    } else if (isSelected) {
      finalY += TILE_LIFT_SELECTED;
    } else if (isHovered) {
      finalY += TILE_LIFT_HOVERED;
    }
  } else {
    finalY += TILE_LIFT_IDLE;
  }

  targetPos.set(finalX, finalY, finalZ);
}

function applyTileAppearance(
  tileObject: THREE.Object3D,
  displayState: TileDisplayState,
  hasTileSelectionActive: boolean,
  isPlayable: boolean,
  isSelected: boolean,
  isHovered: boolean,
): void {
  tileObject.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const childMat = child.material as THREE.Material | THREE.Material[];
      const mats = Array.isArray(childMat) ? childMat : [childMat];
      mats.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          // Dimming logic
          if (
            displayState === 'hand' &&
            hasTileSelectionActive &&
            !isPlayable
          ) {
            mat.color.setHex(0x999999);
          } else {
            mat.color.setHex(0xffffff);
          }

          // Glow logic
          if (isSelected || (isPlayable && isHovered)) {
            mat.emissive.setHex(0x333311);
          } else if (isPlayable) {
            mat.emissive.setHex(0x111111);
          } else {
            mat.emissive.setHex(0x000000);
          }
        }
      });
    }
  });
}
