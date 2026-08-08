import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAnimationSpeed } from '../state/store';

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
 */
export function TileSpotlightParticles(): React.JSX.Element {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const [sim] = useState(() => new FountainSim());

  const animationSpeed = useAnimationSpeed();

  useFrame((_state, delta) => {
    // Cancel the tile group's rotation so +Y stays world-up for the jet.
    if (groupRef.current?.parent) {
      groupRef.current.parent.getWorldQuaternion(groupRef.current.quaternion);
      groupRef.current.quaternion.invert();
    }

    const posAttr = pointsRef.current?.geometry.getAttribute('position') as
      THREE.BufferAttribute | undefined;
    if (!posAttr) return;

    sim.step(Math.min(delta * animationSpeed, 0.05 * animationSpeed));
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
