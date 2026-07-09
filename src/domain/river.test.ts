import { describe, it, expect } from 'vitest';
import type { IGameTileMsg } from '../proto';
import { getRiichiSidewaysTraceId } from './river';
import {
  createEmptyTileRegistry,
  mergeTilesIntoRegistry,
} from './tileRegistry';

function discard(traceId: number, time: number): IGameTileMsg {
  return { traceId, tile: 17, discardInfo: { from: 0, reason: 1, time } };
}

describe('getRiichiSidewaysTraceId', () => {
  it('returns 0 when the player is not in riichi', () => {
    const river = [discard(1, 1), discard(2, 2)];
    expect(getRiichiSidewaysTraceId(river, 0, createEmptyTileRegistry())).toBe(
      0,
    );
  });

  it('returns 0 for an empty river', () => {
    expect(getRiichiSidewaysTraceId([], 5, createEmptyTileRegistry())).toBe(0);
  });

  it('returns the declaration tile when it is still in the river', () => {
    const river = [discard(1, 1), discard(2, 2), discard(3, 3)];
    const registry = mergeTilesIntoRegistry(createEmptyTileRegistry(), river);
    // Declared riichi on the second discard.
    expect(getRiichiSidewaysTraceId(river, 2, registry)).toBe(2);
  });

  it('promotes the next surviving discard when the declaration tile was called', () => {
    // Player discarded tiles 1,2,3(=riichi declaration). Tile 3 then gets called
    // away (pon), so it is no longer in the river but a later discard (4) is.
    const declaration = discard(3, 3);
    const river = [discard(1, 1), discard(2, 2), discard(4, 4)];
    const registry = mergeTilesIntoRegistry(createEmptyTileRegistry(), [
      ...river,
      declaration, // registry still remembers the called-away tile
    ]);

    expect(getRiichiSidewaysTraceId(river, 3, registry)).toBe(4);
  });

  it('repeats: promotes the first surviving discard after several calls', () => {
    // Declaration (3) and the next discard (4) were both called away; the first
    // survivor at-or-after the declaration time is tile 5.
    const declaration = discard(3, 3);
    const calledNext = discard(4, 4);
    const river = [discard(1, 1), discard(2, 2), discard(5, 5), discard(6, 6)];
    const registry = mergeTilesIntoRegistry(createEmptyTileRegistry(), [
      ...river,
      declaration,
      calledNext,
    ]);

    expect(getRiichiSidewaysTraceId(river, 3, registry)).toBe(5);
  });

  it('returns 0 when the declaration tile was called and no later discard exists yet', () => {
    // Riichi tile called immediately; player has not discarded again.
    const declaration = discard(3, 3);
    const river = [discard(1, 1), discard(2, 2)];
    const registry = mergeTilesIntoRegistry(createEmptyTileRegistry(), [
      ...river,
      declaration,
    ]);

    expect(getRiichiSidewaysTraceId(river, 3, registry)).toBe(0);
  });

  it('returns 0 when the declaration tile is unknown to the registry', () => {
    // Defensive: declaration tile is gone from the river and never registered,
    // so we cannot locate its successor and render nothing sideways.
    const river = [discard(1, 1), discard(2, 2)];
    expect(getRiichiSidewaysTraceId(river, 99, createEmptyTileRegistry())).toBe(
      0,
    );
  });

  it('finds the successor in a longer time-sorted river', () => {
    // Rivers are always ascending by discardInfo.time; the declaration (time 30)
    // was called away, so the successor is the next surviving discard (time 40).
    const declaration = discard(30, 30);
    const river = [
      discard(10, 10),
      discard(20, 20),
      discard(40, 40),
      discard(50, 50),
      discard(60, 60),
    ];
    const registry = mergeTilesIntoRegistry(createEmptyTileRegistry(), [
      ...river,
      declaration,
    ]);

    expect(getRiichiSidewaysTraceId(river, 30, registry)).toBe(40);
  });

  it('matches the declaration tile exactly when present (sorted river)', () => {
    const river = [
      discard(10, 10),
      discard(20, 20),
      discard(30, 30),
      discard(40, 40),
    ];
    const registry = mergeTilesIntoRegistry(createEmptyTileRegistry(), river);
    expect(getRiichiSidewaysTraceId(river, 30, registry)).toBe(30);
  });
});
