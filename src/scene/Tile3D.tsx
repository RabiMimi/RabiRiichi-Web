import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useGLTF, useTexture, Html } from '@react-three/drei';
import { TileSpotlightParticles } from './TileSpotlightParticles';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { TileTooltip } from '../ui/TileTooltip';
import { tooltipPortalTarget } from '../ui/portal';
import {
  TILE_MODEL_PATH,
  getTileTexturePath,
  VALID_TILE_STRINGS,
} from './assets';
import {
  saveTilePose,
  getAndClearTilePose,
  type TileArea,
} from './tileTransitionRegistry';
import {
  useCurrentInquiry,
  useIsRiichiSelectMode,
  useAnimationSpeed,
  useSelectedTileTraceId,
  useHoveredTileTraceId,
  useActiveComparisonTile,
  useDoraIndicators,
  useRoom,
  useSelf,
  useClaimTargetTileId,
} from '../state/store';
import { rabiriichi } from '../net/client';
import type { ActionOption, DiscardCandidate } from '../domain/inquiry';
import {
  Tile,
  checkIsDora,
  checkDiscardResultsInFuriten,
  isTileUnknown,
} from '../domain/tile';
import { getPlayerDiscardsFromRegistry } from '../domain/tileRegistry';
import { FuritenType } from '../proto';
import {
  TILE_LIFT_IDLE,
  TILE_LIFT_SELECTED,
  TILE_LIFT_HOVERED,
} from '../domain/constants';
import { Logger } from '../lib/logger';

const logger = new Logger('Tile3D');

// Adjust these constants to change the Dora sliding sheen appearance
export const DORA_SHEEN_WIDTH = 0.2; // Width of the diagonal reflection sheen (increase for wider/softer look)
export const DORA_SHEEN_SPEED = 2.0; // Speed of the sliding animation (increase for faster sliding)

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
  isDora: boolean,
): THREE.Material {
  const matName = mat.name;
  if (matName === 'Front.001') {
    const customMat = new THREE.MeshStandardMaterial({
      map: frontTexture,
      roughness: 0.15,
      metalness: 0.05,
    });

    const userData = {
      uTime: { value: 0 },
      isDora: { value: isDora ? 1.0 : 0.0 },
    };
    customMat.userData = userData;

    customMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = userData.uTime;
      shader.uniforms.uIsDora = userData.isDora;
      shader.uniforms.uSheenWidth = { value: DORA_SHEEN_WIDTH };
      shader.uniforms.uSheenSpeed = { value: DORA_SHEEN_SPEED };

      shader.fragmentShader =
        `
        uniform float uTime;
        uniform float uIsDora;
        uniform float uSheenWidth;
        uniform float uSheenSpeed;
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>
        
        if (uIsDora > 0.5) {
          #ifdef USE_MAP
            vec2 uv = vMapUv;
          #else
            vec2 uv = vec2(0.5);
          #endif
          
          // Conan's glasses sliding sheen sweep (diagonal: x + y)
          float progress = mod(uTime * uSheenSpeed, 2.5) - 0.7;
          float d = abs(uv.x + uv.y - progress);
          
          // Specular white sheen band
          float sheen = smoothstep(uSheenWidth, 0.0, d) * 0.75;
          
          gl_FragColor.rgb += vec3(sheen);
        }
        `,
      );
    };

    return customMat;
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

// Pre-allocated temporary variables to avoid per-frame GC allocations
const tempV3 = new THREE.Vector3();
const tempQ = new THREE.Quaternion();
const tempParentRot = new THREE.Quaternion();
const tempTargetWorldPos = new THREE.Vector3();
const tempTargetWorldRot = new THREE.Quaternion();
const tempCurrentWorldPos = new THREE.Vector3();
const tempCurrentWorldRot = new THREE.Quaternion();
const tempLocalRot = new THREE.Quaternion();

interface ActiveTransition {
  startWorldPos: THREE.Vector3;
  startWorldRot: THREE.Quaternion;
  duration: number;
  elapsed: number;
}

