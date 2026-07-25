import type * as THREE from 'three';

/**
 * Registry of tiles that want a toon outline.
 *
 * Outlines are drawn with the inverted-hull trick: a slightly enlarged copy of
 * the tile, rendered back-faces-only behind the tile itself. Done naively that
 * is one extra mesh — and therefore one extra draw call — per tile, and a full
 * table carries 130+ tiles.
 *
 * three.js does not merge meshes automatically: every `Mesh` has its own model
 * matrix, so it is its own draw call. But these hulls all share one geometry and
 * one material and differ *only* by transform, which is exactly what
 * `InstancedMesh` exists for. Tiles register their (already scaled) group here,
 * and `TileOutlineLayer` draws every hull in a single instanced call.
 */
const registry = new Set<THREE.Object3D>();

/** Registers a tile group; returns a disposer. */
export function registerTileOutline(node: THREE.Object3D): () => void {
  registry.add(node);
  return () => {
    registry.delete(node);
  };
}

/** The currently registered tile groups. */
export function getRegisteredTileOutlines(): ReadonlySet<THREE.Object3D> {
  return registry;
}

/** Resets the registry (useful for tests). */
export function _resetTileOutlineRegistry(): void {
  registry.clear();
}

/**
 * Whether an object and all of its ancestors are visible.
 *
 * An instanced hull is not part of the tile's subtree, so it does not inherit
 * the tile's visibility — it has to be checked explicitly, or hidden tiles
 * would keep their outlines.
 */
export function isEffectivelyVisible(node: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}
