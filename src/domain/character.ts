export type VoiceCategory =
  | 'action'
  | 'yaku1'
  | 'yaku2'
  | 'yakuman'
  | 'koten'
  | 'dora'
  | 'points'
  | 'special';

/** Ordered list of voice categories, used to render grouped section headers. */
export const VOICE_CATEGORIES: readonly VoiceCategory[] = [
  'action',
  'yaku1',
  'yaku2',
  'yakuman',
  'koten',
  'dora',
  'points',
  'special',
];

export interface VoiceLineConfig {
  readonly id: string;
  readonly category: VoiceCategory;
  readonly audioUrl: string; // Data URL or asset path
}

export interface CharacterConfig {
  readonly id: string;
  readonly visualUrl: string;
  readonly stickersDir: string;
  readonly stickers: readonly string[];
  readonly voiceLines: readonly VoiceLineConfig[];
  readonly illustration?: string;
  readonly cv?: string;
}

// A silent 1-second WAV data URL used only for script entries without a
// recording. Keeping the entry lets the settings UI show the complete script.
const SILENT_WAV_URL =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA';

const MIMI_VOICE_ROOT = '/assets/mimi/voices';
const MISSING_MIMI_VOICE_IDS = new Set(['shiisuuputa']);

/**
 * Every voice line id for Mimi, transcribed from the character voice script.
 * The display text for each id lives in the locale files under
 * `character.mimi.voices.<id>`; keep the two in sync.
 */
