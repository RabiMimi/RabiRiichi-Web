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
  DiscardReason,
  DiscardCandidateMsg,
  FuritenType,
  ScoringType,
  GameStateMsg,
  GameConfigMsg,
  ScoreStorageMsg,
  ScoringMsg,
  ServerRoomStateMsg,
  ServerPlayerStateMsg,
  PlayerStateMsg,
  PlayerHandStateMsg,
  PlayerActionMsg,
  WallStateMsg,
  MenLikeMsg,
  BeginGameEventMsg,
  DealHandEventMsg,
  DrawTileEventMsg,
  DiscardTileEventMsg,
  ClaimTileEventMsg,
  KanEventMsg,
  NukiDoraEventMsg,
  AddNukiDoraEventMsg,
  NukiDoraActionMsg,
  NextPlayerEventMsg,
  IncreaseJunEventMsg,
  RevealDoraEventMsg,
  SetRiichiEventMsg,
  SetFuritenEventMsg,
  AddKanEventMsg,
  DealerFirstTurnEventMsg,
  AddTileEventMsg,
  AgariEventMsg,
  ApplyScoreEventMsg,
  ConcludeGameEventMsg,
  NextGameEventMsg,
  RyuukyokuEventMsg,
  StopGameEventMsg,
  SyncGameStateEventMsg,
  SinglePlayerInquiryMsg,
  TenpaiInfoMsg,
  ServerVersionCheckMsg,
  ClientVersionCheckMsg,
  TwoWayHeartBeatMsg,
  UserInfoResponse,
  ServerInquiryMsg,
  CreateUserResponse,
  ServerResponse,
  ServerRoomStateResponse,
  CreateRoomRequest,
  GetInfoResponse,
  KuikaePolicy,
  RiichiPolicy,
  RyuukyokuTrigger,
  RenchanPolicy,
  EndGamePolicy,
  DoraOption,
  AgariOption,
  ScoringOption,
  PointsDeductionPolicy,
  AiType,
  AddAiRequest,
  LlmAiConfig,
  LlmProvider,
  LlmPromptTemplate,
  PlayerChatMessage,
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
  DiscardReason,
  DiscardCandidateMsg,
  FuritenType,
  ScoringType,
  GameStateMsg,
  GameConfigMsg,
  ScoreStorageMsg,
  ScoringMsg,
  ServerRoomStateMsg,
  ServerPlayerStateMsg,
  PlayerStateMsg,
  PlayerHandStateMsg,
  PlayerActionMsg,
  WallStateMsg,
  MenLikeMsg,
  BeginGameEventMsg,
  DealHandEventMsg,
  DrawTileEventMsg,
  DiscardTileEventMsg,
  ClaimTileEventMsg,
  KanEventMsg,
  NukiDoraEventMsg,
  AddNukiDoraEventMsg,
  NukiDoraActionMsg,
  NextPlayerEventMsg,
  IncreaseJunEventMsg,
  RevealDoraEventMsg,
  SetRiichiEventMsg,
  SetFuritenEventMsg,
  AddKanEventMsg,
  DealerFirstTurnEventMsg,
  AddTileEventMsg,
  AgariEventMsg,
  ApplyScoreEventMsg,
  ConcludeGameEventMsg,
  NextGameEventMsg,
  RyuukyokuEventMsg,
  StopGameEventMsg,
  SyncGameStateEventMsg,
  SinglePlayerInquiryMsg,
  TenpaiInfoMsg,
  ServerVersionCheckMsg,
  ClientVersionCheckMsg,
  TwoWayHeartBeatMsg,
  UserInfoResponse,
  ServerInquiryMsg,
  CreateUserResponse,
  ServerResponse,
  ServerRoomStateResponse,
  CreateRoomRequest,
  GetInfoResponse,
  KuikaePolicy,
  RiichiPolicy,
  RyuukyokuTrigger,
  RenchanPolicy,
  EndGamePolicy,
  DoraOption,
  AgariOption,
  ScoringOption,
  PointsDeductionPolicy,
  AiType,
  AddAiRequest,
  LlmAiConfig,
  LlmProvider,
  LlmPromptTemplate,
  PlayerChatMessage,
};

