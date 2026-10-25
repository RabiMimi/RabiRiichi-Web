import { describe, it, expect } from 'vitest';
import {
  DORA_SHEEN_PERIOD_MS,
  getDoraSheenProgress,
  toGradientPercent,
} from './doraSheen';

describe('getDoraSheenProgress', () => {
  it('starts each period just before the bottom-left corner', () => {
    expect(getDoraSheenProgress(0)).toBeCloseTo(-0.7);
    expect(getDoraSheenProgress(DORA_SHEEN_PERIOD_MS * 3)).toBeCloseTo(-0.7);
  });

  it('advances linearly through the period', () => {
    expect(getDoraSheenProgress(DORA_SHEEN_PERIOD_MS / 2)).toBeCloseTo(0.55);
  });

  it('is shared by any two callers at the same instant', () => {
    const now = 123_456.789;
    expect(getDoraSheenProgress(now)).toBe(getDoraSheenProgress(now));
  });

  it('wraps negative timestamps into the same period', () => {
    expect(getDoraSheenProgress(-DORA_SHEEN_PERIOD_MS / 2)).toBeCloseTo(
      getDoraSheenProgress(DORA_SHEEN_PERIOD_MS / 2),
    );
  });
});

describe('toGradientPercent', () => {
  it('maps the u + v range 0..2 onto 0%..100%', () => {
    expect(toGradientPercent(0)).toBe(0);
    expect(toGradientPercent(1)).toBe(50);
    expect(toGradientPercent(2)).toBe(100);
  });
});
