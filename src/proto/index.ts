import {
  EventMsg,
  ServerMessageDto,
  ClientMessageDto,
  ServerErrorResponse,
  GameTileMsg,
  GameLogMsg,
  AgariType,
  UserStatus,
  TileSource,
  FuritenType,
  ScoringType,
  GameStateMsg,
} from '../generated/protos.js';

export {
  EventMsg,
  ServerMessageDto,
  ClientMessageDto,
  ServerErrorResponse,
  GameTileMsg,
  GameLogMsg,
  AgariType,
  UserStatus,
  TileSource,
  FuritenType,
  ScoringType,
  GameStateMsg,
};

export type IEventMsg = EventMsg.$Properties;
export type IServerMessageDto = ServerMessageDto.$Properties;
export type IClientMessageDto = ClientMessageDto.$Properties;
export type IServerErrorResponse = ServerErrorResponse.$Properties;
export type IGameTileMsg = GameTileMsg.$Properties;
export type IGameLogMsg = GameLogMsg.$Properties;
export type IGameStateMsg = GameStateMsg.$Properties;
