import { describe, expect, it } from 'vitest';
import { scoringToggles } from './scoringToggles';

const KIRIAGE = 1;
const YAKUMAN = 2;
const MULTIPLE = 4;
const KAZOE = 8;

/** The bitfield after flipping one option, by key. */
function flip(scoringOption: number, key: string): number {
  const opt = scoringToggles(scoringOption, false).find((o) => o.key === key);
  if (!opt) throw new Error(`no such toggle: ${key}`);
  return opt.next;
}

function stateOf(scoringOption: number): Record<string, boolean> {
  return Object.fromEntries(
    scoringToggles(scoringOption, false).map((o) => [o.key, o.checked]),
  );
}

describe('scoringToggles', () => {
  it('reads each flag off its own bit', () => {
    expect(stateOf(0)).toMatchObject({
      kiriageMangan: false,
      yakuman: false,
      multipleYakuman: false,
      kazoeYakuman: false,
    });
    expect(stateOf(KIRIAGE | YAKUMAN | MULTIPLE | KAZOE)).toMatchObject({
      kiriageMangan: true,
      yakuman: true,
      multipleYakuman: true,
      kazoeYakuman: true,
    });
  });

  it('treats aotenjou as the exact inverse of yakuman', () => {
    // Not a bit of its own: no-limit scoring is simply yakuman being off.
    for (const field of [0, KIRIAGE, YAKUMAN, YAKUMAN | KAZOE, 15]) {
      const s = stateOf(field);
      expect(s.aotenjou).toBe(!s.yakuman);
    }
  });

  it('toggling kiriage leaves every other flag alone', () => {
    const before = YAKUMAN | MULTIPLE | KAZOE;
    expect(flip(before, 'kiriageMangan')).toBe(before | KIRIAGE);
    expect(flip(before | KIRIAGE, 'kiriageMangan')).toBe(before);
  });

  it('turning yakuman off drops the options that depend on it', () => {
    const all = KIRIAGE | YAKUMAN | MULTIPLE | KAZOE;
    // Multiple and kazoe are meaningless without yakuman scoring; kiriage is
    // independent and must survive.
    expect(flip(all, 'yakuman')).toBe(KIRIAGE);
  });

  it('turning aotenjou on is the same edit as turning yakuman off', () => {
    const all = KIRIAGE | YAKUMAN | MULTIPLE | KAZOE;
    expect(flip(all, 'aotenjou')).toBe(flip(all, 'yakuman'));
  });

  it('turning aotenjou off restores yakuman scoring', () => {
    expect(flip(KIRIAGE, 'aotenjou')).toBe(KIRIAGE | YAKUMAN);
  });

  it('enabling a dependent option implies yakuman', () => {
    expect(flip(0, 'multipleYakuman')).toBe(MULTIPLE | YAKUMAN);
    expect(flip(0, 'kazoeYakuman')).toBe(KAZOE | YAKUMAN);
  });

  it('disabling a dependent option leaves yakuman standing', () => {
    expect(flip(YAKUMAN | MULTIPLE, 'multipleYakuman')).toBe(YAKUMAN);
    expect(flip(YAKUMAN | KAZOE, 'kazoeYakuman')).toBe(YAKUMAN);
  });

  it('locks the dependent options while aotenjou is in force', () => {
    const disabled = (field: number, key: string): boolean =>
      scoringToggles(field, false).find((o) => o.key === key)!.disabled;

    expect(disabled(0, 'multipleYakuman')).toBe(true);
    expect(disabled(0, 'kazoeYakuman')).toBe(true);
    expect(disabled(YAKUMAN, 'multipleYakuman')).toBe(false);
    expect(disabled(YAKUMAN, 'kazoeYakuman')).toBe(false);
    // ...and aotenjou/yakuman themselves stay reachable, or it would be a trap.
    expect(disabled(0, 'yakuman')).toBe(false);
    expect(disabled(0, 'aotenjou')).toBe(false);
  });

  it('disables everything while the config is saving', () => {
    for (const opt of scoringToggles(YAKUMAN, true)) {
      expect(opt.disabled).toBe(true);
    }
  });

  it('round-trips the flags that stand alone', () => {
    const start = YAKUMAN | MULTIPLE | KAZOE | KIRIAGE;
    for (const key of ['kiriageMangan', 'multipleYakuman', 'kazoeYakuman']) {
      expect(flip(flip(start, key), key)).toBe(start);
    }
  });

  it('does not restore the dependent options when yakuman comes back', () => {
    // Switching to aotenjou and back is lossy by design: the multiple/kazoe
    // choices are discarded, not remembered. Pinned so the behaviour is a
    // decision rather than an accident.
    const start = YAKUMAN | MULTIPLE | KAZOE | KIRIAGE;
    expect(flip(flip(start, 'yakuman'), 'yakuman')).toBe(KIRIAGE | YAKUMAN);
  });
});
