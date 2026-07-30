import * as THREE from 'three';

// Adjust these constants to change the Dora sliding sheen appearance.
export const DORA_SHEEN_WIDTH = 0.2;
export const DORA_SHEEN_SPEED = 2.0;

const DORA_SHEEN = `
  if (uIsDora > 0.5) {
    #ifdef USE_MAP
      vec2 uv = vMapUv;
    #else
      vec2 uv = vec2(0.5);
    #endif
    float progress = mod(uTime * uSheenSpeed, 2.5) - 0.7;
    float d = abs(uv.x + uv.y - progress);
    float sheen = smoothstep(uSheenWidth, 0.0, d) * 0.75;
    gl_FragColor.rgb += vec3(sheen);
  }
`;

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
    const uTime = { value: 0 };
    const uIsDora = { value: 0 };
    shader.uniforms.uTime = uTime;
    shader.uniforms.uIsDora = uIsDora;
    shader.uniforms.uSheenWidth = { value: DORA_SHEEN_WIDTH };
    shader.uniforms.uSheenSpeed = { value: DORA_SHEEN_SPEED };
    mat.userData.uTime = uTime;
    mat.userData.isDora = uIsDora;

    shader.fragmentShader =
      `
      uniform float uTime;
      uniform float uIsDora;
      uniform float uSheenWidth;
      uniform float uSheenSpeed;
    ` + shader.fragmentShader;

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
