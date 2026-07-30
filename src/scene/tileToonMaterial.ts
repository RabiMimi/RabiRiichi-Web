import * as THREE from 'three';

// Adjust these constants to change the Dora sliding sheen appearance.
export const DORA_SHEEN_WIDTH = 0.2;
export const DORA_SHEEN_SPEED = 2.0;

// 2-band cel shading: N·L < 0 → dark, N·L >= 0 → bright
const CEL_OVERRIDE = `
  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
  float NdotL = dot(vWorldNormal, lightDir);
  if (NdotL < 0.0) {
    gl_FragColor.rgb *= uDarkLight;
  }
`;

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

const VERTEX_NORMAL = `
  #include <common>
  varying vec3 vWorldNormal;
`;

const VERTEX_TRANSFORM = `
  #include <begin_vertex>
  vec4 wn = modelMatrix * vec4(normal, 0.0);
  vWorldNormal = normalize(wn.xyz);
`;

const UNIFORM_DECL = `
  uniform float uDarkLight;
  varying vec3 vWorldNormal;
`;

function configureTileStencil(material: THREE.Material): void {
  material.stencilWrite = true;
  material.stencilRef = 1;
  material.stencilFunc = THREE.AlwaysStencilFunc;
  material.stencilFail = THREE.KeepStencilOp;
  material.stencilZFail = THREE.KeepStencilOp;
  material.stencilZPass = THREE.ReplaceStencilOp;
}

function injectCel(material: THREE.MeshPhongMaterial) {
  configureTileStencil(material);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uDarkLight = { value: 0.998 };
    shader.fragmentShader = UNIFORM_DECL + shader.fragmentShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      VERTEX_NORMAL,
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      VERTEX_TRANSFORM,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      CEL_OVERRIDE + '\n#include <dithering_fragment>',
    );
  };
}

/** Tile face — Phong + texture + Dora sheen + 2-band cel. */
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
    shader.uniforms.uDarkLight = { value: 0.998 };
    mat.userData.uTime = uTime;
    mat.userData.isDora = uIsDora;

    shader.fragmentShader =
      `
      uniform float uTime;
      uniform float uIsDora;
      uniform float uSheenWidth;
      uniform float uSheenSpeed;
      uniform float uDarkLight;
      varying vec3 vWorldNormal;
    ` + shader.fragmentShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      VERTEX_NORMAL,
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      VERTEX_TRANSFORM,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      CEL_OVERRIDE + '\n#include <dithering_fragment>\n' + DORA_SHEEN,
    );
  };

  return mat;
}

/** Tile side — Phong + texture/color + 2-band cel. */
export function createToonSideMaterial(
  sideTexture?: THREE.Texture,
): THREE.MeshPhongMaterial {
  const mat = new THREE.MeshPhongMaterial({
    ...(sideTexture ? { map: sideTexture } : { color: '#f7f4eb' }),
    specular: 0x000000,
    shininess: 0,
  });
  injectCel(mat);
  return mat;
}

/** Tile back — Phong + texture + 2-band cel. */
export function createToonBackMaterial(
  backTexture: THREE.Texture,
): THREE.MeshPhongMaterial {
  const mat = new THREE.MeshPhongMaterial({
    map: backTexture,
    specular: 0x000000,
    shininess: 0,
  });
  injectCel(mat);
  return mat;
}
