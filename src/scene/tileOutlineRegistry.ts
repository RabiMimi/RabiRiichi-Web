import type * as THREE from 'three';

const outlinedTiles = new Set<THREE.Object3D>();

/**
 * Registers the outer tile group used by the shared instanced outline layer.
 * The returned disposer makes registration safe across React remounts.
 */
export function registerTileOutline(node: THREE.Object3D): () => void {
  outlinedTiles.add(node);
  return () => {
    outlinedTiles.delete(node);
  };
}

export function getOutlinedTiles(): ReadonlySet<THREE.Object3D> {
  return outlinedTiles;
}

export function isEffectivelyVisible(node: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

export function resetTileOutlineRegistryForTests(): void {
  outlinedTiles.clear();
}
