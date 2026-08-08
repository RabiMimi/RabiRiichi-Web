import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { _resetImagePreloadCache } from '../lib/imagePreload';
import {
  TIMER_DIGITS,
  TIMER_DIGIT_PATHS,
  getTimerDigitPath,
  preloadTimerDigits,
} from './timerDigits';

describe('timer digit glyphs', () => {
  it('maps a digit to its glyph file', () => {
    expect(getTimerDigitPath('0')).toBe('/assets/timer/0.png');
    expect(getTimerDigitPath('9')).toBe('/assets/timer/9.png');
  });

  it('covers all ten digits with no gaps or repeats', () => {
    expect(TIMER_DIGITS).toHaveLength(10);
    expect(new Set(TIMER_DIGIT_PATHS).size).toBe(10);
  });

  it('warms every glyph the countdown can render', () => {
    // The HUD builds its glyph list with String(seconds).split(''), so any
    // second it can display must resolve to a warmed path.
    for (let seconds = 1; seconds <= 99; seconds++) {
      for (const digit of String(seconds).split('')) {
        expect(TIMER_DIGIT_PATHS).toContain(getTimerDigitPath(digit));
      }
    }
  });
});

describe('preloadTimerDigits', () => {
  const created: { src: string }[] = [];

  beforeEach(() => {
    created.length = 0;
    _resetImagePreloadCache();
    class FakeImage {
      src = '';
      decode = vi.fn(() => Promise.resolve());
      constructor() {
        created.push(this);
      }
    }
    vi.stubGlobal('Image', FakeImage);
    vi.stubGlobal('window', { Image: FakeImage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('warms all ten glyphs so 10 -> 9 never repaints a stale digit', async () => {
    await preloadTimerDigits();

    expect(created.map((i) => i.src).sort()).toEqual(
      [...TIMER_DIGIT_PATHS].sort(),
    );
  });
});
