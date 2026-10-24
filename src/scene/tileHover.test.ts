import { describe, expect, it } from 'vitest';
import {
  getIntersectedTileTraceId,
  TouchTileHoverState,
  type TileHoverNode,
} from './tileHover';

const tile = (traceId: number, isIdentifiable = true): TileHoverNode => ({
  parent: null,
  userData: { traceId, isIdentifiable },
});
const touch = { pointerId: 1, pointerType: 'touch', isPrimary: true };

describe('touch tile inspection', () => {
  it('shows info immediately on touch and follows each tile under the finger', () => {
    const state = new TouchTileHoverState();
    expect(state.begin(touch)).toBe(true);
    state.move(1, 10);
    expect(state.traceId).toBe(10);
    state.move(1, 20);
    expect(state.traceId).toBe(20);
    state.move(1, null);
    expect(state.traceId).toBeNull();
    state.move(1, 30);
    expect(state.traceId).toBe(30);
    expect(state.end(1)).toBe(true);
    expect(state.traceId).toBeNull();
  });

  it('can start on empty space and inspect tiles after moving onto them', () => {
    const state = new TouchTileHoverState();
    state.begin(touch);
    expect(state.traceId).toBeNull();
    state.move(1, 12);
    expect(state.traceId).toBe(12);
  });

  it('does not let another finger move or clear the active inspection', () => {
    const state = new TouchTileHoverState();
    state.begin(touch);
    state.move(1, 12);
    expect(state.begin({ ...touch, pointerId: 2, isPrimary: false })).toBe(
      false,
    );
    expect(state.move(2, 99)).toBe(false);
    expect(state.end(2)).toBe(false);
    expect(state.traceId).toBe(12);
  });

  it('clears cancellation and ignores subsequent movement from the old pointer', () => {
    const state = new TouchTileHoverState();
    state.begin(touch);
    state.move(1, 12);
    state.clear();
    expect(state.traceId).toBeNull();
    expect(state.move(1, 99)).toBe(false);
    expect(state.begin({ ...touch, pointerId: 3 })).toBe(true);
    state.move(3, 13);
    expect(state.traceId).toBe(13);
  });

  it('leaves mouse hover alone and supports a touching pen', () => {
    const state = new TouchTileHoverState();
    expect(state.begin({ ...touch, pointerType: 'mouse' })).toBe(false);
    expect(state.begin({ ...touch, pointerType: 'pen' })).toBe(true);
  });
});

describe('table tile hit testing', () => {
  it('finds the tile identity through its mesh ancestors', () => {
    const mesh: TileHoverNode = { parent: tile(10), userData: {} };
    expect(getIntersectedTileTraceId([mesh])).toBe(10);
  });

  it('uses the nearest tile and skips unrelated objects', () => {
    expect(
      getIntersectedTileTraceId([
        { parent: null, userData: {} },
        tile(10),
        tile(20),
      ]),
    ).toBe(10);
  });

  it('does not inspect unknown faces or see through them to other tiles', () => {
    expect(getIntersectedTileTraceId([tile(10, false), tile(20)])).toBeNull();
  });

  it('clears info when there is no tile under the finger', () => {
    expect(getIntersectedTileTraceId([])).toBeNull();
    expect(
      getIntersectedTileTraceId([{ parent: null, userData: {} }]),
    ).toBeNull();
  });
});