export type IEventMsg = EventMsg.$Properties;
export type IServerMessageDto = ServerMessageDto.$Properties;
export type IClientMessageDto = ClientMessageDto.$Properties;
export type IServerErrorResponse = ServerErrorResponse.$Properties;
export type IGameTileMsg = GameTileMsg.$Properties;
export type IGameLogMsg = GameLogMsg.$Properties;
export type IGameStateMsg = GameStateMsg.$Properties;
export type IGameConfigMsg = GameConfigMsg.$Properties;
export type IScoreStorageMsg = ScoreStorageMsg.$Properties;
export type IServerRoomStateMsg = ServerRoomStateMsg.$Properties;
export type IServerPlayerStateMsg = ServerPlayerStateMsg.$Properties;
export type IPlayerStateMsg = PlayerStateMsg.$Properties;
export type IPlayerHandStateMsg = PlayerHandStateMsg.$Properties;
export type IWallStateMsg = WallStateMsg.$Properties;
export type IMenLikeMsg = MenLikeMsg.$Properties;
export type IBeginGameEventMsg = BeginGameEventMsg.$Properties;
export type IDealHandEventMsg = DealHandEventMsg.$Properties;
export type IDrawTileEventMsg = DrawTileEventMsg.$Properties;
export type IDiscardTileEventMsg = DiscardTileEventMsg.$Properties;
export type IClaimTileEventMsg = ClaimTileEventMsg.$Properties;
export type IKanEventMsg = KanEventMsg.$Properties;
export type INukiDoraEventMsg = NukiDoraEventMsg.$Properties;
export type IAddNukiDoraEventMsg = AddNukiDoraEventMsg.$Properties;
export type INukiDoraActionMsg = NukiDoraActionMsg.$Properties;
export type INextPlayerEventMsg = NextPlayerEventMsg.$Properties;
export type IIncreaseJunEventMsg = IncreaseJunEventMsg.$Properties;
export type IRevealDoraEventMsg = RevealDoraEventMsg.$Properties;
export type ISetRiichiEventMsg = SetRiichiEventMsg.$Properties;
export type ISetFuritenEventMsg = SetFuritenEventMsg.$Properties;
export type IAddKanEventMsg = AddKanEventMsg.$Properties;
export type IDealerFirstTurnEventMsg = DealerFirstTurnEventMsg.$Properties;
export type IAddTileEventMsg = AddTileEventMsg.$Properties;
export type IAgariEventMsg = AgariEventMsg.$Properties;
export type IApplyScoreEventMsg = ApplyScoreEventMsg.$Properties;
export type IConcludeGameEventMsg = ConcludeGameEventMsg.$Properties;
export type INextGameEventMsg = NextGameEventMsg.$Properties;
export type IRyuukyokuEventMsg = RyuukyokuEventMsg.$Properties;
export type IStopGameEventMsg = StopGameEventMsg.$Properties;
export type ISyncGameStateEventMsg = SyncGameStateEventMsg.$Properties;
export type ISinglePlayerInquiryMsg = SinglePlayerInquiryMsg.$Properties;
export type ITenpaiInfoMsg = TenpaiInfoMsg.$Properties;
export type IServerVersionCheckMsg = ServerVersionCheckMsg.$Properties;
export type IClientVersionCheckMsg = ClientVersionCheckMsg.$Properties;
export type ITwoWayHeartBeatMsg = TwoWayHeartBeatMsg.$Properties;
export type IUserInfoResponse = UserInfoResponse.$Properties;
export type IServerInquiryMsg = ServerInquiryMsg.$Properties;
export type ICreateUserResponse = CreateUserResponse.$Properties;
export type IServerResponse = ServerResponse.$Properties;
export type IServerRoomStateResponse = ServerRoomStateResponse.$Properties;
export type ICreateRoomRequest = CreateRoomRequest.$Properties;
export type IGetInfoResponse = GetInfoResponse.$Properties;
export type IAddAiRequest = AddAiRequest.$Properties;
export type ILlmAiConfig = LlmAiConfig.$Properties;
export type IScoringMsg = ScoringMsg.$Properties;
export type IPlayerChatMessage = PlayerChatMessage.$Properties;
export type IPlayerActionMsg = PlayerActionMsg.$Properties;
export type IDiscardCandidateMsg = DiscardCandidateMsg.$Properties;
