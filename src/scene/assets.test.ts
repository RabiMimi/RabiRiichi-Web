import { describe, it, expect } from 'vitest';
import type { IMenLikeMsg, IGameTileMsg } from '../proto';
import {
  getTileTexturePath,
  getMeldsLeftEdge,
  getHandShiftX,
  TILE_LAYOUT,
} from './assets';
import { Tile } from '../domain/tile';

describe('scene assets registry', () => {
  it('should map valid tile strings to correct texture paths', () => {
    expect(getTileTexturePath('1m')).toBe('/assets/hand_tiles/1m.jpg');
    expect(getTileTexturePath('9s')).toBe('/assets/hand_tiles/9s.jpg');
    expect(getTileTexturePath('r5p')).toBe('/assets/hand_tiles/r5p.jpg');
    expect(getTileTexturePath('7z')).toBe('/assets/hand_tiles/7z.jpg');
  });

  it('should map Tile objects to correct texture paths', () => {
    expect(getTileTexturePath(Tile.fromString('3m'))).toBe(
      '/assets/hand_tiles/3m.jpg',
    );
    expect(getTileTexturePath(Tile.fromString('r5s'))).toBe(
      '/assets/hand_tiles/r5s.jpg',
    );
    expect(getTileTexturePath(Tile.fromString('5z'))).toBe(
      '/assets/hand_tiles/5z.jpg',
    );
  });

  it('should fallback to blank.jpg for invalid or unknown tiles', () => {
    expect(getTileTexturePath(null)).toBe('/assets/hand_tiles/blank.jpg');
    expect(getTileTexturePath('0x')).toBe('/assets/hand_tiles/blank.jpg');
    expect(getTileTexturePath('9z')).toBe('/assets/hand_tiles/blank.jpg'); // invalid dragon
    expect(getTileTexturePath('10m')).toBe('/assets/hand_tiles/blank.jpg'); // invalid rank
  });

  it('should map front, blank and back special textures correctly', () => {
    expect(getTileTexturePath('front')).toBe('/assets/hand_tiles/front.jpg');
    expect(getTileTexturePath('blank')).toBe('/assets/hand_tiles/blank.jpg');
    expect(getTileTexturePath('back')).toBe('/assets/hand_tiles/back.jpg');
  });
});

const SEAT = 0;
let nextTraceId = 1;

function ownTile(formTime = 0): IGameTileMsg {
  return { traceId: nextTraceId++, tile: 0x11, formTime };
}

/** A tile called from another player (foreign discardInfo). */
function calledTile(formTime = 0): IGameTileMsg {
  return {
    traceId: nextTraceId++,
    tile: 0x11,
    formTime,
    discardInfo: { from: 1 },
  };
}

function meld(tiles: IGameTileMsg[]): IMenLikeMsg {
  return { tiles };
}

const W_N = TILE_LAYOUT.normalWidth;
const W_S = TILE_LAYOUT.sidewaysWidth;
const GAP = TILE_LAYOUT.tileGap;

/** The widths Melds3D.tsx actually renders, derived independently here. */
const RENDER_WIDTH = {
  chi: W_S + 2 * W_N + 2 * GAP,
  pon: W_S + 2 * W_N + 2 * GAP,
  ankan: 4 * W_N + 3 * GAP,
  daiminkan: W_S + 3 * W_N + 3 * GAP,
  kakan: W_S + 2 * W_N + 2 * GAP, // added tile stacks on top, no extra width
} as const;

