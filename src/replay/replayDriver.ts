import { rabiriichi, initRabiRiichi } from '../net/client';
import {
  getEventsFromReplay,
  createInitialRoomFromReplay,
  replayAccountId,
} from './replay';
import { UserStatus, AiType, type IEventMsg } from '../proto';
import { Logger } from '../lib';
import { applyEvent } from '../domain/reducer';
import type { RoomModel } from '../domain/model';

const logger = new Logger('ReplayDriver');
let replayTimeout: ReturnType<typeof setTimeout> | null = null;
let resolveProceed: (() => void) | null = null;
let resolvePause: (() => void) | null = null;
let resolveDelay: (() => void) | null = null;
let resolveEndBlock: (() => void) | null = null;

let currentEvents: IEventMsg[] = [];
let currentInitialRoom: RoomModel | null = null;
let eventIdx = 0;
let roundStartEventIndices: number[] = [];

const replayState: { running: boolean; paused: boolean; singleStep: boolean } =
  {
    running: false,
    paused: false,
    singleStep: false,
  };
const isRunning = () => replayState.running;

export function proceedReplay(): void {
  if (resolveProceed) {
    const resolve = resolveProceed;
    resolveProceed = null;
    resolve();
  }
}

export function startReplay(replayData: unknown, perspectiveSeat = 0): void {
  if (replayState.running) {
    stopReplay();
  }
  logger.info(`Starting replay for seat ${perspectiveSeat}`);
  rabiriichi.close();

  currentEvents = getEventsFromReplay(replayData, perspectiveSeat);
  currentInitialRoom = createInitialRoomFromReplay(replayData);
  eventIdx = 0;
  roundStartEventIndices = [];
  for (let i = 0; i < currentEvents.length; i++) {
    if (currentEvents[i]?.beginGameEvent) {
      roundStartEventIndices.push(i);
    }
  }

  rabiriichi.replay.setIsReplay(true);
  rabiriichi.replay.setReplayPaused(false);
  // A previous replay session may have been stopped while its round-result
  // screen was showing (isWaitingForProceed left true). Without resetting it
  // here, the fresh room (no agari data yet) would immediately satisfy
  // ResultPanel's showPanel condition and render a zeroed score-transfer
  // panel before any events have replayed.
  rabiriichi.replay.setWaitingForProceed(false);
  replayState.paused = false;
  replayState.singleStep = false;
  rabiriichi.replay.setConnectionStatus('connected');
  const selfPlayer = currentInitialRoom.players.find(
    (p) => p.seat === perspectiveSeat,
  );
  const selfId = selfPlayer?.id ?? replayAccountId(perspectiveSeat);
  const selfNickname = selfPlayer?.nickname ?? `Player ${perspectiveSeat}`;

  rabiriichi.replay.setSelf({
    id: selfId,
    nickname: selfNickname,
    status: UserStatus.USER_STATUS_PLAYING,
    gameState: null,
    aiType: selfPlayer?.aiType ?? AiType.AI_TYPE_NONE,
  });

  rabiriichi.replay.setRoom(currentInitialRoom);
  rabiriichi.replay.setReplayTotal(currentEvents.length);
  rabiriichi.replay.setReplayProgress(0);

  logger.info(`Loaded ${currentEvents.length} events`);
  replayState.running = true;

  const runBatch = async () => {
    while (isRunning()) {
      if (eventIdx >= currentEvents.length) {
        logger.info('Replay reached the end of events. Blocking loop.');
        await new Promise<void>((resolve) => {
          resolveEndBlock = resolve;
        });
        continue;
      }

      if (replayState.paused && !replayState.singleStep) {
        await new Promise<void>((resolve) => {
          resolvePause = resolve;
        });
      }
      if (!isRunning()) break;

      const eventMsg = currentEvents[eventIdx];
      eventIdx++;
      rabiriichi.replay.setReplayProgress(eventIdx);

      if (eventMsg) {
        await rabiriichi.replay.handleGameEvent(eventMsg);

        if (!isRunning()) break;

        if (replayState.singleStep && isStepPoint(eventMsg)) {
          replayState.singleStep = false;
          replayState.paused = true;
          rabiriichi.replay.setReplayPaused(true);
        }

        // Pause replay driver at concludeGameEvent (end of round result screen)
        if (eventMsg.concludeGameEvent) {
          const lastRound = isLastRound(eventIdx);
          if (lastRound) {
            logger.info(
              'ConcludeGameEvent in last round. Applying remaining events before pausing.',
            );
            while (eventIdx < currentEvents.length) {
              const nextEv = currentEvents[eventIdx];
              eventIdx++;
              if (nextEv) {
                await rabiriichi.replay.handleGameEvent(nextEv, true);
              }
            }
            rabiriichi.replay.setReplayProgress(eventIdx);

            const room = rabiriichi.room;
            if (room && !room.gameEnded) {
              logger.info('Forcing gameEnded = true in last round fallback');
              rabiriichi.replay.setRoom({
                ...room,
                gameEnded: true,
              });
            }
          }

          rabiriichi.replay.setWaitingForProceed(true);
          await new Promise<void>((resolve) => {
            resolveProceed = resolve;
          });
          rabiriichi.replay.setWaitingForProceed(false);
          if (!isRunning()) break;
          // When auto-proceeding or manual next round, ensure we check paused state again
          continue;
        }
      }
    }
    logger.info('Replay loop exited');
  };

  void runBatch();
}

