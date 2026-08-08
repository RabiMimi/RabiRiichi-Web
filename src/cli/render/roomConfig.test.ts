import { describe, it, expect } from 'vitest';
import {
  buildRoomConfig,
  DEFAULT_ROOM_CONFIG,
  TILE_SET_OPTIONS,
} from './roomConfig';
import { TILE_SET_PRESETS } from '../../domain/tilesets';

describe('buildRoomConfig', () => {
  it('maps the chosen options onto the wire config', () => {
    const cfg = buildRoomConfig({
      playerCount: 3,
      totalRound: 2,
      minHan: 2,
      actionTimeout: 15,
      initialPoints: 35000,
      tileSet: 'Sanma',
    });
    expect(cfg.playerCount).toBe(3);
    expect(cfg.totalRound).toBe(2);
    expect(cfg.minHan).toBe(2);
    expect(cfg.gameplayActionTimeout).toBe(15);
    expect(cfg.pointThreshold?.initialPoints).toBe(35000);
    // finishPoints is at least the starting points.
    expect(cfg.pointThreshold?.finishPoints).toBeGreaterThanOrEqual(35000);
  });

  it('uses the selected tile set preset for initialTiles', () => {
    const regular = buildRoomConfig({
      ...DEFAULT_ROOM_CONFIG,
      tileSet: 'Regular',
    });
    expect(regular.initialTiles).toEqual(
      TILE_SET_PRESETS.Regular().map((t) => t.toByte()),
    );
    const sanma = buildRoomConfig({ ...DEFAULT_ROOM_CONFIG, tileSet: 'Sanma' });
    expect(sanma.initialTiles).toEqual(
      TILE_SET_PRESETS.Sanma().map((t) => t.toByte()),
    );
  });

  it('falls back to Regular for an unknown tile set name', () => {
    const cfg = buildRoomConfig({ ...DEFAULT_ROOM_CONFIG, tileSet: 'Bogus' });
    expect(cfg.initialTiles).toEqual(
      TILE_SET_PRESETS.Regular().map((t) => t.toByte()),
    );
  });

  it('exposes the expected tile set options', () => {
    expect(TILE_SET_OPTIONS).toContain('Regular');
    expect(TILE_SET_OPTIONS).toContain('Sanma');
  });

  it('defaults to a 2-player Regular game', () => {
    expect(DEFAULT_ROOM_CONFIG.playerCount).toBe(2);
    expect(DEFAULT_ROOM_CONFIG.tileSet).toBe('Regular');
  });
});
