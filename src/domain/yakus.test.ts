import { describe, it, expect } from 'vitest';
import {
  YAKUS,
  YAKU_GROUPS,
  buildAllowedYakusPayload,
  defaultAllowedYakus,
  filterYakuListForDisplay,
  isKazoeYakumanEnabled,
  isKiriageManganEnabled,
  isYakuAllowed,
  isYakumanEnabled,
  isYakumanScoring,
  sortYakuList,
} from './yakus';
import { ScoringType, ScoringOption, type IScoringMsg } from '../proto';
import en from '../locales/en.json';
import ja from '../locales/ja.json';
import zhs from '../locales/zhs.json';
import { getYakuVoiceLineId } from './resultHelpers';
import { DEFAULT_CHARACTER } from './character';

describe('YAKUS catalog', () => {
  it('has no duplicate names and only known groups', () => {
    const names = YAKUS.map((y) => y.name);
    expect(new Set(names).size).toBe(names.length);
    for (const yaku of YAKUS) {
      expect(YAKU_GROUPS).toContain(yaku.group);
    }
  });

  it('has a display name in every locale for every yaku', () => {
    const locales = { en, ja, zhs } as Record<
      string,
      { yaku: Record<string, string> }
    >;
    for (const [name, bundle] of Object.entries(locales)) {
      const missing = YAKUS.filter((y) => !bundle.yaku[y.name]).map(
        (y) => y.name,
      );
      expect(missing, `missing yaku.* keys in ${name}`).toEqual([]);
    }
  });

  it('has a label for every yaku group in every locale', () => {
    const locales = { en, ja, zhs } as Record<
      string,
      { yakuGroup: Record<string, string> }
    >;
    for (const [name, bundle] of Object.entries(locales)) {
      const missing = YAKU_GROUPS.filter((g) => !bundle.yakuGroup[g]);
      expect(missing, `missing yakuGroup.* keys in ${name}`).toEqual([]);
    }
  });

  it('maps every yaku to a recorded voice line', () => {
    const recorded = new Set(DEFAULT_CHARACTER.voiceLines.map((v) => v.id));
    const missing = YAKUS.map((y) => y.name).filter((name) => {
      const voiceId = getYakuVoiceLineId(name, 1);
      return voiceId === null || !recorded.has(voiceId);
    });
    expect(missing).toEqual([]);
  });
});

describe('defaultAllowedYakus', () => {
  it('enables everything except 古役', () => {
    const defaults = defaultAllowedYakus();

    expect(defaults.has('Riichi')).toBe(true);
    expect(defaults.has('Daisangen')).toBe(true);
    // 古役 are not standard riichi rules and must be opted into per room
    expect(defaults.has('Renhou')).toBe(false);
    expect(defaults.has('Daisharin')).toBe(false);
    expect(defaults.has('ShiiaruRaotai')).toBe(false);
    expect(defaults.size).toBe(
      YAKUS.filter((y) => y.group !== 'koyaku').length,
    );
  });
});

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

describe('scoring option helpers', () => {
  const {
    SCORING_OPTION_KIRIAGE_MANGAN: KIRIAGE,
    SCORING_OPTION_YAKUMAN: YAKUMAN,
  } = ScoringOption;

  it('treats 0 as aotenjou, not as "unset"', () => {
    // ScoringOption.Aotenjou === None === 0, so a broadcast 0 is a real table
    // with no yakuman -- only null means the config has not arrived.
    expect(isYakumanEnabled(0)).toBe(false);
    expect(isKazoeYakumanEnabled(0)).toBe(false);
    expect(isYakumanEnabled(null)).toBe(true);
    expect(isKazoeYakumanEnabled(undefined)).toBe(true);
  });

  it('reads each flag off the bitfield', () => {
    expect(isYakumanEnabled(YAKUMAN)).toBe(true);
    expect(isYakumanEnabled(KIRIAGE)).toBe(false);
    expect(isKiriageManganEnabled(KIRIAGE)).toBe(true);
    expect(isKiriageManganEnabled(YAKUMAN)).toBe(false);
    expect(isKiriageManganEnabled(null)).toBe(false);
  });

  it('keeps every yaku row on an aotenjou table', () => {
    const daisangen = {
      Type: ScoringType.SCORING_TYPE_YAKUMAN,
      Val: 1,
      Src: 'Daisangen',
    } as IScoringMsg;
    const riichi = {
      Type: ScoringType.SCORING_TYPE_HAN,
      Val: 1,
      Src: 'Riichi',
    } as IScoringMsg;
    expect(filterYakuListForDisplay([daisangen, riichi], 0)).toEqual([
      riichi,
      daisangen,
    ]);
  });
});

describe('isYakuAllowed', () => {
  it('treats an absent or empty list as "everything allowed"', () => {
    expect(isYakuAllowed(null, 'DoubleRiichi')).toBe(true);
    expect(isYakuAllowed([], 'DoubleRiichi')).toBe(true);
    expect(isYakuAllowed(['Riichi'], 'DoubleRiichi')).toBe(false);
    expect(isYakuAllowed(['Riichi', 'DoubleRiichi'], 'DoubleRiichi')).toBe(
      true,
    );
  });
});

describe('bonus yakuman display', () => {
  const riichi = {
    Type: ScoringType.SCORING_TYPE_HAN,
    Val: 1,
    Src: 'Riichi',
  } as IScoringMsg;
  const dora = {
    Type: ScoringType.SCORING_TYPE_BONUS_HAN,
    Val: 1,
    Src: 'Dora',
  } as IScoringMsg;
  const daisangen = {
    Type: ScoringType.SCORING_TYPE_YAKUMAN,
    Val: 1,
    Src: 'Daisangen',
  } as IScoringMsg;
  const paarenchan = {
    Type: ScoringType.SCORING_TYPE_BONUS_YAKUMAN,
    Val: 1,
    Src: 'Paarenchan',
  } as IScoringMsg;

  it('treats a bonus yakuman as a yakuman', () => {
    expect(isYakumanScoring(ScoringType.SCORING_TYPE_BONUS_YAKUMAN)).toBe(true);
    expect(isYakumanScoring(ScoringType.SCORING_TYPE_YAKUMAN)).toBe(true);
    expect(isYakumanScoring(ScoringType.SCORING_TYPE_BONUS_HAN)).toBe(false);
    expect(isYakumanScoring(ScoringType.SCORING_TYPE_HAN)).toBe(false);
    expect(isYakumanScoring(null)).toBe(false);
  });

  it('collapses to the yakuman rows when only a bonus yakuman is present', () => {
    const option = ScoringOption.SCORING_OPTION_YAKUMAN;
    expect(
      filterYakuListForDisplay([riichi, dora, paarenchan], option),
    ).toEqual([paarenchan]);
  });

  it('keeps a bonus yakuman alongside a real yakuman', () => {
    const option = ScoringOption.SCORING_OPTION_YAKUMAN;
    expect(
      filterYakuListForDisplay([paarenchan, riichi, daisangen, dora], option),
    ).toEqual([daisangen, paarenchan]);
  });

  it('keeps every row under aotenjou', () => {
    const option = ScoringOption.SCORING_OPTION_KIRIAGE_MANGAN;
    expect(
      filterYakuListForDisplay([dora, paarenchan, riichi], option),
    ).toEqual([riichi, paarenchan, dora]);
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