export function setReplayPerspective(seat: number): void {
  if (!replayState.running || !rabiriichi.room) return;
  logger.info(`Switching replay perspective to seat ${seat}`);
  const targetPlayer = rabiriichi.room.players.find((p) => p.seat === seat);
  if (!targetPlayer) {
    logger.warn(`Could not find player at seat ${seat} to switch perspective`);
    return;
  }
  rabiriichi.replay.setSelf({
    id: targetPlayer.id,
    nickname: targetPlayer.nickname,
    status: UserStatus.USER_STATUS_PLAYING,
    gameState: null,
    aiType: targetPlayer.aiType,
  });
}

export function togglePause(): void {
  if (!replayState.running) return;
  replayState.paused = !replayState.paused;
  logger.info(`Replay ${replayState.paused ? 'paused' : 'resumed'}`);
  rabiriichi.replay.setReplayPaused(replayState.paused);
  if (!replayState.paused && resolvePause) {
    const resolve = resolvePause;
    resolvePause = null;
    resolve();
  }
}

const isStepPoint = (ev: IEventMsg): boolean => {
  return Boolean(
    ev.discardTileEvent ??
    ev.drawTileEvent ??
    ev.claimTileEvent ??
    ev.agariEvent ??
    ev.ryuukyokuEvent ??
    ev.dealerFirstTurnEvent ??
    ev.concludeGameEvent,
  );
};

function isLastRound(startIdx: number): boolean {
  for (let i = startIdx; i < currentEvents.length; i++) {
    const ev = currentEvents[i];
    if (!ev) continue;
    if (ev.stopGameEvent) {
      return true;
    }
    if (ev.beginGameEvent || ev.dealHandEvent) {
      return false;
    }
  }
  return true;
}

function stepBackward(): void {
  if (!replayState.running || !currentInitialRoom) return;

  let targetIdx = 0;
  for (let i = eventIdx - 2; i >= 0; i--) {
    const ev = currentEvents[i];
    if (ev && isStepPoint(ev)) {
      targetIdx = i + 1;
      break;
    }
  }

  seekToEvent(targetIdx);
}

export function stepReplay(direction: 1 | -1 = 1): void {
  if (!replayState.running) return;

  if (direction === -1) {
    stepBackward();
    return;
  }

  if (!replayState.paused) return;
  logger.info('Stepping replay one step forward');
  replayState.singleStep = true;
  if (resolvePause) {
    const resolve = resolvePause;
    resolvePause = null;
    resolve();
  }
}

export function stopReplay(): void {
  if (!replayState.running) return;
  replayState.running = false;
  if (replayTimeout) {
    clearTimeout(replayTimeout);
    replayTimeout = null;
  }
  if (resolveDelay) {
    const resolve = resolveDelay;
    resolveDelay = null;
    resolve();
  }
  if (resolveProceed) {
    const resolve = resolveProceed;
    resolveProceed = null;
    resolve();
  }
  if (resolveEndBlock) {
    const resolve = resolveEndBlock;
    resolveEndBlock = null;
    resolve();
  }
  rabiriichi.replay.setIsReplay(false);
  rabiriichi.replay.setReplayPaused(false);
  rabiriichi.replay.setWaitingForProceed(false);
  replayState.paused = false;
  replayState.singleStep = false;
  if (resolvePause) {
    const resolve = resolvePause;
    resolvePause = null;
    resolve();
  }
  rabiriichi.replay.setConnectionStatus('disconnected');
  rabiriichi.replay.setSelf(null);
  rabiriichi.replay.setRoom(null);
  rabiriichi.replay.setReplayProgress(0);
  rabiriichi.replay.setReplayTotal(0);

  currentEvents = [];
  currentInitialRoom = null;
  eventIdx = 0;

  logger.info('Replay stopped');
  void initRabiRiichi();
}

