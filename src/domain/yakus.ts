import { type IScoringMsg, ScoringType, ScoringOption } from '../proto';

export interface YakuInfo {
  name: string;
  group: '1han' | '2han' | '3han' | '6han' | 'yakuman' | 'other';
}

export const YAKUS: YakuInfo[] = [
  // Other
  { name: 'HelloWorld', group: 'other' },

  // Yakuman
  { name: 'Tenhou', group: 'yakuman' },
  { name: 'Chiihou', group: 'yakuman' },
  { name: 'Daisangen', group: 'yakuman' },
  { name: 'Suuankou', group: 'yakuman' },
  { name: 'SuuankouTanki', group: 'yakuman' },
  { name: 'Tsuuiisou', group: 'yakuman' },
  { name: 'Ryuuiisou', group: 'yakuman' },
  { name: 'Chinroutou', group: 'yakuman' },
  { name: 'KokushiMusou', group: 'yakuman' },
  { name: 'KokushiMusouJuusanmenMachi', group: 'yakuman' },
  { name: 'Shousuushii', group: 'yakuman' },
  { name: 'Daisuushii', group: 'yakuman' },
  { name: 'Suukantsu', group: 'yakuman' },
  { name: 'ChuurenPoutou', group: 'yakuman' },
  { name: 'JunseiChuurenPoutou', group: 'yakuman' },

  // 6 Han
  { name: 'Chinitsu', group: '6han' },

  // 3 Han
  { name: 'Honitsu', group: '3han' },
  { name: 'JunchanTaiyao', group: '3han' },
  { name: 'Ryanpeikou', group: '3han' },

  // 2 Han
  { name: 'SanshokuDoujun', group: '2han' },
  { name: 'Ittsu', group: '2han' },
  { name: 'Chantaiyao', group: '2han' },
  { name: 'Toitoi', group: '2han' },
  { name: 'Sanankou', group: '2han' },
  { name: 'SanshokuDoukou', group: '2han' },
  { name: 'Sankantsu', group: '2han' },
  { name: 'Honroutou', group: '2han' },
  { name: 'Shousangen', group: '2han' },
  { name: 'Chiitoitsu', group: '2han' },

  // 1 Han
  { name: 'Riichi', group: '1han' },
  { name: 'DoubleRiichi', group: '2han' },
  { name: 'Ippatsu', group: '1han' },
  { name: 'MenzenchinTsumohou', group: '1han' },
  { name: 'Tanyao', group: '1han' },
  { name: 'Pinfu', group: '1han' },
  { name: 'Iipeikou', group: '1han' },
  { name: 'YakuhaiBakaze', group: '1han' },
  { name: 'YakuhaiJikaze', group: '1han' },
  { name: 'YakuhaiHaku', group: '1han' },
  { name: 'YakuhaiHatsu', group: '1han' },
  { name: 'YakuhaiChun', group: '1han' },
  { name: 'RinshanKaihou', group: '1han' },
  { name: 'Chankan', group: '1han' },
  { name: 'HaiteiRaoyue', group: '1han' },
  { name: 'HouteiRaoyui', group: '1han' },
];

/**
 * Builds the `allowedYakus` payload for a create-room request.
 *
 * The server treats this list as a filter over its yaku set: it keeps only the
 * yakus named here. Because protobuf cannot distinguish an unset repeated field
 * from an empty one, an empty array is read by the server as "allow no yakus"
 * (every yaku is stripped, leaving hands effectively yakuless). Therefore we
 * always send the actual selected names, even when every yaku is enabled.
 */
export function buildAllowedYakusPayload(
  selected: ReadonlySet<string>,
): string[] {
  return Array.from(selected);
}

export function filterYakuListForDisplay(
  rawYakuList: IScoringMsg[],
  scoringOption: number | null | undefined,
): IScoringMsg[] {
  const isYakumanEnabled = scoringOption
    ? Boolean(scoringOption & ScoringOption.SCORING_OPTION_YAKUMAN)
    : true;
  const hasYakuman = rawYakuList.some(
    (y) => y.Type === ScoringType.SCORING_TYPE_YAKUMAN,
  );
  const filtered =
    isYakumanEnabled && hasYakuman
      ? rawYakuList.filter((y) => y.Type === ScoringType.SCORING_TYPE_YAKUMAN)
      : rawYakuList.filter((y) => y.Type !== ScoringType.SCORING_TYPE_FU);
  return sortYakuList(filtered);
}

const YAKU_ORDER_MAP: Record<string, number> = {};
YAKUS.forEach((yaku, idx) => {
  YAKU_ORDER_MAP[yaku.name] = idx;
});

const DORA_ITEMS = ['Dora', 'Akadora', 'NukiDora', 'Uradora'];
DORA_ITEMS.forEach((doraName, idx) => {
  YAKU_ORDER_MAP[doraName] = 1000 + idx;
});

export function sortYakuList(yakuList: IScoringMsg[]): IScoringMsg[] {
  return [...yakuList].sort((a, b) => {
    const priorityA = YAKU_ORDER_MAP[a.Src ?? ''] ?? 999;
    const priorityB = YAKU_ORDER_MAP[b.Src ?? ''] ?? 999;
    return priorityA - priorityB;
  });
}
