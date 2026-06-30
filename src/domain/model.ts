import type {
  UserStatus,
  FuritenType,
  IGameConfigMsg,
  IGameTileMsg,
  IScoreStorageMsg,
  IMenLikeMsg,
} from '../proto/index.js';
import { AiType } from '../proto/index.js';

export interface PlayerAgariState {
  scores?: IScoreStorageMsg | null;
  incoming?: IGameTileMsg | null;
  gainPoints: number;
  losePoints: number;
}

export interface PlayerHandState {
  freeTiles: IGameTileMsg[];
  called: IMenLikeMsg[];
  discarded: IGameTileMsg[];
  pendingTile: IGameTileMsg | null;
}

export interface PlayerGameState {
  jun: number;
  points: number;
  riichiTileId: number; // trace_id of the riichi tile, 0 if not riichi
  furiten: Partial<Record<FuritenType, boolean>>;
  hand: PlayerHandState;
  agari: PlayerAgariState | null;
}

export interface PlayerModel {
  id: number;
  nickname: string;
  status: UserStatus;
  seat?: number;
  gameState: PlayerGameState | null;
  aiType: AiType;
}

export interface GameInfo {
  round: number;
  dealer: number;
  honba: number;
  riichiStick: number;
  remainingTiles: number;
  currentPlayer: number;
  doras: IGameTileMsg[];
  uradoras: IGameTileMsg[];
  revealedDoraCount: number;
}

export interface RoomModel {
  id: number;
  config: IGameConfigMsg | null;
  info: GameInfo | null;
  players: PlayerModel[];
}

// Helper functions for seat math and player lookups

export function getPlayerBySeat(
  players: PlayerModel[],
  seat: number,
): PlayerModel | undefined {
  return players.find((p) => p.seat === seat);
}

export function getPlayerById(
  players: PlayerModel[],
  id: number,
): PlayerModel | undefined {
  return players.find((p) => p.id === id);
}

export function nextPlayerSeat(seat: number, playerCount: number): number {
  if (playerCount <= 0) return 0;
  return (seat + 1) % playerCount;
}

export function prevPlayerSeat(seat: number, playerCount: number): number {
  if (playerCount <= 0) return 0;
  return (seat + playerCount - 1) % playerCount;
}

export function getWindKey(round: number): string {
  const winds = ['east', 'south', 'west', 'north'];
  const index = ((round % 4) + 4) % 4;
  return winds[index] ?? 'east';
}

export function getPlayerDisplayName(
  player: PlayerModel,
  t: (key: string) => string,
): string {
  if (player.aiType !== AiType.AI_TYPE_NONE) {
    const enumKey = AiType[player.aiType];
    if (enumKey) {
      const typeName = enumKey.replace('AI_TYPE_', '');
      if (player.nickname === typeName) {
        return t(`ai.type.${enumKey}`);
      }
    }
  }
  return player.nickname;
}
