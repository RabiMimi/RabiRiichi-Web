import type {
  UserStatus,
  FuritenType,
  IGameConfigMsg,
  IGameTileMsg,
  IScoreStorageMsg,
  IMenLikeMsg,
} from '../proto/index.js';
import { AiType, DoraOption } from '../proto/index.js';
import type { TileRegistry } from './tileRegistry.js';

// Dead-wall layout constants, mirroring the server (Wall.cs). The dead wall is
// laid out at the end of the flattened initialWall as: NUM_DORA dora/ura stacks
// (top=dora, bottom=ura) followed by the rinshan stacks.
export const NUM_DORA = 5;
export const NUM_RINSHAN = 4;
// North (北) tile byte: suit Z(4) << 4 | num 4.
const NORTH_TILE = 68;

/**
 * Number of rinshan (replacement) tiles in the dead wall. Matches the server:
 * base NUM_RINSHAN, plus one per pullable North when nukidora is enabled.
 */
export function deadWallRinshanCount(config: IGameConfigMsg | null): number {
  if (!config) return NUM_RINSHAN;
  const nukidora =
    ((config.doraOption ?? 0) & DoraOption.DORA_OPTION_NUKI_DORA) !== 0;
  if (!nukidora) return NUM_RINSHAN;
  const northCount = (config.initialTiles ?? []).filter(
    (t) => t === NORTH_TILE,
  ).length;
  return NUM_RINSHAN + northCount;
}

export interface PlayerAgariState {
  scores?: IScoreStorageMsg | null;
  incoming?: IGameTileMsg | null;
  gainPoints: number;
  losePoints: number;
  isNagashi?: boolean;
  isTenpai?: boolean;
  // Authoritative win type from the server (AgariEventMsg.is_tsumo). Preferred
  // over inferring from `incoming.discardInfo`, which is unreliable. Absent for
  // ryuukyoku/noten agari states.
  isTsumo?: boolean;
}

export interface PlayerHandState {
  freeTiles: IGameTileMsg[];
  called: IMenLikeMsg[];
  discarded: IGameTileMsg[];
  pendingTile: IGameTileMsg | null;
  // North (北) tiles pulled aside as nukidora (三麻拔北).
  nukiDora: IGameTileMsg[];
}

export interface MappedTenpaiInfo {
  winningTile: number; // tile byte value
  remainingCount: number;
  han: number;
  yakuHan: number; // han counting only yaku (excludes dora); for the 番缚 check
  fu: number;
  yakuman: number;
  points: number;
}

export interface PlayerGameState {
  jun: number;
  points: number;
  riichiTileId: number; // trace_id of the riichi tile, 0 if not riichi
  furiten: Partial<Record<FuritenType, boolean>>;
  hand: PlayerHandState;
  agari: PlayerAgariState | null;
  awaitedTiles?: MappedTenpaiInfo[] | undefined;
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
  // Revealed dora / ura-dora indicators. During play only front doras arrive
  // (one per RevealDoraEvent); at settlement ConcludeGameEvent replaces both
  // lists with the authoritative set the server decided to show (already
  // accounting for kan-dora timing). The arrays' own length is the count of
  // revealed indicators — the client never maintains a separate counter.
  doras: IGameTileMsg[];
  uradoras: IGameTileMsg[];
  initialWall?: IGameTileMsg[];
}

export interface RoomModel {
  id: number;
  config: IGameConfigMsg | null;
  info: GameInfo | null;
  players: PlayerModel[];
  // Every tile the server has mentioned, keyed by traceId. Retains records for
  // tiles that have left the visible structures (e.g. a called riichi tile), so
  // the UI can still look up their info. See domain/tileRegistry.ts.
  tileRegistry: TileRegistry;
  ryuukyokuReason?: string | null;
  gameEnded?: boolean;
  endGamePoints?: number[] | null;
  concludedPlayers?: PlayerModel[] | null;
  // Frozen snapshot of players' result state captured when a round concludes
  // (agari or ryuukyoku). The round-result panel renders this so the settlement
  // stays static even if a player leaves the room while it is shown. Cleared
  // when the next hand deals.
  roundResultPlayers?: PlayerModel[] | null;
  // Dealer seat for the same frozen result. The live dealer advances on
  // NextGameEvent before the result panel closes, so it cannot be used there.
  roundResultDealer?: number | null;
  gameId?: string | null;
}