describe('getMeldsLeftEdge meld widths (RabiMimi/RabiRiichi#77)', () => {
  it('returns the start anchor when there are no melds', () => {
    expect(getMeldsLeftEdge([], SEAT)).toBe(TILE_LAYOUT.meldsStartX);
  });

  const cases: { name: keyof typeof RENDER_WIDTH; tiles: IGameTileMsg[] }[] = [
    { name: 'chi', tiles: [calledTile(), ownTile(), ownTile()] },
    { name: 'pon', tiles: [calledTile(), ownTile(), ownTile()] },
    { name: 'ankan', tiles: [ownTile(), ownTile(), ownTile(), ownTile()] },
    {
      name: 'daiminkan',
      tiles: [calledTile(), ownTile(), ownTile(), ownTile()],
    },
    // Kakan: pon (1 called + 2 own) plus a later-formed added tile.
    {
      name: 'kakan',
      tiles: [calledTile(0), ownTile(0), ownTile(0), ownTile(5)],
    },
  ];

  for (const { name, tiles } of cases) {
    it(`computes ${name} width consistently with the rendered layout`, () => {
      const edge = getMeldsLeftEdge([meld(tiles)], SEAT);
      const width = TILE_LAYOUT.meldsStartX - edge;
      expect(width).toBeCloseTo(RENDER_WIDTH[name], 6);
    });
  }

  it('accounts for a kan being wider than a chi/pon in a mixed hand', () => {
    const withPon = getMeldsLeftEdge(
      [meld([calledTile(), ownTile(), ownTile()])],
      SEAT,
    );
    const withDaiminkan = getMeldsLeftEdge(
      [meld([calledTile(), ownTile(), ownTile(), ownTile()])],
      SEAT,
    );
    // The kan extends further left (smaller X) than the pon.
    expect(withDaiminkan).toBeLessThan(withPon);
  });
});

describe('getHandShiftX overlap avoidance (RabiMimi/RabiRiichi#77)', () => {
  it('does not shift when there are no melds', () => {
    expect(getHandShiftX([], SEAT, 13, false)).toBe(0);
  });

  it('never returns a positive shift', () => {
    const called = [meld([calledTile(), ownTile(), ownTile(), ownTile()])];
    expect(getHandShiftX(called, SEAT, 1, false)).toBeLessThanOrEqual(0);
  });

  function handRightEdge(shift: number, k: number, pending: boolean): number {
    const spacing = TILE_LAYOUT.handSpacing;
    const half = TILE_LAYOUT.normalWidth / 2;
    const center = pending
      ? ((k - 1) / 2 + 1) * spacing + TILE_LAYOUT.pendingGap
      : ((k - 1) / 2) * spacing;
    return shift + center + half;
  }

  const daiminkan = (): IMenLikeMsg =>
    meld([calledTile(), ownTile(), ownTile(), ownTile()]);
  const pon = (): IMenLikeMsg => meld([calledTile(), ownTile(), ownTile()]);

  it('keeps the hand edge left of the meld edge for daiminkan melds', () => {
    // Three kans is the "too many melds" case from the issue.
    const called = [daiminkan(), daiminkan(), daiminkan()];
    const k = 4;
    const shift = getHandShiftX(called, SEAT, k, false);
    const meldsEdge = getMeldsLeftEdge(called, SEAT);
    expect(shift).toBeLessThan(0);
    expect(handRightEdge(shift, k, false)).toBeLessThanOrEqual(
      meldsEdge + 1e-9,
    );
  });

  it('leaves room for the drawn pending tile without overlapping kans', () => {
    const called = [daiminkan(), daiminkan(), daiminkan()];
    const k = 1;
    const shift = getHandShiftX(called, SEAT, k, true);
    const meldsEdge = getMeldsLeftEdge(called, SEAT);
    expect(handRightEdge(shift, k, true)).toBeLessThanOrEqual(meldsEdge + 1e-9);
  });

  it('shifts a kan-heavy hand further left than a pon-heavy hand', () => {
    const k = 4;
    const ponHand = [pon(), pon(), pon()];
    const kanHand = [daiminkan(), daiminkan(), daiminkan()];
    const shiftPon = getHandShiftX(ponHand, SEAT, k, false);
    const shiftKan = getHandShiftX(kanHand, SEAT, k, false);
    expect(shiftPon).toBeLessThan(0);
    expect(shiftKan).toBeLessThan(shiftPon);
  });
});
