import { beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  getOutlinedTiles,
  isEffectivelyVisible,
  registerTileOutline,
  resetTileOutlineRegistryForTests,
} from './tileOutlineRegistry';

beforeEach(() => {
  resetTileOutlineRegistryForTests();
});

describe('tile outline registry', () => {
  it('tracks each registered tile once and removes it through its disposer', () => {
    const tile = new THREE.Object3D();
    const disposeFirst = registerTileOutline(tile);
    registerTileOutline(tile);

    expect(getOutlinedTiles()).toEqual(new Set([tile]));

    disposeFirst();
    expect(getOutlinedTiles().size).toBe(0);
  });

  it('detects visibility inherited from tile ancestors', () => {
    const root = new THREE.Group();
    const tile = new THREE.Group();
    root.add(tile);

    expect(isEffectivelyVisible(tile)).toBe(true);

    root.visible = false;
    expect(isEffectivelyVisible(tile)).toBe(false);
  });
});
