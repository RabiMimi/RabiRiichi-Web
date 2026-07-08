import { rabiriichi } from '../net/client';
import {
  getEventsFromReplay,
  createInitialRoomFromReplay,
  replayAccountId,
} from './replay';
import { UserStatus, AiType, type IEventMsg } from '../proto';
import { Logger } from '../lib';

const logger = new Logger('ReplayDriver');
let replayTimeout: ReturnType<typeof setTimeout> | null = null;
let resolveProceed: (() => void) | null = null;
const replayState = { running: false };

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

export async function startReplay(): Promise<void> {
  if (replayState.running) {
    stopReplay();
  }
  logger.info('Starting offline replay');

  // Dynamically load the large replay log to keep bundle split
  const { default: replayData } = await import('./fixtures/full_game.json');
  const seat = 1; // Replay from perspective of seat 1

  rabiriichi.dev.setConnectionStatus('connected');
  rabiriichi.dev.setSelf({
    // Account id is deliberately distinct from the seat (see replayAccountId) so
    // the seat<->account-id resolution (selfSeat) is genuinely exercised.
    id: replayAccountId(seat),
    nickname: `Player ${seat}`,
    status: UserStatus.USER_STATUS_PLAYING,
    gameState: null,
    aiType: AiType.AI_TYPE_NONE,
  });

  const initialRoom = createInitialRoomFromReplay(replayData);
  rabiriichi.dev.setRoom(initialRoom);

  const events = getEventsFromReplay(replayData, seat);
  logger.info(`Loaded ${events.length} events for seat ${seat}`);

  let eventIdx = 0;
  replayState.running = true;

  const runBatch = async () => {
    while (eventIdx < events.length && replayState.running) {
      const eventMsg = events[eventIdx];
      eventIdx++;
      if (eventMsg) {
        rabiriichi.dev.handleGameEvent(eventMsg);

        if (!replayState.running) break;

        // Pause replay driver at concludeGameEvent (end of round result screen)
        if (eventMsg.concludeGameEvent) {
          rabiriichi.dev.setWaitingForProceed(true);
          await new Promise<void>((resolve) => {
            resolveProceed = resolve;
          });
          rabiriichi.dev.setWaitingForProceed(false);
          if (!replayState.running) break;
          continue;
        }

        const delay = getEventDelay(eventMsg);
        if (delay > 0) {
          const speed = rabiriichi.animationSpeed;
          await new Promise<void>((resolve) => {
            replayTimeout = setTimeout(resolve, delay / speed);
          });
        }
      }
    }
    stopReplay();
    logger.info('Replay finished');
  };

  void runBatch();
}

export function stopReplay(): void {
  replayState.running = false;
  if (replayTimeout) {
    clearTimeout(replayTimeout);
    replayTimeout = null;
  }
  if (resolveProceed) {
    const resolve = resolveProceed;
    resolveProceed = null;
    resolve();
  }
  logger.info('Replay stopped');
}

// Auto-stop replay if the client transitions to disconnected state (e.g. close() called)
rabiriichi.onChange.subscribe(() => {
  if (rabiriichi.connectionStatus === 'disconnected') {
    stopReplay();
  }
});
