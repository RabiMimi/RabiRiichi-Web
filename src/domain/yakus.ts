import { type IScoringMsg, ScoringType, ScoringOption } from '../proto';

export type YakuGroup =
  '1han' | '2han' | '3han' | '6han' | 'yakuman' | 'koyaku' | 'other';

export interface YakuInfo {
  name: string;
  group: YakuGroup;
}

/** Groups rendered in the room's yaku picker, in display order. */
export const YAKU_GROUPS: readonly YakuGroup[] = [
  '1han',
  '2han',
  '3han',
  '6han',
  'yakuman',
  'koyaku',
  'other',
];

/** Not standard riichi rules; opt-in per room. */
export const KOYAKU_GROUP: YakuGroup = 'koyaku';

export const YAKUS: YakuInfo[] = [
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

  // 3 Han
  { name: 'Honitsu', group: '3han' },
  { name: 'JunchanTaiyao', group: '3han' },
  { name: 'Ryanpeikou', group: '3han' },

  // 6 Han
  { name: 'Chinitsu', group: '6han' },

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

  // 古役 (koyaku, off by default)
  { name: 'TsubameGaeshi', group: 'koyaku' },
  { name: 'Kanburi', group: 'koyaku' },
  { name: 'ShiiaruRaotai', group: 'koyaku' },
  { name: 'Shousanfon', group: 'koyaku' },
  { name: 'Sanrenkou', group: 'koyaku' },
  { name: 'Sanfonkou', group: 'koyaku' },
  { name: 'Chaopaikou', group: 'koyaku' },
  { name: 'Chinpaikou', group: 'koyaku' },
  { name: 'Uumensai', group: 'koyaku' },
  { name: 'Ryanankan', group: 'koyaku' },
  { name: 'IsshokuSandoujun', group: 'koyaku' },
  { name: 'Chinpeikou', group: 'koyaku' },
  { name: 'Suurenkou', group: 'koyaku' },
  { name: 'IsshokuYondoujun', group: 'koyaku' },
  { name: 'Sanankan', group: 'koyaku' },
  { name: 'Renhou', group: 'koyaku' },
  { name: 'Katengecchi', group: 'koyaku' },
  { name: 'IshiNoUeNiMoSannen', group: 'koyaku' },
  { name: 'Heiiisou', group: 'koyaku' },
  { name: 'Benikujaku', group: 'koyaku' },
  { name: 'Daisharin', group: 'koyaku' },
  { name: 'Daichikurin', group: 'koyaku' },
  { name: 'Daisuurin', group: 'koyaku' },
  { name: 'Shiisanputa', group: 'koyaku' },
  { name: 'Shiisuuputa', group: 'koyaku' },
  { name: 'Paarenchan', group: 'koyaku' },
  { name: 'Daichiishin', group: 'koyaku' },

  // Other
  { name: 'HelloWorld', group: 'other' },
];

/** The yaku a room starts with: everything except 古役, which are opt-in. */
export function defaultAllowedYakus(
  available: readonly YakuInfo[] = YAKUS,
): Set<string> {
  return new Set(
    available.filter((y) => y.group !== KOYAKU_GROUP).map((y) => y.name),
  );
}

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

/**
 * Whether yakuman are capped. With the flag off the table is aotenjou, where a
 * yakuman is merely 13 extra han and the limit names do not apply.
 */
export function isYakumanEnabled(
  scoringOption: number | null | undefined,
): boolean {
  // 0 is a real value (ScoringOption.Aotenjou), not "unset" — only null means
  // the config has not arrived yet.
  if (scoringOption == null) return true;
  return Boolean(scoringOption & ScoringOption.SCORING_OPTION_YAKUMAN);
}

/**
 * Whether 13+ han counts as a yakuman (累计役满). Mirrors the server, which
 * requires both flags — see ScoreCalcResult.KazoeYakuman.
 */
export function isKazoeYakumanEnabled(
  scoringOption: number | null | undefined,
): boolean {
  if (scoringOption == null) return true;
  const required =
    ScoringOption.SCORING_OPTION_YAKUMAN |
    ScoringOption.SCORING_OPTION_KAZOE_YAKUMAN;
  return (scoringOption & required) === required;
}

/** Whether 4 han 30 fu / 3 han 60 fu round up to mangan (切上满贯). */
export function isKiriageManganEnabled(
  scoringOption: number | null | undefined,
): boolean {
  if (scoringOption == null) return false;
  return Boolean(scoringOption & ScoringOption.SCORING_OPTION_KIRIAGE_MANGAN);
}

/** Whether a room allows a yaku. An absent or empty list means every yaku. */
export function isYakuAllowed(
  allowedYakus: readonly string[] | null | undefined,
  yakuName: string,
): boolean {
  if (allowedYakus == null || allowedYakus.length === 0) return true;
  return allowedYakus.includes(yakuName);
}

/** Whether a scoring row is worth a yakuman, bonus yakuman (八連荘) included. */
export function isYakumanScoring(
  type: ScoringType | null | undefined,
): boolean {
  return (
    type === ScoringType.SCORING_TYPE_YAKUMAN ||
    type === ScoringType.SCORING_TYPE_BONUS_YAKUMAN
  );
}

export function filterYakuListForDisplay(
  rawYakuList: IScoringMsg[],
  scoringOption: number | null | undefined,
): IScoringMsg[] {
  const yakumanEnabled = isYakumanEnabled(scoringOption);
  const hasYakuman = rawYakuList.some((y) => isYakumanScoring(y.Type));
  const filtered =
    yakumanEnabled && hasYakuman
      ? rawYakuList.filter((y) => isYakumanScoring(y.Type))
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
