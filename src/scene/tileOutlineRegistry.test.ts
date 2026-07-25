import { beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  _resetTileOutlineRegistry,
  getRegisteredTileOutlines,
  isEffectivelyVisible,
  registerTileOutline,
} from './tileOutlineRegistry';

beforeEach(() => {
  _resetTileOutlineRegistry();
});

describe('registerTileOutline', () => {
  it('tracks registered tiles', () => {
    const a = new THREE.Object3D();
    const b = new THREE.Object3D();
    registerTileOutline(a);
    registerTileOutline(b);
    expect(getRegisteredTileOutlines().size).toBe(2);
  });

  it('removes a tile when its disposer runs', () => {
    const node = new THREE.Object3D();
    const dispose = registerTileOutline(node);
    dispose();
    expect(getRegisteredTileOutlines().size).toBe(0);
  });

  it('does not double-count a tile registered twice', () => {
    const node = new THREE.Object3D();
    registerTileOutline(node);
    registerTileOutline(node);
    expect(getRegisteredTileOutlines().size).toBe(1);
  });

  it('tolerates disposing twice', () => {
    const node = new THREE.Object3D();
    const dispose = registerTileOutline(node);
    dispose();
    expect(() => dispose()).not.toThrow();
    expect(getRegisteredTileOutlines().size).toBe(0);
  });
});

describe('isEffectivelyVisible', () => {
  it('accepts a visible, unparented node', () => {
    expect(isEffectivelyVisible(new THREE.Object3D())).toBe(true);
  });

  it('rejects a node that is itself hidden', () => {
    const node = new THREE.Object3D();
    node.visible = false;
    expect(isEffectivelyVisible(node)).toBe(false);
  });

  it('rejects a visible node under a hidden ancestor', () => {
    // The hull is not parented to the tile, so it cannot inherit this and has
    // to consult the whole chain.
    const root = new THREE.Object3D();
    const middle = new THREE.Object3D();
    const leaf = new THREE.Object3D();
    root.add(middle);
    middle.add(leaf);

    root.visible = false;
    expect(isEffectivelyVisible(leaf)).toBe(false);

    root.visible = true;
    expect(isEffectivelyVisible(leaf)).toBe(true);
  });
});