// Helper functions for seat math and player lookups

/**
 * Whether a winning tile was self-drawn (tsumo) rather than claimed off a
 * discard (ron).
 *
 * The server omits `discardInfo` entirely for a self-drawn tile (a tsumo tile
 * has no discarder), so its absence is the tsumo signal. `discardInfo.from` is a
 * plain int that is never null on the wire, so checking it is not meaningful;
 * only the presence of `discardInfo` matters.
 */
export function isTsumoTile(tile: IGameTileMsg | null | undefined): boolean {
  return tile != null && tile.discardInfo == null;
}

/**
 * Whether an opponent's concealed hand should be revealed at the end of a hand.
 *
 * We reveal winners (they gained points or have a score breakdown) and players
 * who kept tenpai at an exhaustive draw. Noten players at a draw keep their hand
 * hidden even though a ryuukyoku result assigns them an (empty) agari state, so
 * this must NOT trigger merely because `agari` is present. The local player's
 * own hand is always visible, so callers pass `isLocal` to short-circuit.
 */
export function shouldRevealHand(
  agari: PlayerAgariState | null | undefined,
  isLocal: boolean,
): boolean {
  if (isLocal || !agari) return false;
  const isTenpai = agari.isTenpai ?? false;
  const gainedPoints = agari.gainPoints > 0;
  const hasScores = agari.scores != null;
  return isTenpai || gainedPoints || hasScores;
}

/**
 * Whether a wait can actually be won under the minimum-han (番缚) rule. A wait is
 * winnable if it has a yakuman, or its guaranteed yaku han (excluding dora, plus
 * any `bonusYaku` such as +1 for declaring riichi) meets `minHan`.
 */
export function waitMeetsMinHan(
  info: MappedTenpaiInfo,
  minHan: number,
  bonusYaku = 0,
): boolean {
  if (info.yakuman > 0) return true;
  return info.yakuHan + bonusYaku >= minHan;
}

/**
 * Han value to display for a wait, folding in any guaranteed `bonusYaku`. Used
 * for the riichi-select hover preview: those candidates are computed server-side
 * before riichi is committed, so their `han` omits the riichi yaku and would show
 * one han too few. Yakuman waits are counted separately and are not affected.
 */
export function displayHan(info: MappedTenpaiInfo, bonusYaku = 0): number {
  if (info.yakuman > 0) return info.han;
  return info.han + bonusYaku;
}

/**
 * Adds riichi's guaranteed +1 han to each wait. Used for the optimistic local
 * tenpai display when declaring riichi: the server computes those candidates
 * before riichi is committed, so their han/yakuHan omit the riichi yaku.
 * A later sync (computed with riichi committed) already includes it and will
 * overwrite these, so this only fixes the pre-sync display.
 */
export function applyRiichiBonusToWaits(
  waits: MappedTenpaiInfo[],
): MappedTenpaiInfo[] {
  return waits.map((info) =>
    info.yakuman > 0
      ? info
      : { ...info, han: info.han + 1, yakuHan: info.yakuHan + 1 },
  );
}

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

const LLM_SENTINEL = '@llm:';

export function getPlayerDisplayName(
  player: PlayerModel,
  t: (key: string) => string,
): string {
  if (
    player.aiType === AiType.AI_TYPE_LLM &&
    player.nickname.startsWith(LLM_SENTINEL)
  ) {
    const providerTag = player.nickname.slice(LLM_SENTINEL.length);
    const key = `ai.llm.${providerTag}`;
    const localized = t(key);
    return localized && localized !== key ? localized : t('ai.llm.generic');
  }
  if (player.aiType !== AiType.AI_TYPE_NONE) {
    const enumKey = AiType[player.aiType];
    if (enumKey) {
      const typeName = enumKey.replace('AI_TYPE_', '');
      const cleanNick = player.nickname.replace(/_/g, '').toUpperCase();
      const cleanType = typeName.replace(/_/g, '').toUpperCase();
      if (cleanNick === cleanType) {
        return t(`ai.type.${enumKey}`);
      }
    }
  }
  return player.nickname;
}
