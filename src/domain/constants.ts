import {
  KuikaePolicy,
  RiichiPolicy,
  RyuukyokuTrigger,
  RenchanPolicy,
  EndGamePolicy,
  DoraOption,
  AgariOption,
  ScoringOption,
  PointsDeductionPolicy,
} from '../proto';

export const DEFAULT_ACTION_TIMEOUT = 20;
export const DEFAULT_NEXT_ROUND_ACK_TIMEOUT = 30;

// Sentinel inquiry-response index meaning "use the server's default action".
// Matches the server's InquiryResponse.Default (index = -1): any index < 0 makes
// the server keep the action it flagged as default (e.g. tsumo on a riichi win).
export const INQUIRY_DEFAULT_INDEX = -1;

// How long the end-of-hand result animation (agari/ryuukyoku) plays before the
// result panel is revealed. The next-round countdown runs independently during
// this window, so it stays shorter than DEFAULT_NEXT_ROUND_ACK_TIMEOUT.
export const RESULT_ANIMATION_DURATION_MS = 3000;

export const TILE_LIFT_IDLE = 0;
export const TILE_LIFT_SELECTED = 0.12;
export const TILE_LIFT_HOVERED = 0.12;

// Validation Limits
export const MIN_ACTION_TIMEOUT = 5;
export const MAX_ACTION_TIMEOUT = 3600;
export const MIN_NEXT_ROUND_ACK_TIMEOUT = 5;
export const MAX_NEXT_ROUND_ACK_TIMEOUT = 3600;
export const MIN_MIN_HAN = 1;
export const MAX_MIN_HAN = 13;
export const MIN_POINTS = 0;
export const MAX_POINTS = 1000000;

// Room Config Defaults
export const DEFAULT_PLAYER_COUNT = 2;
export const DEFAULT_TOTAL_ROUND = 1;
export const DEFAULT_MIN_HAN = 1;
export const DEFAULT_INITIAL_POINTS = 25000;
export const DEFAULT_FINISH_POINTS = 30000;
export const DEFAULT_UPPER_POINTS = MAX_POINTS;
export const DEFAULT_RIICHI_POINTS = 1000;
export const DEFAULT_HONBA_POINTS = 300;
export const DEFAULT_RYUUKYOKU_POINTS_0 = 1000;
export const DEFAULT_RYUUKYOKU_POINTS_1 = 1500;
export const DEFAULT_TILE_SET_PRESET = 'Regular';

// Policy defaults (matching client initial states)
export const DEFAULT_RENCHAN_POLICY =
  RenchanPolicy.RENCHAN_POLICY_DEALER_WIN |
  RenchanPolicy.RENCHAN_POLICY_DEALER_TENPAI |
  RenchanPolicy.RENCHAN_POLICY_MID_GAME_RYUUKYOKU;

export const DEFAULT_END_GAME_POLICY =
  EndGamePolicy.END_GAME_POLICY_POINTS_OUT_OF_RANGE |
  EndGamePolicy.END_GAME_POLICY_INSTANT_POINTS_OUT_OF_RANGE |
  EndGamePolicy.END_GAME_POLICY_DEALER_TENPAI |
  EndGamePolicy.END_GAME_POLICY_DEALER_AGARI |
  EndGamePolicy.END_GAME_POLICY_EXTENDED_ROUND;

export const DEFAULT_KUIKAE_POLICY =
  KuikaePolicy.KUIKAE_POLICY_GENBUTSU | KuikaePolicy.KUIKAE_POLICY_SUJI;

export const DEFAULT_RIICHI_POLICY =
  RiichiPolicy.RIICHI_POLICY_SUFFICIENT_POINTS |
  RiichiPolicy.RIICHI_POLICY_VALID_POINTS |
  RiichiPolicy.RIICHI_POLICY_SUFFICIENT_TILES;

export const DEFAULT_DORA_OPTION =
  DoraOption.DORA_OPTION_INITIAL_DORA |
  DoraOption.DORA_OPTION_INITIAL_URADORA |
  DoraOption.DORA_OPTION_KAN_DORA |
  DoraOption.DORA_OPTION_KAN_URADORA |
  DoraOption.DORA_OPTION_INSTANT_REVEAL_AFTER_AN_KAN;

export const DEFAULT_AGARI_OPTION =
  AgariOption.AGARI_OPTION_KUITAN |
  AgariOption.AGARI_OPTION_PAO |
  AgariOption.AGARI_OPTION_NAGASHI_MANGAN |
  AgariOption.AGARI_OPTION_FIRST_WINNER;

export const DEFAULT_SCORING_OPTION =
  ScoringOption.SCORING_OPTION_KIRIAGE_MANGAN |
  ScoringOption.SCORING_OPTION_YAKUMAN |
  ScoringOption.SCORING_OPTION_MULTIPLE_YAKUMAN |
  ScoringOption.SCORING_OPTION_KAZOE_YAKUMAN;

export const DEFAULT_RYUUKYOKU_TRIGGER =
  RyuukyokuTrigger.RYUUKYOKU_TRIGGER_SUUFON_RENDA |
  RyuukyokuTrigger.RYUUKYOKU_TRIGGER_KYUUSHU_KYUUHAI |
  RyuukyokuTrigger.RYUUKYOKU_TRIGGER_SUUCHA_RIICHI |
  RyuukyokuTrigger.RYUUKYOKU_TRIGGER_SANCHAHOU |
  RyuukyokuTrigger.RYUUKYOKU_TRIGGER_SUUKAN_SANRA;

export const DEFAULT_POINTS_DEDUCTION_POLICY =
  PointsDeductionPolicy.POINTS_DEDUCTION_POLICY_SUFFICIENT_POINTS;

export const FOUR_PLAYER_RYUUKYOKU_TRIGGERS_MASK =
  RyuukyokuTrigger.RYUUKYOKU_TRIGGER_SUUFON_RENDA |
  RyuukyokuTrigger.RYUUKYOKU_TRIGGER_SUUCHA_RIICHI |
  RyuukyokuTrigger.RYUUKYOKU_TRIGGER_SANCHAHOU;

// Nukidora (拔北) is a three-player rule. It is auto-enabled by default only
// for 3-player games, but stays manually toggleable in any player count.
export const THREE_PLAYER_DORA_OPTIONS_MASK = DoraOption.DORA_OPTION_NUKI_DORA;

/** Dora options defaulted on for a given player count. */
export function defaultDoraOptionForPlayerCount(playerCount: number): number {
  return playerCount === 3
    ? DEFAULT_DORA_OPTION | THREE_PLAYER_DORA_OPTIONS_MASK
    : DEFAULT_DORA_OPTION;
}

// Storage Keys
export const STORAGE_KEY_SERVER_SETTINGS = 'rabiriichi_server_settings';
export const STORAGE_KEY_ROOM_CONFIG = 'rabiriichi_room_config';
export const STORAGE_KEY_CLIENT_SETTINGS = 'rabiriichi_client_settings';

export interface SavedServer {
  id: string;
  name: string;
  url: string;
}

export interface ServerSettings {
  selectedId?: string;
  customServers?: SavedServer[];
  lastUrl?: string;
  nickname?: string;
}

export interface ClientSettings {
  animationSpeed?: number;
}
