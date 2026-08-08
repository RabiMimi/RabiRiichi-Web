/**
 * Pure builder for the room `IGameConfigMsg` from the handful of options the CLI
 * lets a player pick before creating a room (player count, rounds, min han,
 * action timeout, starting points, tile set). Policy masks and other advanced
 * fields fall back to the shared defaults, mirroring the web client's Create
 * Room defaults. Kept pure so it is unit-testable.
 */
import type { IGameConfigMsg } from '../../proto';
import {
  DEFAULT_PLAYER_COUNT,
  DEFAULT_TOTAL_ROUND,
  DEFAULT_MIN_HAN,
  DEFAULT_INITIAL_POINTS,
  DEFAULT_FINISH_POINTS,
  DEFAULT_UPPER_POINTS,
  DEFAULT_ACTION_TIMEOUT,
} from '../../domain/constants';
import {
  TILE_SET_PRESETS,
  type TileSetPresetName,
} from '../../domain/tilesets';

export const TILE_SET_OPTIONS = [
  'Regular',
  'Sanma',
  'TwoSets',
  'OnlySZ',
  'TenchiSouzou',
] as const;

export interface RoomConfigChoices {
  playerCount: number;
  totalRound: number;
  minHan: number;
  actionTimeout: number;
  initialPoints: number;
  tileSet: TileSetPresetName;
}

export const DEFAULT_ROOM_CONFIG: RoomConfigChoices = {
  playerCount: DEFAULT_PLAYER_COUNT,
  totalRound: DEFAULT_TOTAL_ROUND,
  minHan: DEFAULT_MIN_HAN,
  actionTimeout: DEFAULT_ACTION_TIMEOUT,
  initialPoints: DEFAULT_INITIAL_POINTS,
  tileSet: 'Regular',
};

function tileSetBytes(name: TileSetPresetName): number[] {
  const preset = (
    TILE_SET_PRESETS as Record<string, () => { toByte(): number }[]>
  )[name];
  const tiles = preset ? preset() : TILE_SET_PRESETS.Regular();
  return tiles.map((t) => t.toByte());
}

/**
 * Builds the wire config from the CLI's chosen options. Point thresholds scale
 * off the chosen starting points, matching the web client's shape
 * (`initialPoints`, `finishPoints`, `validPointsRange`).
 */
export function buildRoomConfig(choices: RoomConfigChoices): IGameConfigMsg {
  const finishPoints = Math.max(choices.initialPoints, DEFAULT_FINISH_POINTS);
  return {
    playerCount: choices.playerCount,
    totalRound: choices.totalRound,
    minHan: choices.minHan,
    gameplayActionTimeout: choices.actionTimeout,
    pointThreshold: {
      initialPoints: choices.initialPoints,
      finishPoints,
      validPointsRange: [0, DEFAULT_UPPER_POINTS],
    },
    initialTiles: tileSetBytes(choices.tileSet),
  };
}
