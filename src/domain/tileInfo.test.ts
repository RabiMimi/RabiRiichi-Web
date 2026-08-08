import { describe, it, expect } from 'vitest';
import { deriveTileInfo } from './tileInfo';
import { TileSource } from '../proto';
import type { IGameTileMsg } from '../proto';

function tile(overrides: Partial<IGameTileMsg>): IGameTileMsg {
  return {
    traceId: 1,
    tile: 17,
    ...overrides,
  };
}

describe('deriveTileInfo', () => {
  it('reports the drawn jun for a tile in hand', () => {
    const facts = deriveTileInfo(tile({ drawnJun: 3 }));
    expect(facts.drawnJun).toBe(3);
    expect(facts.discardJun).toBeNull();
    expect(facts.isTedashi).toBeNull(); // not discarded yet
    expect(facts.isInitialHand).toBe(false);
  });

  it('treats jun 0 / missing as "not drawn"', () => {
    expect(deriveTileInfo(tile({ drawnJun: 0 })).drawnJun).toBeNull();
    expect(deriveTileInfo(tile({})).drawnJun).toBeNull();
  });

  it('marks an undrawn, unclaimed, undiscarded tile as the initial hand', () => {
    const facts = deriveTileInfo(tile({ drawnJun: 0 }));
    expect(facts.drawnJun).toBeNull();
    expect(facts.isInitialHand).toBe(true);
  });

  it('does not mark a discarded dealt tile as initial hand', () => {
    const facts = deriveTileInfo(
      tile({
        drawnJun: 0,
        discardInfo: { from: 0, reason: 1, time: 3, jun: 1 },
      }),
    );
    expect(facts.isInitialHand).toBe(false);
    expect(facts.isTedashi).toBe(true);
  });

  it('classifies a same-turn discard as tsumogiri', () => {
    // Drawn and discarded on the same jun => 摸切.
    const facts = deriveTileInfo(
      tile({
        drawnJun: 5,
        discardInfo: { from: 2, reason: 1, time: 40, jun: 5 },
      }),
    );
    expect(facts.discardJun).toBe(5);
    expect(facts.isTedashi).toBe(false);
    expect(facts.discardedFrom).toBe(2);
  });

  it('classifies a held tile discarded on a later turn as tedashi', () => {
    // Drawn on jun 2, discarded on jun 6 => 手切.
    const facts = deriveTileInfo(
      tile({
        drawnJun: 2,
        discardInfo: { from: 0, reason: 1, time: 55, jun: 6 },
      }),
    );
    expect(facts.discardJun).toBe(6);
    expect(facts.isTedashi).toBe(true);
  });

  it('classifies a discard after a claim (never drawn) as tedashi', () => {
    // A post-pon/chii discard: the tile was never drawn (drawnJun 0), so it can
    // never equal the discard jun => always 手切.
    const facts = deriveTileInfo(
      tile({
        drawnJun: 0,
        discardInfo: { from: 1, reason: 4, time: 60, jun: 4 },
      }),
    );
    expect(facts.drawnJun).toBeNull();
    expect(facts.discardJun).toBe(4);
    expect(facts.isTedashi).toBe(true);
  });

  it('classifies a dealt tile (jun 0) discarded on turn 1 as tedashi', () => {
    const facts = deriveTileInfo(
      tile({
        drawnJun: 0,
        discardInfo: { from: 3, reason: 1, time: 3, jun: 1 },
      }),
    );
    expect(facts.isTedashi).toBe(true);
  });

  it('marks called-meld tiles as claimed', () => {
    for (const source of [
      TileSource.TILE_SOURCE_CHII,
      TileSource.TILE_SOURCE_PON,
      TileSource.TILE_SOURCE_KAKAN,
      TileSource.TILE_SOURCE_ANKAN,
      TileSource.TILE_SOURCE_DAIMINKAN,
    ]) {
      expect(deriveTileInfo(tile({ source })).isClaimed).toBe(true);
    }
    expect(
      deriveTileInfo(tile({ source: TileSource.TILE_SOURCE_HAND })).isClaimed,
    ).toBe(false);
  });

  it('reports when an in-hand tile joined a meld', () => {
    const facts = deriveTileInfo(
      tile({
        drawnJun: 3,
        formJun: 6,
        source: TileSource.TILE_SOURCE_PON,
      }),
    );
    expect(facts.drawnJun).toBe(3);
    expect(facts.formJun).toBe(6);
    expect(facts.discardJun).toBeNull();
  });

  it('treats a negative discard "from" as no discarder', () => {
    const facts = deriveTileInfo(
      tile({
        drawnJun: 1,
        discardInfo: { from: -1, reason: 0, time: 0, jun: 0 },
      }),
    );
    expect(facts.discardedFrom).toBeNull();
    // discard jun 0 => still counts as "not discarded" for tedashi purposes.
    expect(facts.isTedashi).toBeNull();
  });
});
