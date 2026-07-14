import { describe, it, expect } from 'vitest';
import {
  YAKUS,
  buildAllowedYakusPayload,
  filterYakuListForDisplay,
  sortYakuList,
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
    Src: 'Dora', // Note: change 'dora' to 'Dora' to match YAKU_ORDER
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

  it('keeps all yaku when there is no yakuman in the hand, and returns them sorted', () => {
    const list = [dora, riichi]; // Dora first, which is out of order
    const option = ScoringOption.SCORING_OPTION_YAKUMAN;
    // Expected output: riichi first, then dora
    expect(filterYakuListForDisplay(list, option)).toEqual([riichi, dora]);
  });

  it('filters out non-yakuman yaku and returns them sorted when yakuman is enabled and present', () => {
    const list = [tsuuiisou, riichi, daisangen, dora]; // Tsuuiisou before Daisangen
    const option = ScoringOption.SCORING_OPTION_YAKUMAN;
    // Expected: Daisangen before Tsuuiisou based on YAKU_ORDER
    expect(filterYakuListForDisplay(list, option)).toEqual([
      daisangen,
      tsuuiisou,
    ]);
  });

  it('keeps all yaku (including yakuman) under Aotenjo rules, and returns them sorted', () => {
    const list = [dora, daisangen, riichi];
    const option = ScoringOption.SCORING_OPTION_KIRIAGE_MANGAN; // No YAKUMAN flag
    // Expected: Riichi (1han) -> Daisangen (yakuman) -> Dora
    expect(filterYakuListForDisplay(list, option)).toEqual([
      riichi,
      daisangen,
      dora,
    ]);
  });

  it('defaults to yakuman enabled if scoringOption is null/undefined, and returns them sorted', () => {
    const list = [tsuuiisou, riichi, daisangen, dora];
    expect(filterYakuListForDisplay(list, null)).toEqual([
      daisangen,
      tsuuiisou,
    ]);
  });
});

describe('sortYakuList', () => {
  it('correctly sorts yaku based on predefined traditional order', () => {
    const riichi = { Src: 'Riichi' } as IScoringMsg;
    const ippatsu = { Src: 'Ippatsu' } as IScoringMsg;
    const tsumo = { Src: 'MenzenchinTsumohou' } as IScoringMsg;
    const tanyao = { Src: 'Tanyao' } as IScoringMsg;
    const dora = { Src: 'Dora' } as IScoringMsg;
    const uradora = { Src: 'Uradora' } as IScoringMsg;
    const unknown = { Src: 'SomeCustomYaku' } as IScoringMsg;

    const list = [uradora, tanyao, unknown, tsumo, ippatsu, dora, riichi];
    const sorted = sortYakuList(list);

    // Expected order:
    // Riichi -> Ippatsu -> MenzenchinTsumohou -> Tanyao -> Unknown (999) -> Dora -> Uradora
    expect(sorted).toEqual([
      riichi,
      ippatsu,
      tsumo,
      tanyao,
      unknown,
      dora,
      uradora,
    ]);
  });
});