function easeInOutQuad(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

interface Tile3DProps {
  tile: string | null; // e.g. '1m', 'r5s', 'back', or null for back
  displayState?: TileDisplayState;
  position?: [number, number, number];
  onClick?: () => void;
  traceId?: number | undefined;
  isWinningTile?: boolean;
  area?: TileArea;
}

export function Tile3D({
  tile,
  displayState = 'face',
  position = [0, 0, 0],
  onClick,
  traceId,
  isWinningTile = false,
  area = 'ui',
}: Tile3DProps): React.JSX.Element {
  const currentInquiry = useCurrentInquiry();
  const isRiichiSelectMode = useIsRiichiSelectMode();
  const animationSpeed = useAnimationSpeed();
  const [isHovered, setIsHovered] = useState(false);

  const room = useRoom();
  const doraIndicators = useDoraIndicators();
  const claimTargetTileId = useClaimTargetTileId();
  const isClaimTarget = useMemo(() => {
    if (claimTargetTileId == null) return false;
    if (traceId === claimTargetTileId) return true;

    if (area === 'meld' && room) {
      for (const player of room.players) {
        const melds = player.gameState?.hand.called ?? [];
        for (const meld of melds) {
          const tiles = meld.tiles ?? [];
          const hasTarget = tiles.some((t) => t.traceId === claimTargetTileId);
          const hasSelf = tiles.some((t) => t.traceId === traceId);
          if (hasTarget && hasSelf) {
            return true;
          }
        }
      }
    }
    return false;
  }, [claimTargetTileId, traceId, area, room]);
  const isDora = useMemo(() => {
    if (!tile) return false;
    try {
      const current = Tile.fromString(tile);
      return checkIsDora(current, doraIndicators);
    } catch {
      return false;
    }
  }, [tile, doraIndicators]);

  const activeTransition = useRef<ActiveTransition | null>(null);

  const isFaceVisible =
    displayState === 'face' ||
    displayState === 'hand' ||
    displayState === 'sideways';

  const { viewport: threeViewport, size } = useThree();
  const factorX = (threeViewport.width / size.width) * 0.5;
  const factorY = (threeViewport.height / size.height) * 0.5;
  const selectedTileTraceId = useSelectedTileTraceId();
  const hoveredTileTraceId = useHoveredTileTraceId();
  const isSelected = selectedTileTraceId === traceId;

  const showTooltip =
    traceId !== undefined &&
    (hoveredTileTraceId === traceId ||
      (hoveredTileTraceId === null && selectedTileTraceId === traceId));
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

  const activeComparisonTile = useActiveComparisonTile();
  const isMatchingComparison = useMemo(() => {
    if (!activeComparisonTile || !tile) return false;
    try {
      const active = Tile.fromString(activeComparisonTile);
      const current = Tile.fromString(tile);
      return active.suit === current.suit && active.num === current.num;
    } catch {
      return activeComparisonTile === tile;
    }
  }, [activeComparisonTile, tile]);

  const isDimmed = Boolean(
    activeComparisonTile &&
    !isMatchingComparison &&
    displayState !== 'hand' &&
    !isTileUnknown(tile),
  );
  const isHighlighted = Boolean(activeComparisonTile && isMatchingComparison);

  const currentUser = useSelf();
  const selfPlayer = useMemo(() => {
    if (!room || !currentUser) return null;
    return room.players.find((p) => p.id === currentUser.id) ?? null;
  }, [room, currentUser]);

  const isFuritenDiscard = useMemo(() => {
    if (!isPlayable || traceId === undefined || !room || !selfPlayer) {
      return false;
    }

    let candidate: DiscardCandidate | undefined;

    const playTileCandidates =
      currentInquiry?.mapped.playTile?.candidates ?? [];
    candidate = playTileCandidates.find((c) => c.tileId === traceId);

    if (!candidate && currentInquiry) {
      const riichiButton = currentInquiry.mapped.buttons.find(
        (b) => b.type === 'riichi',
      );
      if (riichiButton) {
        const riichiCandidates = riichiButton.candidates ?? [];
        candidate = riichiCandidates.find((c) => c.tileId === traceId);
      }
    }

    if (!candidate || candidate.tenpaiInfos.length === 0) {
      return false;
    }

    // Discards in the tile registry are keyed by seat (discardInfo.from),
    // not by account id. Use the player's seat to look up their own discards.
    if (selfPlayer.seat === undefined) {
      return false;
    }
    const discards = getPlayerDiscardsFromRegistry(
      room.tileRegistry,
      selfPlayer.seat,
    );

    const tileMsg = room.tileRegistry.get(traceId);
    if (tileMsg?.tile == null) {
      return false;
    }

    const winningWaits = candidate.tenpaiInfos.map((w) => w.winningTile);
    const isAlreadyFuriten =
      selfPlayer.gameState?.furiten[FuritenType.FURITEN_TYPE_DISCARD] ?? false;

    return checkDiscardResultsInFuriten(
      tileMsg.tile,
      winningWaits,
      discards,
      isAlreadyFuriten,
    );
  }, [isPlayable, traceId, room, selfPlayer, currentInquiry]);

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

  // Clone the scene graph and apply materials so this tile has its own material instances
  const clone = useMemo(() => {
    const clonedScene = scene.clone();
    const frontMats: THREE.Material[] = [];
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const childMat = child.material as THREE.Material | THREE.Material[];
        if (Array.isArray(childMat)) {
          child.material = childMat.map((mat) => {
            const mapped = createMappedMaterial(
              mat,
              clonedTexture,
              clonedBackTexture,
              isDora,
            );
            if (mat.name === 'Front.001') frontMats.push(mapped);
            return mapped;
          });
        } else {
          const mapped = createMappedMaterial(
            childMat,
            clonedTexture,
            clonedBackTexture,
            isDora,
          );
          if (childMat.name === 'Front.001') frontMats.push(mapped);
          child.material = mapped;
        }

        // Enable shadows
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    clonedScene.userData.frontMaterials = frontMats;
    return clonedScene;
  }, [scene, clonedTexture, clonedBackTexture, isDora]);

  // Determine rotation and Y-offset based on the display state
  const { rotation, yOffset } = useMemo(() => {
    return getTileOrientation(displayState);
  }, [displayState]);

  const [posX, posY, posZ] = position;
  const [rotX, rotY, rotZ] = rotation;

  const groupRef = useRef<THREE.Group>(null);
  const tileRef = useRef<THREE.Object3D>(null);

  // Target position and rotation (stored in refs to avoid recreating vectors on every render)
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetRot = useMemo(() => new THREE.Quaternion(), []);

  const isInteractive = useMemo(() => {
    return isPlayable || displayState === 'hand';
  }, [isPlayable, displayState]);

  // Set targets on prop changes (depend on numeric array elements to avoid ref comparison triggers)
  useEffect(() => {
    updateTargetPosition(
      targetPos,
      posX,
      posY,
      posZ,
      yOffset,
      isInteractive,
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
    isInteractive,
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
  const prevDimmed = useRef(false);
  const prevHighlighted = useRef(false);
  const prevIsDora = useRef(false);
  const prevIsFuritenDiscard = useRef(false);
  const prevShowGlow = useRef(false);

  // Animate position and rotation towards targets
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const frontMats = clone.userData.frontMaterials as THREE.Material[];
    frontMats.forEach((mat) => {
      interface CustomUserData {
        uTime: { value: number };
        isDora: { value: number };
      }
      const userData = mat.userData as Partial<CustomUserData>;
      if (userData.uTime && userData.isDora) {
        userData.uTime.value = time;
        userData.isDora.value = isDora && isFaceVisible ? 1.0 : 0.0;
      }
    });

    if (groupRef.current) {
      if (isFirstFrame.current) {
        isFirstFrame.current = false;
        if (traceId !== undefined) {
          const lastPose = getAndClearTilePose(traceId);
          const isAllowedTransition =
            lastPose &&
            ((lastPose.area === 'hand' && area === 'river') ||
              (lastPose.area === 'river' && area === 'meld') ||
              (lastPose.area === 'hand' && area === 'meld'));

          if (lastPose && isAllowedTransition && groupRef.current.parent) {
            activeTransition.current = {
              startWorldPos: lastPose.worldPosition.clone(),
              startWorldRot: lastPose.worldQuaternion.clone(),
              duration: 0.4, // 0.4 seconds duration
              elapsed: 0,
            };
          } else {
            groupRef.current.position.copy(targetPos);
            groupRef.current.quaternion.copy(targetRot);
          }
        } else {
          groupRef.current.position.copy(targetPos);
          groupRef.current.quaternion.copy(targetRot);
        }
      }

      const transition = activeTransition.current;
      if (transition && groupRef.current.parent) {
        const parentGroup = groupRef.current.parent;
        parentGroup.updateMatrixWorld(true);

        transition.elapsed += delta * animationSpeed;
        const progress = Math.min(1, transition.elapsed / transition.duration);
        const easedT = easeInOutQuad(progress);

        // 1. Calculate current target world position & rotation for this frame
        tempTargetWorldPos.copy(targetPos);
        parentGroup.localToWorld(tempTargetWorldPos);

        parentGroup.getWorldQuaternion(tempParentRot);
        tempTargetWorldRot.copy(tempParentRot).multiply(targetRot);

        // 2. Interpolate world position
        tempCurrentWorldPos.lerpVectors(
          transition.startWorldPos,
          tempTargetWorldPos,
          easedT,
        );

        // 3. Interpolate world rotation
        tempCurrentWorldRot.slerpQuaternions(
          transition.startWorldRot,
          tempTargetWorldRot,
          easedT,
        );

        // 4. Convert back to local space and apply
        parentGroup.worldToLocal(tempCurrentWorldPos);
        groupRef.current.position.copy(tempCurrentWorldPos);

        tempLocalRot.copy(tempParentRot).invert().multiply(tempCurrentWorldRot);
        groupRef.current.quaternion.copy(tempLocalRot);

        if (progress >= 1) {
          activeTransition.current = null; // finished transition
        }
      } else {
        const factor = 1 - Math.exp(-12 * animationSpeed * delta);
        groupRef.current.position.lerp(targetPos, factor);
        groupRef.current.quaternion.slerp(targetRot, factor);
      }
    }

    if (tileRef.current) {
      const showGlow = isWinningTile || isClaimTarget;
      const glowChanged = prevShowGlow.current !== showGlow;
      prevShowGlow.current = showGlow;

      if (showGlow) {
        const pulse = 0.3 + Math.sin(time * 6.0) * 0.3; // pulse between 0.0 and 0.6
        const glowColor = isWinningTile ? 0xffaa00 : 0x33ffcc;
        tileRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const childMat = child.material as
              | THREE.Material
              | THREE.Material[];
            const mats = Array.isArray(childMat) ? childMat : [childMat];
            mats.forEach((mat) => {
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.emissive.setHex(glowColor);
                mat.emissiveIntensity = pulse;
              }
            });
          }
        });
      } else if (
        glowChanged ||
        prevPlayable.current !== isPlayable ||
        prevHovered.current !== isHovered ||
        prevSelected.current !== isSelected ||
        prevHasSelection.current !== hasTileSelectionActive ||
        prevDimmed.current !== isDimmed ||
        prevHighlighted.current !== isHighlighted ||
        prevIsDora.current !== isDora ||
        prevIsFuritenDiscard.current !== isFuritenDiscard
      ) {
        prevPlayable.current = isPlayable;
        prevHovered.current = isHovered;
        prevSelected.current = isSelected;
        prevHasSelection.current = hasTileSelectionActive;
        prevDimmed.current = isDimmed;
        prevHighlighted.current = isHighlighted;
        prevIsDora.current = isDora;
        prevIsFuritenDiscard.current = isFuritenDiscard;
        applyTileAppearance(
          tileRef.current,
          displayState,
          hasTileSelectionActive,
          isPlayable,
          isSelected,
          isHovered,
          isDimmed,
          isHighlighted,
          isDora,
          isFuritenDiscard,
        );
      }
    }

    // Save world pose at the end of the frame for future transitions (remounts)
    if (groupRef.current && traceId !== undefined) {
      groupRef.current.getWorldPosition(tempV3);
      groupRef.current.getWorldQuaternion(tempQ);
      saveTilePose(traceId, tempV3, tempQ, area);
    }
  });

  return (
    <group
      ref={groupRef}
      name={`tile-${traceId}`}
      userData={{ traceId, area }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        if (e.nativeEvent.pointerType === 'mouse') {
          e.stopPropagation();
          setIsHovered(true);
          if (traceId !== undefined) {
            rabiriichi.hoverTile(traceId);
          }
        }
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        if (e.nativeEvent.pointerType === 'mouse') {
          e.stopPropagation();
          setIsHovered(false);
          if (
            traceId !== undefined &&
            rabiriichi.hoveredTileTraceId === traceId
          ) {
            rabiriichi.hoverTile(null);
          }
        }
      }}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        dragStartX.current = e.nativeEvent.clientX;
        dragStartY.current = e.nativeEvent.clientY;
        lastClientY.current = e.nativeEvent.clientY;
        const isMouse = e.nativeEvent.pointerType === 'mouse';
        if (!isMouse && traceId !== undefined) {
          setIsHovered(true);
          rabiriichi.hoverTile(traceId);
        }

        const isDragInteract = isInteractive && traceId !== undefined;

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
              if (isPlayable && activeActionOption) {
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
                rabiriichi.selectTile(traceId);
              }
            } else {
              // Tap behavior (using 15px threshold for drag vs tap)
              if (Math.abs(deltaY) < 15) {
                if (isMouse) {
                  if (isPlayable && activeActionOption) {
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
                    rabiriichi.selectTile(traceId);
                  }
                } else {
                  if (isSelected && isPlayable && activeActionOption) {
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

          if (!isMouse) {
            setIsHovered(false);
            if (
              traceId !== undefined &&
              rabiriichi.hoveredTileTraceId === traceId
            ) {
              rabiriichi.hoverTile(null);
            }
          }
        };

        window.addEventListener('pointermove', handleGlobalMove);
        window.addEventListener('pointerup', handleGlobalUp);
      }}
    >
      <primitive ref={tileRef} object={clone} scale={[0.18, 0.24, 0.14]} />
      {isWinningTile && <TileSpotlightParticles />}
      {showTooltip && (
        <Html center style={{ pointerEvents: 'none' }} portal={tooltipPortalTarget as React.RefObject<HTMLElement>}>
          <TileTooltip />
        </Html>
      )}
    </group>
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
        ...(mapped.playTile.candidates
          ? { candidates: mapped.playTile.candidates }
          : {}),
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
  isInteractive: boolean,
  isDragging: boolean,
  isSelected: boolean,
  isHovered: boolean,
  offsets: TargetOffsets,
): void {
  let finalX = posX;
  let finalY = posY + yOffset;
  let finalZ = posZ;

  if (isInteractive) {
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
  isDimmed: boolean,
  isHighlighted: boolean,
  isDora: boolean,
  isFuritenDiscard = false,
): void {
  const isFaceVisible =
    displayState === 'face' ||
    displayState === 'hand' ||
    displayState === 'sideways';

  const isInteractive = isPlayable || displayState === 'hand';

  tileObject.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const childMat = child.material as THREE.Material | THREE.Material[];
      const mats = Array.isArray(childMat) ? childMat : [childMat];
      mats.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          // Dimming logic
          if (isDimmed) {
            mat.color.setHex(0x999999);
          } else if (
            displayState === 'hand' &&
            hasTileSelectionActive &&
            !isPlayable
          ) {
            mat.color.setHex(0x999999);
          } else if (isFuritenDiscard) {
            mat.color.setHex(0xffcccc); // Slightly red tint for furiten discard
          } else {
            mat.color.setHex(0xffffff);
          }

          // Emissive base for Dora tiles (warm gold undertone)
          let emissiveHex = 0x000000;
          let emissiveInt = 0.0;
          if (isDora && isFaceVisible) {
            emissiveHex = 0x221a00;
            emissiveInt = 0.6;
          }

          // Glow logic
          if (isSelected || (isInteractive && isHovered)) {
            mat.emissive.setHex(0x333311);
            mat.emissiveIntensity = 1.0;
          } else if (isHighlighted) {
            mat.emissive.setHex(0x111133);
            mat.emissiveIntensity = 0.8;
          } else if (isInteractive) {
            mat.emissive.setHex(0x111111);
            mat.emissiveIntensity = 1.0;
          } else {
            mat.emissive.setHex(emissiveHex);
            mat.emissiveIntensity = emissiveInt;
          }
        }
      });
    }
  });
}
