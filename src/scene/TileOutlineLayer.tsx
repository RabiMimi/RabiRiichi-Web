import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getOutlinedTiles, isEffectivelyVisible } from './tileOutlineRegistry';

/** Change this value to adjust the outline width in CSS pixels. */
const OUTLINE_WIDTH_PX = 1.5;
const OUTLINE_OPACITY = 0.73;
const MAX_OUTLINED_TILES = 256;

const TILE_WIDTH = 0.18;
const TILE_HEIGHT = 0.24;
const TILE_DEPTH = 0.12;
const MODEL_BEVEL_RADIUS = 0.03;

const OUTLINE_VERTEX_SHADER = `
  uniform vec2 uViewport;
  uniform float uOutlineWidth;

  void main() {
    vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
    vec4 clipPosition = projectionMatrix * modelViewMatrix * worldPosition;

    vec4 normalPosition =
      instanceMatrix * vec4(position + normal, 1.0);
    vec4 normalClipPosition =
      projectionMatrix * modelViewMatrix * normalPosition;

    vec2 positionNdc = clipPosition.xy / clipPosition.w;
    vec2 normalNdc =
      normalClipPosition.xy / normalClipPosition.w;
    vec2 pixelDirection =
      (normalNdc - positionNdc) * uViewport;
    float directionLength = length(pixelDirection);

    if (directionLength > 0.00001) {
      vec2 direction = pixelDirection / directionLength;
      vec2 offsetNdc =
        direction * uOutlineWidth * 2.0 / uViewport;
      clipPosition.xy += offsetNdc * clipPosition.w;
    }

    gl_Position = clipPosition;
  }
`;

const OUTLINE_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uOpacity;

  void main() {
    gl_FragColor = vec4(uColor, uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function createOutlineGeometry(): THREE.BufferGeometry {
  // The source model is a unit beveled cube scaled independently on each axis.
  // Reproducing that as one closed proxy avoids seams between its three
  // material primitives and gives projected-normal expansion stable normals.
  const geometry = new RoundedBoxGeometry(1, 1, 1, 1, MODEL_BEVEL_RADIUS);
  geometry.scale(TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH);
  geometry.deleteAttribute('uv');
  geometry.clearGroups();
  return geometry;
}

function createOutlineMaterial(
  viewportSize: THREE.Vector2,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uViewport: { value: viewportSize },
      uOutlineWidth: { value: OUTLINE_WIDTH_PX },
      uColor: { value: new THREE.Color('#111111') },
      uOpacity: { value: OUTLINE_OPACITY },
    },
    vertexShader: OUTLINE_VERTEX_SHADER,
    fragmentShader: OUTLINE_FRAGMENT_SHADER,
    side: THREE.BackSide,
    depthTest: true,
    depthWrite: false,
    transparent: true,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: THREE.NotEqualStencilFunc,
    stencilFail: THREE.KeepStencilOp,
    stencilZFail: THREE.KeepStencilOp,
    stencilZPass: THREE.KeepStencilOp,
  });
}

/**
 * Draws every tile outline in one instanced draw call.
 *
 * Tile surfaces populate stencil value 1 during their normal pass. This
 * transparent pass runs afterward and rejects those pixels, so the outline can
 * only occupy the screen-space ring outside visible tile faces.
 */
export function TileOutlineLayer(): React.JSX.Element {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { width, height } = useThree((state) => state.size);
  const viewportSize = useMemo(() => new THREE.Vector2(), []);
  const geometry = useMemo(() => createOutlineGeometry(), []);
  const material = useMemo(
    () => createOutlineMaterial(viewportSize),
    [viewportSize],
  );
  const layerInverse = useMemo(() => new THREE.Matrix4(), []);
  const instanceMatrix = useMemo(() => new THREE.Matrix4(), []);

  useEffect(() => {
    viewportSize.set(width, height);
  }, [height, viewportSize, width]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    mesh.updateWorldMatrix(true, false);
    layerInverse.copy(mesh.matrixWorld).invert();

    let count = 0;
    for (const tile of getOutlinedTiles()) {
      if (count >= MAX_OUTLINED_TILES) break;
      if (!isEffectivelyVisible(tile)) continue;

      tile.updateWorldMatrix(true, false);
      instanceMatrix.multiplyMatrices(layerInverse, tile.matrixWorld);
      mesh.setMatrixAt(count, instanceMatrix);
      count += 1;
    }

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MAX_OUTLINED_TILES]}
      count={0}
      frustumCulled={false}
      renderOrder={1}
    />
  );
}
