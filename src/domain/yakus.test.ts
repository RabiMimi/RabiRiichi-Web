import { describe, it, expect } from 'vitest';
import {
  YAKUS,
  buildAllowedYakusPayload,
  filterYakuListForDisplay,
} from './yakus';
import { ScoringType, ScoringOption, type IScoringMsg } from '../proto';

describe('buildAllowedYakusPayload', () => {
  it('sends the full list when every yaku is enabled (not an empty array)', () => {
    // Regression: an empty array is read by the server as "ban every yaku",
    // which made hands yakuless even though the user enabled all yakus.
    const all = new Set(YAKUS.map((y) => y.name));

    const payload = buildAllowedYakusPayload(all);

    expect(payload).toHaveLength(YAKUS.length);
    expect(payload.length).toBeGreaterThan(0);
    expect(new Set(payload)).toEqual(all);
  });

  it('sends only the selected subset', () => {
    const selected = new Set(['Riichi', 'Tanyao']);

    const payload = buildAllowedYakusPayload(selected);

    expect(new Set(payload)).toEqual(selected);
  });

  it('sends an empty list only when nothing is selected', () => {
    expect(buildAllowedYakusPayload(new Set())).toEqual([]);
  });
});

describe('filterYakuListForDisplay', () => {
  const riichi = {
    Type: ScoringType.SCORING_TYPE_HAN,
    Val: 1,
    Src: 'Riichi',
  } as IScoringMsg;
  const dora = {
    Type: ScoringType.SCORING_TYPE_BONUS_HAN,
    Val: 1,
    Src: 'dora',
  } as IScoringMsg;
  const daisangen = {
    Type: ScoringType.SCORING_TYPE_YAKUMAN,
    Val: 1,
    Src: 'Daisangen',
  } as IScoringMsg;
  const tsuuiisou = {
    Type: ScoringType.SCORING_TYPE_YAKUMAN,
    Val: 1,
    Src: 'Tsuuiisou',
  } as IScoringMsg;

  it('keeps all yaku when there is no yakuman in the hand', () => {
    const list = [riichi, dora];
    const option = ScoringOption.SCORING_OPTION_YAKUMAN;
    expect(filterYakuListForDisplay(list, option)).toEqual([list[0], list[1]]);
  });

  it('filters out non-yakuman yaku when yakuman is enabled and present', () => {
    const list = [riichi, daisangen, dora, tsuuiisou];
    const option = ScoringOption.SCORING_OPTION_YAKUMAN;
    expect(filterYakuListForDisplay(list, option)).toEqual([
      daisangen,
      tsuuiisou,
    ]);
  });

  it('keeps all yaku (including yakuman) under Aotenjo rules (yakuman disabled)', () => {
    const list = [riichi, daisangen, dora];
    const option = ScoringOption.SCORING_OPTION_KIRIAGE_MANGAN; // No YAKUMAN flag
    expect(filterYakuListForDisplay(list, option)).toEqual([
      riichi,
      daisangen,
      dora,
    ]);
  });

  it('defaults to yakuman enabled if scoringOption is null/undefined', () => {
    const list = [riichi, daisangen, dora];
    expect(filterYakuListForDisplay(list, null)).toEqual([daisangen]);
  });
});