export function seekToEvent(targetIdx: number): void {
  if (!replayState.running || !currentInitialRoom) return;

  targetIdx = Math.max(0, Math.min(targetIdx, currentEvents.length));
  logger.info(
    `Seeking replay to event index ${targetIdx}/${currentEvents.length}`,
  );

  if (replayTimeout) {
    clearTimeout(replayTimeout);
    replayTimeout = null;
  }
  if (resolveDelay) {
    const resolve = resolveDelay;
    resolveDelay = null;
    resolve();
  }
  if (resolveEndBlock) {
    const resolve = resolveEndBlock;
    resolveEndBlock = null;
    resolve();
  }

  let room = currentInitialRoom;
  const applyLimit = targetIdx - 1;
  for (let i = 0; i < applyLimit; i++) {
    const ev = currentEvents[i];
    if (ev) {
      room = applyEvent(room, ev);
    }
  }

  rabiriichi.replay.setRoom(room);

  // Recalculate hasInMemoryResult for the seeked position
  let hasResult = false;
  for (let i = 0; i < targetIdx; i++) {
    const ev = currentEvents[i];
    if (ev) {
      if (ev.agariEvent || ev.ryuukyokuEvent) {
        hasResult = true;
      }
      if (ev.beginGameEvent) {
        hasResult = false;
      }
    }
  }
  rabiriichi.replay.setHasInMemoryResult(hasResult);

  if (targetIdx > 0) {
    const lastEv = currentEvents[targetIdx - 1];
    if (lastEv) {
      void rabiriichi.replay.handleGameEvent(lastEv, true);
    }
  }

  eventIdx = targetIdx;
  rabiriichi.replay.setReplayProgress(eventIdx);

  rabiriichi.replay.setWaitingForProceed(false);
  if (resolveProceed) {
    const resolve = resolveProceed;
    resolveProceed = null;
    resolve();
  }
}

// Auto-stop replay if the client transitions to disconnected state (e.g. close() called)
rabiriichi.onChange.subscribe(() => {
  if (rabiriichi.connectionStatus === 'disconnected' && rabiriichi.isReplay) {
    stopReplay();
  }
});

export function getRoundStartIndices(): number[] {
  return roundStartEventIndices;
}

export function getCurrentRoundIndex(): number {
  const targetIdx = rabiriichi.replayProgress;
  let currentRoundIdx = 0;
  for (let i = 0; i < roundStartEventIndices.length; i++) {
    const startIdx = roundStartEventIndices[i];
    if (startIdx !== undefined && startIdx < targetIdx) {
      currentRoundIdx = i;
    } else {
      break;
    }
  }
  return currentRoundIdx;
}

export function jumpToRound(roundIdx: number): void {
  if (roundIdx < 0 || roundIdx >= roundStartEventIndices.length) return;
  const beginIdx = roundStartEventIndices[roundIdx];
  if (beginIdx === undefined) return;

  // Scan forward to skip beginGameEvent and dealHandEvents to show dealt hands immediately
  let targetEventIdx = beginIdx + 1;
  while (targetEventIdx < currentEvents.length) {
    const ev = currentEvents[targetEventIdx];
    if (ev && !ev.beginGameEvent && !ev.dealHandEvent) {
      break;
    }
    targetEventIdx++;
  }
  if (targetEventIdx >= currentEvents.length) {
    targetEventIdx = beginIdx + 1;
  }

  seekToEvent(targetEventIdx);
  pauseReplay();
}

export function pauseReplay(): void {
  if (!replayState.running) return;
  if (!replayState.paused) {
    replayState.paused = true;
    logger.info('Replay paused');
    rabiriichi.replay.setReplayPaused(true);
  }
}

export function getCurrentRoundEvents(): IEventMsg[] {
  const roundIdx = getCurrentRoundIndex();
  if (roundIdx < 0 || roundIdx >= roundStartEventIndices.length) return [];
  const beginIdx = roundStartEventIndices[roundIdx];
  if (beginIdx === undefined) return [];
  const nextRoundIdx = roundIdx + 1;
  const endIdx =
    nextRoundIdx < roundStartEventIndices.length
      ? roundStartEventIndices[nextRoundIdx]
      : currentEvents.length;
  if (endIdx === undefined) return [];
  return currentEvents.slice(beginIdx, endIdx);
}
