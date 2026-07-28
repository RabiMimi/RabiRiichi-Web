import { preloadImages } from '../lib/imagePreload';

/** The countdown is drawn from these ten glyph images, one per digit. */
export const TIMER_DIGITS = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
] as const;

export function getTimerDigitPath(digit: string): string {
  return `/assets/timer/${digit}.png`;
}

export const TIMER_DIGIT_PATHS = TIMER_DIGITS.map(getTimerDigitPath);

/**
 * Warms every digit glyph so the countdown never shows a stale one.
 *
 * The HUD renders the seconds as position-keyed `<img>` tags, so ticking from
 * 10 to 9 drops one tag and swaps `src` on the one that remains. A cold swap
 * target keeps painting its previous glyph until the new file decodes, which
 * rendered "10" as a flash of "1" before settling on "9". Warming the glyphs
 * makes the swap synchronous, so no intermediate value is ever shown.
 */
export function preloadTimerDigits(): Promise<void> {
  return preloadImages(TIMER_DIGIT_PATHS);
}
