import { GameLogMsg, UserStatus, AiType } from '../proto/index.js';
import type {
  IEventMsg,
  IGameLogMsg,
  IDiscardCandidateMsg,
  IDiscardTileEventMsg,
  ITenpaiInfoMsg,
} from '../proto/index.js';
import type { RoomModel, PlayerModel } from '../domain/model.js';
import { createEmptyTileRegistry } from '../domain/tileRegistry.js';

interface ReplayDiscardTileEventMsg extends IDiscardTileEventMsg {
  awaitedTiles?: ITenpaiInfoMsg[] | null;
}

/**
 * Offset that keeps replay account ids distinct from seat indices. Real account
 * ids are never equal to seat indices, so the replay harness must mirror that to
 * exercise seat-vs-account-id logic (e.g. the `selfSeat` bridge) instead of
 * accidentally passing because id === seat.
 */
export const REPLAY_ACCOUNT_ID_OFFSET = 100;

/** Maps a seat index to a synthetic replay account id (distinct from the seat). */
export function replayAccountId(seat: number): number {
  return seat + REPLAY_ACCOUNT_ID_OFFSET;
}

/**
 * Parses a JSON replay log and returns a list of events from the perspective of the given seat.
 */
export function getEventsFromReplay(
  replayJson: unknown,
  seat: number,
): IEventMsg[] {
  // Use protobufjs fromObject to get typed properties
  const logMsg = GameLogMsg.fromObject(replayJson as Record<string, unknown>);
  const playerLog = logMsg.playerLogs[seat] ?? logMsg.playerLogs[0];
  if (!playerLog) return [];

  // Pre-build a map of all waits by discarded tile trace ID across all player logs.
  // This allows us to resolve tenpai waits for all players in replay.
  const waitsByDiscardTraceId = new Map<number, ITenpaiInfoMsg[]>();
  for (const pLog of logMsg.playerLogs) {
    let pendingCandidates: IDiscardCandidateMsg[] = [];
    for (const log of pLog.logs ?? []) {
      if (log.inquiry) {
        const playTileAction = log.inquiry.actions?.find(
          (a) => a.playTileAction ?? a.riichiAction,
        );
        const action =
          playTileAction?.playTileAction ?? playTileAction?.riichiAction;
        if (action?.candidates) {
          pendingCandidates = action.candidates;
        }
      } else if (log.event?.discardTileEvent) {
        const discard = log.event.discardTileEvent.discarded;
        if (discard?.traceId != null && pendingCandidates.length > 0) {
          const match = pendingCandidates.find(
            (c) => c.tile?.traceId === discard.traceId,
          );
          if (match?.tenpaiInfos && match.tenpaiInfos.length > 0) {
            waitsByDiscardTraceId.set(discard.traceId, match.tenpaiInfos);
          }
          pendingCandidates = []; // clear once consumed
        }
      }
    }
  }

  const events: IEventMsg[] = [];
  for (const log of playerLog.logs ?? []) {
    if (log.event) {
      const ev = log.event;
      if (ev.discardTileEvent) {
        const discard = ev.discardTileEvent.discarded;
        if (discard?.traceId != null) {
          const waits = waitsByDiscardTraceId.get(discard.traceId);
          if (waits) {
            (ev.discardTileEvent as ReplayDiscardTileEventMsg).awaitedTiles =
              waits;
          } else {
            (ev.discardTileEvent as ReplayDiscardTileEventMsg).awaitedTiles =
              null;
          }
        }
      }
      events.push(ev);
    }
  }
  return events;
}

/**
 * Creates the initial room model state using the config and players list from the replay log.
 */
export function createInitialRoomFromReplay(replayJson: unknown): RoomModel {
  const logMsg = GameLogMsg.fromObject(replayJson as Record<string, unknown>);
  const config = (logMsg as IGameLogMsg).config ?? null;
  const playerCount = config?.playerCount ?? 2;

  const players: PlayerModel[] =
    logMsg.players.length > 0
      ? logMsg.players.map((p) => ({
          id: p.id ?? replayAccountId(p.seat ?? 0),
          nickname: p.nickname ?? `Player ${p.seat}`,
          status: UserStatus.USER_STATUS_PLAYING,
          seat: p.seat ?? 0,
          gameState: null,
          aiType: p.aiType ?? AiType.AI_TYPE_NONE,
        }))
      : Array.from({ length: playerCount }, (_, i) => ({
          id: replayAccountId(i),
          nickname: `Player ${i}`,
          status: UserStatus.USER_STATUS_PLAYING,
          seat: i,
          gameState: null,
          aiType: AiType.AI_TYPE_NONE,
        }));

  return {
    id: 114514,
    config,
    info: null,
    players,
    tileRegistry: createEmptyTileRegistry(),
    gameId: logMsg.gameId || null,
  };
}
