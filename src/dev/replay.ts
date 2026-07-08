import { GameLogMsg, UserStatus, AiType } from '../proto/index.js';
import type { IEventMsg, IGameLogMsg } from '../proto/index.js';
import type { RoomModel } from '../domain/model.js';
import { createEmptyTileRegistry } from '../domain/tileRegistry.js';

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
  const playerLog = logMsg.playerLogs[seat];
  if (!playerLog) return [];

  const events: IEventMsg[] = [];
  for (const log of playerLog.logs ?? []) {
    if (log.event) {
      events.push(log.event);
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

  const players = logMsg.playerLogs.map((_, i) => ({
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
  };
}
