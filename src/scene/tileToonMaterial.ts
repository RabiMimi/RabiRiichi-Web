import * as THREE from 'three';
import { DORA_SHEEN_INTENSITY, DORA_SHEEN_WIDTH } from '../lib/doraSheen';

// uSheenProgress comes from the shared timeline in lib/doraSheen.ts.
const DORA_SHEEN = `
  if (uIsDora > 0.5) {
    #ifdef USE_MAP
      vec2 uv = vMapUv;
    #else
      vec2 uv = vec2(0.5);
    #endif
    float d = abs(uv.x + uv.y - uSheenProgress);
    float sheen = smoothstep(uSheenWidth, 0.0, d) * uSheenIntensity;
    gl_FragColor.rgb += vec3(sheen);
  }
`;

/**
 * Mip bias for the face artwork. The 700px art lands on ~50 device pixels, and
 * plain trilinear filtering at that ratio reads like a lower-resolution image;
 * sampling half a mip level sharper keeps pips and strokes legible on phones.
 */
const FACE_MIP_BIAS = -0.5;

const SHARP_MAP_FRAGMENT = THREE.ShaderChunk.map_fragment.replace(
  'texture2D( map, vMapUv )',
  `texture2D( map, vMapUv, ${FACE_MIP_BIAS.toFixed(1)} )`,
);

function configureTileStencil(material: THREE.Material): void {
  material.stencilWrite = true;
  material.stencilRef = 1;
  material.stencilFunc = THREE.AlwaysStencilFunc;
  material.stencilFail = THREE.KeepStencilOp;
  material.stencilZFail = THREE.KeepStencilOp;
  material.stencilZPass = THREE.ReplaceStencilOp;
}

/** Lit tile face with the Dora sheen layered over the source artwork. */
export function createToonMaterial(
  frontTexture: THREE.Texture,
): THREE.MeshPhongMaterial {
  const mat = new THREE.MeshPhongMaterial({
    map: frontTexture,
    specular: 0x000000,
    shininess: 0,
  });
  configureTileStencil(mat);

  mat.onBeforeCompile = (shader) => {
    const uSheenProgress = { value: 0 };
    const uIsDora = { value: 0 };
    shader.uniforms.uSheenProgress = uSheenProgress;
    shader.uniforms.uIsDora = uIsDora;
    shader.uniforms.uSheenWidth = { value: DORA_SHEEN_WIDTH };
    shader.uniforms.uSheenIntensity = { value: DORA_SHEEN_INTENSITY };
    mat.userData.sheenProgress = uSheenProgress;
    mat.userData.isDora = uIsDora;

    shader.fragmentShader =
      `
      uniform float uSheenProgress;
      uniform float uIsDora;
      uniform float uSheenWidth;
      uniform float uSheenIntensity;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      SHARP_MAP_FRAGMENT,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      '#include <dithering_fragment>\n' + DORA_SHEEN,
    );
  };

  return mat;
}

/** Lit tile side: its shading preserves the tile's beveled silhouette. */
export function createToonSideMaterial(
  sideTexture?: THREE.Texture,
): THREE.MeshPhongMaterial {
  const mat = new THREE.MeshPhongMaterial({
    ...(sideTexture ? { map: sideTexture } : { color: '#f7f4eb' }),
    specular: 0x000000,
    shininess: 0,
  });
  configureTileStencil(mat);
  return mat;
}

/** Lit tile back, so face-down tiles retain their shape and depth. */
export function createToonBackMaterial(
  backTexture: THREE.Texture,
): THREE.MeshPhongMaterial {
  const mat = new THREE.MeshPhongMaterial({
    map: backTexture,
    specular: 0x000000,
    shininess: 0,
  });
  configureTileStencil(mat);
  return mat;
}
