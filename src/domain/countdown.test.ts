import { describe, expect, it } from 'vitest';
import {
  displayedSecondChanged,
  displayedSeconds,
  remainingSeconds,
  shouldSoundUrgency,
} from './countdown';

describe('remainingSeconds', () => {
  it('reads the gap to the deadline', () => {
    expect(remainingSeconds(10_000, 0)).toBe(10);
    expect(remainingSeconds(10_000, 4_400)).toBe(5.6);
  });

  it('never goes negative once the deadline passes', () => {
    expect(remainingSeconds(10_000, 10_000)).toBe(0);
    expect(remainingSeconds(10_000, 999_999)).toBe(0);
  });

  it('self-corrects after a late tick instead of drifting', () => {
    // A tick that arrives 350ms late still reports the true remaining time.
    // Subtracting a fixed step per tick would have reported 9.9 here.
    expect(remainingSeconds(10_000, 450)).toBe(9.6);
  });

  it('collapses to zero across a backgrounded tab, not a stale figure', () => {
    // Browsers clamp background timers to a second or more and may suspend
    // them; the clock must reflect the elapsed wall time on the next tick.
    expect(remainingSeconds(10_000, 60_000)).toBe(0);
  });

  it('is exact over a full countdown rather than accumulating error', () => {
    // 100 ticks of a tenth: an accumulating counter is where float drift and
    // rounding compound, so walk the whole clock down.
    const deadline = 10_000;
    for (let elapsed = 0; elapsed <= 10_000; elapsed += 100) {
      expect(remainingSeconds(deadline, elapsed)).toBeCloseTo(
        (10_000 - elapsed) / 1000,
        10,
      );
    }
  });
});

describe('displayedSeconds', () => {
  it('shows the whole second being counted through', () => {
    expect(displayedSeconds(10)).toBe(10);
    expect(displayedSeconds(9.9)).toBe(10);
    expect(displayedSeconds(9.1)).toBe(10);
    expect(displayedSeconds(9)).toBe(9);
    expect(displayedSeconds(0.1)).toBe(1);
    expect(displayedSeconds(0)).toBe(0);
  });
});

describe('displayedSecondChanged', () => {
  it('is quiet while only the tenths move', () => {
    expect(displayedSecondChanged(9.9, 9.8)).toBe(false);
    expect(displayedSecondChanged(9.2, 9.1)).toBe(false);
  });

  it('fires as the figure rolls over', () => {
    // 9.1 still reads "10"; dropping to exactly 9 is what repaints it.
    expect(displayedSecondChanged(9.1, 9)).toBe(true);
    // ...and the last second holds "1" all the way down to zero.
    expect(displayedSecondChanged(1, 0.9)).toBe(false);
    expect(displayedSecondChanged(0.9, 0)).toBe(true);
  });

  it('fires once for a tick that skipped several seconds', () => {
    expect(displayedSecondChanged(9.5, 2.5)).toBe(true);
  });
});

describe('shouldSoundUrgency', () => {
  it('stays silent above the threshold', () => {
    expect(shouldSoundUrgency(7.1, 7)).toBe(false);
    expect(shouldSoundUrgency(6.1, 6)).toBe(false);
  });

  it('sounds on each second inside the threshold', () => {
    expect(shouldSoundUrgency(5.1, 5)).toBe(true);
    expect(shouldSoundUrgency(1.1, 1)).toBe(true);
  });

  it('does not repeat within the same second', () => {
    expect(shouldSoundUrgency(4.9, 4.8)).toBe(false);
  });

  it('sounds once, not in a burst, when a tab comes back', () => {
    // A single tick crossing 9s -> 2s must not fire once per second skipped.
    expect(shouldSoundUrgency(9, 2)).toBe(true);
  });

  it('is silent once the clock has run out', () => {
    // Expiry has its own handling; the cue would just talk over it.
    expect(shouldSoundUrgency(0.5, 0)).toBe(false);
  });
});
