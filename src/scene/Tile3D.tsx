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
  useActiveComparisonTile,
  useDoraIndicators,
  useRoom,
  useSelf,
} from '../state/store';
import { rabiriichi } from '../net/client';
import type { ActionOption, DiscardCandidate } from '../domain/inquiry';
import {
  Tile,
  checkIsDora,
  checkDiscardResultsInFuriten,
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

interface Tile3DProps {
  tile: string | null; // e.g. '1m', 'r5s', 'back', or null for back
  displayState?: TileDisplayState;
  position?: [number, number, number];
  onClick?: () => void;
  traceId?: number | undefined;
  isWinningTile?: boolean;
}

export function Tile3D({
  tile,
  displayState = 'face',
  position = [0, 0, 0],
  onClick,
  traceId,
  isWinningTile = false,
}: Tile3DProps): React.JSX.Element {
  const currentInquiry = useCurrentInquiry();
  const isRiichiSelectMode = useIsRiichiSelectMode();
  const animationSpeed = useAnimationSpeed();
  const [isHovered, setIsHovered] = useState(false);

  const doraIndicators = useDoraIndicators();
  const isDora = useMemo(() => {
    if (!tile) return false;
    try {
      const current = Tile.fromString(tile);
      return checkIsDora(current, doraIndicators);
    } catch {
      return false;
    }
  }, [tile, doraIndicators]);

  const isFaceVisible =
    displayState === 'face' ||
    displayState === 'hand' ||
    displayState === 'sideways';

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
    activeComparisonTile && !isMatchingComparison && displayState !== 'hand',
  );
  const isHighlighted = Boolean(activeComparisonTile && isMatchingComparison);

  const room = useRoom();
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

    const discards = getPlayerDiscardsFromRegistry(
      room.tileRegistry,
      selfPlayer.id,
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
  const prevDimmed = useRef(false);
  const prevHighlighted = useRef(false);
  const prevIsDora = useRef(false);
  const prevIsFuritenDiscard = useRef(false);

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
      // We make it frame-rate independent by incorporating delta:
      // lerpFactor = 1 - Math.exp(-speed * delta)
      const factor = isFirstFrame.current
        ? 1
        : 1 - Math.exp(-12 * animationSpeed * delta);
      isFirstFrame.current = false;

      groupRef.current.position.lerp(targetPos, factor);
      groupRef.current.quaternion.slerp(targetRot, factor);
    }

    if (tileRef.current) {
      // Emissive glow for playable tiles and continuous pulse for winning tile
      if (isWinningTile) {
        const pulse = 0.3 + Math.sin(time * 6.0) * 0.3; // pulse between 0.0 and 0.6
        tileRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const childMat = child.material as
              | THREE.Material
              | THREE.Material[];
            const mats = Array.isArray(childMat) ? childMat : [childMat];
            mats.forEach((mat) => {
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.emissive.setHex(0xffaa00); // Gold glow
                mat.emissiveIntensity = pulse;
              }
            });
          }
        });
      } else if (
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
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        if (isPlayable && e.nativeEvent.pointerType === 'mouse') {
          e.stopPropagation();
          setIsHovered(true);
          if (traceId !== undefined) {
            rabiriichi.hoverTile(traceId);
          }
        }
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        if (isPlayable && e.nativeEvent.pointerType === 'mouse') {
          e.stopPropagation();
          setIsHovered(false);
          if (traceId !== undefined) {
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
    >
      <primitive ref={tileRef} object={clone} scale={[0.18, 0.24, 0.14]} />
      {isWinningTile && <TileSpotlightParticles />}
    </group>
  );
}

const FOUNTAIN_COUNT = 80;
const FOUNTAIN_NOZZLE_RADIUS = 0.05; // radius of the jet mouth
const FOUNTAIN_GRAVITY = 4.5; // m/s^2 pulling motes back down
const FOUNTAIN_LAUNCH_MIN = 1.6; // min upward launch speed (m/s)
const FOUNTAIN_LAUNCH_MAX = 2.6; // max upward launch speed (m/s)
const FOUNTAIN_OUTWARD = 0.5; // radial spray speed (m/s)

/** Soft round sprite so motes read as droplets, not squares. */
function createDropletTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const dropletTexture = createDropletTexture();

/**
 * Owns and simulates the fountain particle buffers.
 *
 * Kept as a plain class (outside React) so all per-frame mutation lives in its
 * methods, away from the React compiler's render-value analysis. `positions` is
 * shared directly with the geometry's position attribute.
 */
class FountainSim {
  readonly positions = new Float32Array(FOUNTAIN_COUNT * 3);
  private readonly velocities = new Float32Array(FOUNTAIN_COUNT * 3);
  private seed = 456;

  constructor() {
    for (let i = 0; i < FOUNTAIN_COUNT; i++) {
      this.launch(i);
      // Stagger initial heights so the jet is full immediately, not a pulse.
      this.positions[i * 3 + 1] = this.rand() * 0.5;
    }
  }

  /** Deterministic PRNG for the initial burst; runtime relaunches use Math.random. */
  private rand(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  private launch(i: number, rand: () => number = () => this.rand()): void {
    const base = i * 3;
    const angle = rand() * Math.PI * 2;
    const r = rand() * FOUNTAIN_NOZZLE_RADIUS;
    this.positions[base] = Math.cos(angle) * r;
    this.positions[base + 1] = 0;
    this.positions[base + 2] = Math.sin(angle) * r;

    const outward = rand() * FOUNTAIN_OUTWARD;
    this.velocities[base] = Math.cos(angle) * outward;
    this.velocities[base + 1] =
      FOUNTAIN_LAUNCH_MIN +
      rand() * (FOUNTAIN_LAUNCH_MAX - FOUNTAIN_LAUNCH_MIN);
    this.velocities[base + 2] = Math.sin(angle) * outward;
  }

  /** Advances all motes by `dt` seconds under gravity, relaunching fallen ones. */
  step(dt: number): void {
    const pos = this.positions;
    const vel = this.velocities;
    for (let i = 0; i < FOUNTAIN_COUNT; i++) {
      const base = i * 3;
      const vy = (vel[base + 1] ?? 0) - FOUNTAIN_GRAVITY * dt;
      vel[base + 1] = vy;
      pos[base] = (pos[base] ?? 0) + (vel[base] ?? 0) * dt;
      const newY = (pos[base + 1] ?? 0) + vy * dt;
      pos[base + 1] = newY;
      pos[base + 2] = (pos[base + 2] ?? 0) + (vel[base + 2] ?? 0) * dt;

      // Relaunch a mote once it falls back to (or below) the nozzle.
      if (newY < 0 && vy < 0) {
        this.launch(i, Math.random);
      }
    }
  }
}

/**
 * A powerful upward fountain of glowing motes marking the winning tile.
 *
 * Motes shoot up fast from a small nozzle, decelerate under gravity, arc out,
 * and fall back — giving the classic fountain silhouette (see FountainSim).
 *
 * The tile's own group is rotated to lie the tile flat (or tilt it in hand), so
 * we can't emit "up" along a fixed local axis. The fountain group therefore
 * counter-rotates to the parent's inverse world rotation every frame, giving it
 * a world-aligned frame where +Y is always true up.
 */
function TileSpotlightParticles(): React.JSX.Element {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const [sim] = useState(() => new FountainSim());

  useFrame((_state, delta) => {
    // Cancel the tile group's rotation so +Y stays world-up for the jet.
    if (groupRef.current?.parent) {
      groupRef.current.parent.getWorldQuaternion(groupRef.current.quaternion);
      groupRef.current.quaternion.invert();
    }

    const posAttr = pointsRef.current?.geometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined;
    if (!posAttr) return;

    sim.step(Math.min(delta, 0.05));
    posAttr.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} renderOrder={3} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[sim.positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#ff7a99"
          size={0.09}
          sizeAttenuation
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          {...(dropletTexture ? { map: dropletTexture } : {})}
        />
      </points>
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
  isDimmed: boolean,
  isHighlighted: boolean,
  isDora: boolean,
  isFuritenDiscard = false,
): void {
  const isFaceVisible =
    displayState === 'face' ||
    displayState === 'hand' ||
    displayState === 'sideways';

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
          if (isSelected || (isPlayable && isHovered)) {
            mat.emissive.setHex(0x333311);
            mat.emissiveIntensity = 1.0;
          } else if (isHighlighted) {
            mat.emissive.setHex(0x111133);
            mat.emissiveIntensity = 0.8;
          } else if (isPlayable) {
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
