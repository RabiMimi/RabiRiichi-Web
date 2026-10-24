import { describe, expect, it } from 'vitest';
import {
  getDisplayHan,
  getFinalPlacementVoiceLineId,
  getYakuhaiWindVoiceLineId,
  getYakuVoiceLineId,
} from './resultHelpers';

describe('result voice helpers', () => {
  it('only reacts to first and last place', () => {
    expect(getFinalPlacementVoiceLineId(1, 4)).toBe('win');
    expect(getFinalPlacementVoiceLineId(2, 4)).toBeNull();
    expect(getFinalPlacementVoiceLineId(3, 4)).toBeNull();
    expect(getFinalPlacementVoiceLineId(4, 4)).toBe('lose');
    expect(getFinalPlacementVoiceLineId(3, 3)).toBe('lose');
    expect(getFinalPlacementVoiceLineId(2, 2)).toBe('lose');
  });

  it('maps prevailing-wind yakuhai to the current round wind', () => {
    expect(getYakuhaiWindVoiceLineId('YakuhaiBakaze', 0, 0, 2, 4)).toBe(
      'kazeTon',
    );
    expect(getYakuhaiWindVoiceLineId('YakuhaiBakaze', 2, 1, 0, 4)).toBe(
      'kazeSha',
    );
  });

  it('maps seat-wind yakuhai relative to the dealer', () => {
    expect(getYakuhaiWindVoiceLineId('YakuhaiJikaze', 0, 2, 2, 4)).toBe(
      'kazeTon',
    );
    expect(getYakuhaiWindVoiceLineId('YakuhaiJikaze', 0, 2, 1, 4)).toBe(
      'kazePei',
    );
  });

  it('passes the resolved wind through the yaku voice mapping', () => {
    expect(getYakuVoiceLineId('YakuhaiBakaze', 1, 'kazeNan')).toBe('kazeNan');
    expect(getYakuVoiceLineId('YakuhaiJikaze', 1, 'kazePei')).toBe('kazePei');
  });

  it('does not play a dora voice for a zero count', () => {
    expect(getYakuVoiceLineId('Dora', 0)).toBeNull();
    expect(getYakuVoiceLineId('Akadora', 0)).toBeNull();
    expect(getYakuVoiceLineId('Dora', 1)).toBe('dora1');
  });
});

describe('getDisplayHan', () => {
  // The wildcard win from the bug report: 17 han of ordinary yaku and dora
  // plus 8 yakuman (6 counted, 2 doubled), on an uncapped table.
  const result = { han: 17, fu: 60, yakuman: 8, bonusYakuman: 0 };

  it('folds yakuman into the total with uncapped scoring', () => {
    expect(getDisplayHan(result, true)).toBe(17 + 8 * 13);
    expect(getDisplayHan({ han: 2, yakuman: 1, bonusYakuman: 1 }, true)).toBe(
      2 + 2 * 13,
    );
  });

  it('reports plain han when yakuman are capped', () => {
    expect(getDisplayHan(result, false)).toBe(17);
    expect(getDisplayHan({}, true)).toBe(0);
  });
});
