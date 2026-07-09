import { describe, it, expect } from 'vitest';
import type { IEventMsg, IGameStateMsg } from '../proto';
import {
  createEmptyTileRegistry,
  extractEventTiles,
  extractSnapshotTiles,
  getPlayerDiscardsFromRegistry,
  getRegisteredTile,
  mergeTilesIntoRegistry,
} from './tileRegistry';

describe('mergeTilesIntoRegistry', () => {
  it('registers tiles by traceId', () => {
    const registry = mergeTilesIntoRegistry(createEmptyTileRegistry(), [
      { traceId: 1, tile: 17 },
      { traceId: 2, tile: 18 },
    ]);
    expect(getRegisteredTile(registry, 1)?.tile).toBe(17);
    expect(getRegisteredTile(registry, 2)?.tile).toBe(18);
  });

  it('overwrites an existing tile (last write wins)', () => {
    const first = mergeTilesIntoRegistry(createEmptyTileRegistry(), [
      { traceId: 1, tile: 17 },
    ]);
    const second = mergeTilesIntoRegistry(first, [
      { traceId: 1, tile: 17, discardInfo: { from: 0, reason: 1, time: 9 } },
    ]);
    expect(getRegisteredTile(second, 1)?.discardInfo?.time).toBe(9);
  });

  it('keeps a known face when a later record re-sends the tile face-down', () => {
    // A winner's revealed tile, then the same tile re-sent hidden (tile=0) by a
    // reconnection snapshot. The known face must survive (RabiRiichi#? "?" bug).
    const revealed = mergeTilesIntoRegistry(createEmptyTileRegistry(), [
      { traceId: 1, tile: 17 },
    ]);
    const afterHidden = mergeTilesIntoRegistry(revealed, [
      { traceId: 1, tile: 0 },
    ]);
    expect(getRegisteredTile(afterHidden, 1)?.tile).toBe(17);
  });

  it('still lets a real face value overwrite a previous one', () => {
    const first = mergeTilesIntoRegistry(createEmptyTileRegistry(), [
      { traceId: 1, tile: 17 },
    ]);
    const second = mergeTilesIntoRegistry(first, [{ traceId: 1, tile: 18 }]);
    expect(getRegisteredTile(second, 1)?.tile).toBe(18);
  });

  it('ignores tiles with non-positive traceId (face-down placeholders)', () => {
    const registry = mergeTilesIntoRegistry(createEmptyTileRegistry(), [
      { traceId: -1, tile: 0 },
      { traceId: 0, tile: 0 },
    ]);
    expect(registry.size).toBe(0);
  });

  it('does not mutate the input and returns the same instance when nothing changes', () => {
    const original = mergeTilesIntoRegistry(createEmptyTileRegistry(), [
      { traceId: 1, tile: 17 },
    ]);
    const result = mergeTilesIntoRegistry(original, [
      { traceId: -1, tile: 0 },
      null,
      undefined,
    ]);
    expect(result).toBe(original);
  });

  it('returns a new instance (clone-on-write) when a tile is added', () => {
    const original = createEmptyTileRegistry();
    const result = mergeTilesIntoRegistry(original, [{ traceId: 1, tile: 17 }]);
    expect(result).not.toBe(original);
    expect(original.size).toBe(0);
  });
});

describe('extractEventTiles', () => {
  it('pulls tiles from a discard event', () => {
    const ev: IEventMsg = {
      discardTileEvent: { playerId: 0, discarded: { traceId: 50, tile: 21 } },
    };
    expect(extractEventTiles(ev).map((t) => t.traceId)).toEqual([50]);
  });

  it('pulls the claimed tile and the whole meld from a claim event', () => {
    const ev: IEventMsg = {
      claimTileEvent: {
        playerId: 0,
        tile: { traceId: 99, tile: 17 },
        group: {
          tiles: [
            { traceId: 10, tile: 17 },
            { traceId: 11, tile: 17 },
            { traceId: 99, tile: 17 },
          ],
        },
      },
    };
    expect(
      extractEventTiles(ev)
        .map((t) => t.traceId)
        .sort(),
    ).toEqual([10, 11, 99, 99]);
  });

  it('pulls dealt hand tiles', () => {
    const ev: IEventMsg = {
      dealHandEvent: {
        playerId: 0,
        tiles: [
          { traceId: 1, tile: 17 },
          { traceId: 2, tile: 18 },
        ],
      },
    };
    expect(extractEventTiles(ev)).toHaveLength(2);
  });

  it('returns nothing for tile-less events', () => {
    expect(extractEventTiles({ nextPlayerEvent: { playerId: 1 } })).toEqual([]);
  });
});

describe('getPlayerDiscardsFromRegistry', () => {
  // discardInfo.from is a SEAT index (0..N-1), not an account id. The furiten
  // predictor relies on looking up the self player's discards by seat; passing
  // an account id here would return the wrong pile (RabiRiichi#? furiten bug).
  const registry = mergeTilesIntoRegistry(createEmptyTileRegistry(), [
    { traceId: 1, tile: 17, discardInfo: { from: 0, reason: 1, time: 1 } },
    { traceId: 2, tile: 18, discardInfo: { from: 0, reason: 1, time: 2 } },
    { traceId: 3, tile: 19, discardInfo: { from: 1, reason: 1, time: 3 } },
    { traceId: 4, tile: 20 }, // still in hand / no discardInfo
  ]);

  it('returns only the discards for the given seat', () => {
    expect(getPlayerDiscardsFromRegistry(registry, 0).sort()).toEqual([17, 18]);
    expect(getPlayerDiscardsFromRegistry(registry, 1)).toEqual([19]);
  });

  it('returns nothing for a seat with no discards', () => {
    expect(getPlayerDiscardsFromRegistry(registry, 2)).toEqual([]);
  });

  it('includes tiles claimed by others (discardInfo is preserved)', () => {
    // A claimed tile keeps its original discardInfo.from, so it still counts
    // as the original discarder's discard for furiten purposes.
    const withClaimed = mergeTilesIntoRegistry(registry, [
      { traceId: 5, tile: 21, discardInfo: { from: 0, reason: 1, time: 5 } },
    ]);
    expect(getPlayerDiscardsFromRegistry(withClaimed, 0).sort()).toEqual([
      17, 18, 21,
    ]);
  });
});

describe('extractSnapshotTiles', () => {
  it('collects tiles across wall, hands, rivers, melds, and riichi tile', () => {
    const snapshot: IGameStateMsg = {
      wall: { doras: [{ traceId: 1, tile: 17 }] },
      players: [
        {
          id: 0,
          hand: {
            freeTiles: [{ traceId: 2, tile: 18 }],
            discarded: [{ traceId: 3, tile: 19 }],
            called: [{ tiles: [{ traceId: 4, tile: 20 }] }],
            riichiTile: { traceId: 3, tile: 19 },
            pendingTile: { traceId: 5, tile: 21 },
          },
        },
      ],
    };
    const ids = extractSnapshotTiles(snapshot)
      .map((t) => t.traceId)
      .sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(ids).toEqual([1, 2, 3, 3, 4, 5]);
  });
});
