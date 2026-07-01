import { GameLogMsg, UserStatus, AiType } from '../proto/index.js';
import type { IEventMsg, IGameLogMsg } from '../proto/index.js';
import type { RoomModel } from '../domain/model.js';
import { createEmptyTileRegistry } from '../domain/tileRegistry.js';

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
    id: i,
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
