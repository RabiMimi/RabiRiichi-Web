import { describe, expect, it } from 'vitest';
import {
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
