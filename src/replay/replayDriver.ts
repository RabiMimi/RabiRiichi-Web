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

function getEventDelay(eventMsg: IEventMsg): number {
  if (eventMsg.drawTileEvent || eventMsg.dealerFirstTurnEvent) {
    return 600;
  }
  if (eventMsg.discardTileEvent) {
    return 1000;
  }
  if (eventMsg.claimTileEvent || eventMsg.kanEvent) {
    return 1200;
  }
  if (
    eventMsg.agariEvent ||
    eventMsg.ryuukyokuEvent ||
    eventMsg.concludeGameEvent
  ) {
    return 3000;
  }
  if (eventMsg.dealHandEvent) {
    return 80;
  }
  return 0;
}

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
  replayState.paused = false;
  replayState.singleStep = false;
  rabiriichi.replay.setConnectionStatus('connected');
  rabiriichi.replay.setSelf({
    id: replayAccountId(perspectiveSeat),
    nickname: `Player ${perspectiveSeat}`,
    status: UserStatus.USER_STATUS_PLAYING,
    gameState: null,
    aiType: AiType.AI_TYPE_NONE,
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
        rabiriichi.replay.handleGameEvent(eventMsg);

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
                rabiriichi.replay.handleGameEvent(nextEv);
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

        if (!replayState.paused) {
          const delay = getEventDelay(eventMsg);
          if (delay > 0) {
            const speed = rabiriichi.animationSpeed;
            await new Promise<void>((resolve) => {
              resolveDelay = resolve;
              replayTimeout = setTimeout(() => {
                resolveDelay = null;
                resolve();
              }, delay / speed);
            });
          }
        }
      }
    }
    logger.info('Replay loop exited');
  };

  void runBatch();
}

export function setReplayPerspective(seat: number): void {
  if (!replayState.running) return;
  logger.info(`Switching replay perspective to seat ${seat}`);
  rabiriichi.replay.setSelf({
    id: replayAccountId(seat),
    nickname: `Player ${seat}`,
    status: UserStatus.USER_STATUS_PLAYING,
    gameState: null,
    aiType: AiType.AI_TYPE_NONE,
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

  if (targetIdx > 0) {
    const lastEv = currentEvents[targetIdx - 1];
    if (lastEv) {
      rabiriichi.replay.handleGameEvent(lastEv);
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
  const baseIdx = roundStartEventIndices[roundIdx];
  if (baseIdx === undefined) return;
  const targetEventIdx = baseIdx + 1;
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
