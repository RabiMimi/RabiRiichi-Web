import { describe, expect, it } from 'vitest';
import type { PlayerAgariState } from '../domain/model';
import { getResultBadge } from './resultBadge';

/** Echoes the key so assertions read as the key that was chosen. */
const t = (key: string) => key;

function badge(
  agari: PlayerAgariState,
  flags: { isTenpai?: boolean; isNagashi?: boolean } = {},
) {
  return getResultBadge({
    isTenpai: flags.isTenpai ?? false,
    isNagashi: flags.isNagashi ?? false,
    agari,
    t,
  });
}

const won: PlayerAgariState = { gainPoints: 8000, losePoints: 0 };

describe('getResultBadge', () => {
  it('trusts the server flag for a self-draw', () => {
    expect(badge({ ...won, isTsumo: true }).label).toBe('hud.action.tsumo');
  });

  it('trusts the server flag for a ron even when a tile is attached', () => {
    expect(
      badge({ ...won, isTsumo: false, incoming: { tile: 17 } }).label,
    ).toBe('hud.action.ron');
  });

  it('falls back to the tile when the server flag is absent', () => {
    // A discarded tile carries discardInfo; a self-drawn one does not.
    expect(badge({ ...won, incoming: { tile: 17 } }).label).toBe(
      'hud.action.tsumo',
    );
    expect(
      badge({ ...won, incoming: { tile: 17, discardInfo: { jun: 3 } } }).label,
    ).toBe('hud.action.ron');
  });

  it('labels a nagashi mangan, which is neither a ron nor a tsumo', () => {
    expect(badge(won, { isNagashi: true }).label).toBe('yaku.NagashiMangan');
  });

  it('labels tenpai at an exhaustive draw', () => {
    expect(
      badge(
        { gainPoints: 1000, losePoints: 0, isTenpai: true },
        { isTenpai: true },
      ).label,
    ).toBe('result.tenpai');
  });

  it('prefers nagashi over tenpai when both are set', () => {
    // A nagashi player is tenpai-flagged too; the rarer outcome should win.
    expect(badge(won, { isNagashi: true, isTenpai: true }).label).toBe(
      'yaku.NagashiMangan',
    );
  });

  it('gives every outcome a distinct colour', () => {
    const labels = [
      badge({ ...won, isTsumo: true }),
      badge(won, { isNagashi: true }),
      badge(won, { isTenpai: true }),
    ].map((b) => b.className);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
