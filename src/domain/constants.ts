export const DEFAULT_ACTION_TIMEOUT = 20;

export const TILE_LIFT_IDLE = 0;
export const TILE_LIFT_SELECTED = 0.12;
export const TILE_LIFT_HOVERED = 0.12;

// Validation Limits
export const MIN_ACTION_TIMEOUT = 5;
export const MAX_ACTION_TIMEOUT = 3600;
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
export const DEFAULT_RENCHAN_POLICY = 11;
export const DEFAULT_END_GAME_POLICY = 31;
export const DEFAULT_KUIKAE_POLICY = 3;
export const DEFAULT_RIICHI_POLICY = 7;
export const DEFAULT_DORA_OPTION = 79;
export const DEFAULT_AGARI_OPTION = 15;
export const DEFAULT_SCORING_OPTION = 15;
export const DEFAULT_RYUUKYOKU_TRIGGER = 31;
export const DEFAULT_POINTS_DEDUCTION_POLICY = 1;

// Storage Keys
export const STORAGE_KEY_SERVER_SETTINGS = 'rabiriichi_server_settings';
export const STORAGE_KEY_ROOM_CONFIG = 'rabiriichi_room_config';

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
