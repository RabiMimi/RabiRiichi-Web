/**
 * The table camera's resting pose, and the projection maths that follow from it.
 *
 * Pure vector maths, deliberately free of three.js, so the DOM hand can size
 * itself against the 3D tiles without pulling the renderer into the UI layer.
 * `CameraController` in App.tsx drives the real camera from the same numbers, so
 * the two cannot drift apart.
 */

/** Vertical field of view of the table camera, in degrees. Never animated. */
export const CAMERA_FOV_DEG = 50;

/**
 * World size of a tile, matching the `<group scale>` Tile3D wraps the mesh in.
 * The GLB itself is a unit cube, so this scale *is* the rendered size.
 */
export const TILE_WORLD_SIZE = {
  width: 0.18,
  height: 0.24,
  depth: 0.12,
} as const;

/**
 * Centre of the local player's hand row in world space.
 *
 * The seat anchor sits at z = 2.4, the hand group is pushed 0.2 toward the
 * table, and the 'hand' pose lifts tiles by 0.13. Nothing is rendered here
 * today — the local hand is DOM — but this is where its tiles would stand.
 */
export const LOCAL_HAND_WORLD_POS: readonly [number, number, number] = [
  0, 0.13, 2.2,
];

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

/**
 * Resting camera pose for a viewport aspect.
 *
 * Narrower windows pull the camera up and back so the whole table stays in
 * frame; at 16:9 and wider `k` is 1 and the pose is the plain default.
 */
export function getDefaultCameraPose(aspect: number): CameraPose {
  const k = Math.max(1.0, 1.77 / aspect);
  return {
    position: [0, 3.0 * k, 2.42 + 0.98 * k],
    target: [0, 0, 2.42 - 1.83 * k],
  };
}

function subtract(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function magnitude(v: readonly [number, number, number]): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function dot(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * CSS pixels one world unit covers at `point`, under the resting camera.
 *
 * This is the perspective divide: the viewport spans `2·tan(fov/2)·depth` world
 * units at that depth, where depth is measured along the view axis rather than
 * as a straight distance.
 *
 * It deliberately ignores any orbiting the player has done. The result stays
 * stable while they look around, and matches exactly in the locked default the
 * camera almost always sits in.
 */
export function getPixelsPerWorldUnit(
  viewportWidth: number,
  viewportHeight: number,
  point: readonly [number, number, number],
): number {
  if (viewportWidth <= 0 || viewportHeight <= 0) return 0;

  const { position, target } = getDefaultCameraPose(
    viewportWidth / viewportHeight,
  );
  const forward = subtract(target, position);
  const forwardLength = magnitude(forward);
  if (forwardLength === 0) return 0;

  const viewAxis: [number, number, number] = [
    forward[0] / forwardLength,
    forward[1] / forwardLength,
    forward[2] / forwardLength,
  ];
  const depth = dot(subtract(point, position), viewAxis);
  if (depth <= 0) return 0;

  const frustumHeight =
    2 * Math.tan((CAMERA_FOV_DEG * Math.PI) / 180 / 2) * depth;
  return viewportHeight / frustumHeight;
}
