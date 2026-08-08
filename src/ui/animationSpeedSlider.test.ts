import { describe, expect, it } from 'vitest';
import {
  ANIMATION_SPEEDS,
  sliderIndexToSpeed,
  speedToSliderIndex,
} from './animationSpeedSlider';

describe('animationSpeedSlider', () => {
  it('keeps the fast-forward speeds reachable', () => {
    // Regression guard: the redesigned slider briefly capped at 2x, which
    // silently removed 4x/8x replay fast-forward.
    expect(ANIMATION_SPEEDS).toContain(4);
    expect(ANIMATION_SPEEDS).toContain(8);
  });

  it('round-trips every offered speed', () => {
    ANIMATION_SPEEDS.forEach((speed) => {
      expect(sliderIndexToSpeed(speedToSliderIndex(speed))).toBe(speed);
    });
  });

  it('maps an arbitrary stored speed to the nearest step', () => {
    expect(speedToSliderIndex(0.25)).toBe(0);
    expect(speedToSliderIndex(1)).toBe(2);
    expect(speedToSliderIndex(3.5)).toBe(ANIMATION_SPEEDS.indexOf(4));
    expect(speedToSliderIndex(8)).toBe(ANIMATION_SPEEDS.length - 1);
  });

  it('breaks an exact tie towards the slower step', () => {
    // 3 is equidistant from 2 and 4.
    expect(speedToSliderIndex(3)).toBe(ANIMATION_SPEEDS.indexOf(2));
  });

  it('clamps out-of-range values instead of returning undefined', () => {
    expect(speedToSliderIndex(0)).toBe(0);
    expect(speedToSliderIndex(999)).toBe(ANIMATION_SPEEDS.length - 1);
    expect(sliderIndexToSpeed(-5)).toBe(ANIMATION_SPEEDS[0]);
    expect(sliderIndexToSpeed(999)).toBe(8);
  });
});
