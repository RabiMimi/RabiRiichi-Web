import { DoraOption } from '../proto/index.js';

export interface PolicyOption {
  value: number;
  labelKey: string;
}

export const RENCHAN_POLICIES: PolicyOption[] = [
  { value: 1, labelKey: 'advanced.renchan.dealerWin' },
  { value: 2, labelKey: 'advanced.renchan.dealerTenpai' },
  { value: 4, labelKey: 'advanced.renchan.endGameRyuukyoku' },
  { value: 8, labelKey: 'advanced.renchan.midGameRyuukyoku' },
];

export const END_GAME_POLICIES: PolicyOption[] = [
  { value: 1, labelKey: 'advanced.endGame.pointsOutOfRange' },
  { value: 2, labelKey: 'advanced.endGame.instantPointsOutOfRange' },
  { value: 4, labelKey: 'advanced.endGame.dealerTenpai' },
  { value: 8, labelKey: 'advanced.endGame.dealerAgari' },
  { value: 16, labelKey: 'advanced.endGame.extendedRound' },
];

export const KUIKAE_POLICIES: PolicyOption[] = [
  { value: 1, labelKey: 'advanced.kuikae.genbutsu' },
  { value: 2, labelKey: 'advanced.kuikae.suji' },
];

export const RIICHI_POLICIES: PolicyOption[] = [
  { value: 1, labelKey: 'advanced.riichi.sufficientPoints' },
  { value: 2, labelKey: 'advanced.riichi.validPoints' },
  { value: 4, labelKey: 'advanced.riichi.sufficientTiles' },
];

export const DORA_OPTIONS: PolicyOption[] = [
  {
    value: DoraOption.DORA_OPTION_INITIAL_DORA,
    labelKey: 'advanced.dora.initialDora',
  },
  {
    value: DoraOption.DORA_OPTION_INITIAL_URADORA,
    labelKey: 'advanced.dora.initialUradora',
  },
  {
    value: DoraOption.DORA_OPTION_KAN_DORA,
    labelKey: 'advanced.dora.kanDora',
  },
  {
    value: DoraOption.DORA_OPTION_KAN_URADORA,
    labelKey: 'advanced.dora.kanUradora',
  },
  {
    value: DoraOption.DORA_OPTION_INSTANT_REVEAL_AFTER_DAI_MIN_KAN,
    labelKey: 'advanced.dora.instantDaiMinKan',
  },
  {
    value: DoraOption.DORA_OPTION_INSTANT_REVEAL_AFTER_KA_KAN,
    labelKey: 'advanced.dora.instantKaKan',
  },
  {
    value: DoraOption.DORA_OPTION_INSTANT_REVEAL_AFTER_AN_KAN,
    labelKey: 'advanced.dora.instantAnKan',
  },
  {
    value: DoraOption.DORA_OPTION_NUKI_DORA,
    labelKey: 'advanced.dora.nukiDora',
  },
];

export const AGARI_OPTIONS: PolicyOption[] = [
  { value: 1, labelKey: 'advanced.agari.kuitan' },
  { value: 2, labelKey: 'advanced.agari.pao' },
  { value: 4, labelKey: 'advanced.agari.nagashiMangan' },
  { value: 8, labelKey: 'advanced.agari.firstWinner' },
];

export const RYUUKYOKU_TRIGGERS: PolicyOption[] = [
  { value: 1, labelKey: 'advanced.ryuukyoku.suufonRenda' },
  { value: 2, labelKey: 'advanced.ryuukyoku.kyuushuKyuuhai' },
  { value: 4, labelKey: 'advanced.ryuukyoku.suuchaRiichi' },
  { value: 8, labelKey: 'advanced.ryuukyoku.sanchahou' },
  { value: 16, labelKey: 'advanced.ryuukyoku.suukanSanra' },
];

export const SCORING_OPTIONS: PolicyOption[] = [
  { value: 1, labelKey: 'advanced.scoring.kiriageMangan' },
  { value: 2, labelKey: 'advanced.scoring.yakuman' },
  { value: 4, labelKey: 'advanced.scoring.multipleYakuman' },
  { value: 8, labelKey: 'advanced.scoring.kazoeYakuman' },
];
