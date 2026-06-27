import { rabiriichi } from '../net/client';
import { getEventsFromReplay, createInitialRoomFromReplay } from './replay';
import { UserStatus } from '../proto';
import { Logger } from '../lib';

const logger = new Logger('ReplayDriver');
let replayInterval: ReturnType<typeof setInterval> | null = null;

export async function startReplay(): Promise<void> {
  logger.info('Starting offline replay');

  // Dynamically load the large replay log to keep bundle split
  const { default: replayData } = await import('./fixtures/full_game.json');
  const seat = 1; // Replay from perspective of seat 1

  rabiriichi.dev.setConnectionStatus('connected');
  rabiriichi.dev.setSelf({
    id: seat,
    nickname: `Player ${seat}`,
    status: UserStatus.USER_STATUS_PLAYING,
    gameState: null,
  });

  const initialRoom = createInitialRoomFromReplay(replayData);
  rabiriichi.dev.setRoom(initialRoom);

  const events = getEventsFromReplay(replayData, seat);
  logger.info(`Loaded ${events.length} events for seat ${seat}`);

  let eventIdx = 0;
  replayInterval = setInterval(() => {
    if (eventIdx >= events.length) {
      stopReplay();
      logger.info('Replay finished');
      return;
    }

    const eventMsg = events[eventIdx];
    eventIdx++;
    if (eventMsg) {
      rabiriichi.dev.handleGameEvent(eventMsg);
    }
  }, 800);
}

export function stopReplay(): void {
  if (replayInterval) {
    clearInterval(replayInterval);
    replayInterval = null;
    logger.info('Replay stopped');
  }
}

// Auto-stop replay if the client transitions to disconnected state (e.g. close() called)
rabiriichi.onChange.subscribe(() => {
  if (rabiriichi.connectionStatus === 'disconnected') {
    stopReplay();
  }
});