const MIMI_VOICE_IDS: readonly { id: string; category: VoiceCategory }[] = [
  // 基本動作 (basic actions)
  { id: 'chii', category: 'action' },
  { id: 'pon', category: 'action' },
  { id: 'kan', category: 'action' },
  { id: 'nuki', category: 'action' },
  { id: 'riichi', category: 'action' },
  { id: 'okkakeRiichi', category: 'action' },
  { id: 'doubleRiichi', category: 'action' },
  { id: 'tsumo', category: 'action' },
  { id: 'ron', category: 'action' },
  { id: 'tenpai', category: 'action' },
  { id: 'noten', category: 'action' },
  { id: 'kyuushuKyuuhai', category: 'action' },

  // 一飜役 (1-han yaku)
  { id: 'yakuRiichi', category: 'yaku1' },
  { id: 'ippatsu', category: 'yaku1' },
  { id: 'menzenTsumo', category: 'yaku1' },
  { id: 'tanyao', category: 'yaku1' },
  { id: 'pinfu', category: 'yaku1' },
  { id: 'iipeikou', category: 'yaku1' },
  { id: 'yakuhaiHaku', category: 'yaku1' },
  { id: 'yakuhaiHatsu', category: 'yaku1' },
  { id: 'yakuhaiChun', category: 'yaku1' },
  { id: 'kazeTon', category: 'yaku1' },
  { id: 'kazeNan', category: 'yaku1' },
  { id: 'kazeSha', category: 'yaku1' },
  { id: 'kazePei', category: 'yaku1' },
  { id: 'rinshan', category: 'yaku1' },
  { id: 'chankan', category: 'yaku1' },
  { id: 'haitei', category: 'yaku1' },
  { id: 'houtei', category: 'yaku1' },

  // 二飜以上の役 (2+ han yaku)
  { id: 'doubleRiichiYaku', category: 'yaku2' },
  { id: 'sanshoku', category: 'yaku2' },
  { id: 'ittsuu', category: 'yaku2' },
  { id: 'chanta', category: 'yaku2' },
  { id: 'chiitoitsu', category: 'yaku2' },
  { id: 'toitoi', category: 'yaku2' },
  { id: 'sanankou', category: 'yaku2' },
  { id: 'sankantsu', category: 'yaku2' },
  { id: 'sanshokuDoukou', category: 'yaku2' },
  { id: 'honroutou', category: 'yaku2' },
  { id: 'shousangen', category: 'yaku2' },
  { id: 'honitsu', category: 'yaku2' },
  { id: 'junchan', category: 'yaku2' },
  { id: 'ryanpeikou', category: 'yaku2' },
  { id: 'chinitsu', category: 'yaku2' },

  // 役満 (yakuman)
  { id: 'tenhou', category: 'yakuman' },
  { id: 'chiihou', category: 'yakuman' },
  { id: 'daisangen', category: 'yakuman' },
  { id: 'suuankou', category: 'yakuman' },
  { id: 'suuankouTanki', category: 'yakuman' },
  { id: 'tsuuiisou', category: 'yakuman' },
  { id: 'ryuuiisou', category: 'yakuman' },
  { id: 'chinroutou', category: 'yakuman' },
  { id: 'kokushi', category: 'yakuman' },
  { id: 'kokushiJuusanmen', category: 'yakuman' },
  { id: 'shousuushii', category: 'yakuman' },
  { id: 'daisuushii', category: 'yakuman' },
  { id: 'suukantsu', category: 'yakuman' },
  { id: 'chuuren', category: 'yakuman' },
  { id: 'junseiChuuren', category: 'yakuman' },
  { id: 'helloWorld', category: 'yakuman' },

  // 古役 (classical / koten yaku)
  { id: 'tsubameGaeshi', category: 'koten' },
  { id: 'kanburi', category: 'koten' },
  { id: 'shiiaruraotai', category: 'koten' },
  { id: 'shousanfon', category: 'koten' },
  { id: 'sanrenkou', category: 'koten' },
  { id: 'sanfonkou', category: 'koten' },
  { id: 'suurenkou', category: 'koten' },
  { id: 'chaopaikou', category: 'koten' },
  { id: 'chinpaikou', category: 'koten' },
  { id: 'isshokuSandoujun', category: 'koten' },
  { id: 'isshokuYondoujun', category: 'koten' },
  { id: 'chinpeikou', category: 'koten' },
  { id: 'ryanankan', category: 'koten' },
  { id: 'sanankan', category: 'koten' },
  { id: 'renhou', category: 'koten' },
  { id: 'daisharin', category: 'koten' },
  { id: 'daichikurin', category: 'koten' },
  { id: 'daisuurin', category: 'koten' },
  { id: 'shiisanputa', category: 'koten' },
  { id: 'shiisuuputa', category: 'koten' },
  { id: 'paarenchan', category: 'koten' },
  { id: 'benikujaku', category: 'koten' },
  { id: 'heiiisou', category: 'koten' },
  { id: 'uumensai', category: 'koten' },
  { id: 'daichiishin', category: 'koten' },
  { id: 'ishiNoUeNiMoSannen', category: 'koten' },
  { id: 'katengecchi', category: 'koten' },

  // ドラ (dora counts)
  { id: 'dora1', category: 'dora' },
  { id: 'dora2', category: 'dora' },
  { id: 'dora3', category: 'dora' },
  { id: 'dora4', category: 'dora' },
  { id: 'dora5', category: 'dora' },
  { id: 'dora6', category: 'dora' },
  { id: 'dora7', category: 'dora' },
  { id: 'dora8', category: 'dora' },
  { id: 'dora9', category: 'dora' },
  { id: 'dora10', category: 'dora' },
  { id: 'dora11', category: 'dora' },
  { id: 'dora12', category: 'dora' },
  { id: 'doraMany', category: 'dora' },

  // 飜数・点数コール (limit / point calls)
  { id: 'mangan', category: 'points' },
  { id: 'haneman', category: 'points' },
  { id: 'baiman', category: 'points' },
  { id: 'sanbaiman', category: 'points' },
  { id: 'yakuman', category: 'points' },
  { id: 'kazoeYakuman', category: 'points' },
  { id: 'doubleYakuman', category: 'points' },
  { id: 'tripleYakuman', category: 'points' },
  { id: 'quadrupleYakuman', category: 'points' },
  { id: 'quintupleYakuman', category: 'points' },
  { id: 'miracleYakuman', category: 'points' },
  { id: 'nagashiMangan', category: 'points' },

  // 特殊シチュエーション (special situations)
  { id: 'intro', category: 'special' },
  { id: 'gameStart', category: 'special' },
  { id: 'win', category: 'special' },
  { id: 'lose', category: 'special' },
  { id: 'discardDora', category: 'special' },
  { id: 'repeatDiscard', category: 'special' },
  { id: 'wallLow', category: 'special' },
  { id: 'opponentCalls', category: 'special' },
  { id: 'bigTenpai', category: 'special' },
];

export const CHARACTERS: readonly CharacterConfig[] = [
  {
    id: 'mimi',
    visualUrl: '/assets/mimi/visual.png',
    illustration: '橙灵光',
    cv: '雪乃 しろ',
    stickersDir: '/assets/mimi/stickers',
    stickers: [
      'angry.png',
      'awawawa.png',
      'happy.png',
      'smile.png',
      'speechless.png',
      'surprised.png',
    ],
    voiceLines: MIMI_VOICE_IDS.map(({ id, category }) => ({
      id,
      category,
      audioUrl: MISSING_MIMI_VOICE_IDS.has(id)
        ? SILENT_WAV_URL
        : `${MIMI_VOICE_ROOT}/${id}.mp3`,
    })),
  },
];

export const DEFAULT_CHARACTER_ID = 'mimi';

export function getCharacterVoiceUrl(
  characterId: string,
  voiceId: string,
): string | undefined {
  return CHARACTERS.find(
    (character) => character.id === characterId,
  )?.voiceLines.find((line) => line.id === voiceId)?.audioUrl;
}
