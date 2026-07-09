import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  startReplay,
  pauseReplay,
  seekToEvent,
  getRoundStartIndices,
  stopReplay,
  jumpToRound,
} from './replayDriver';
import { rabiriichi } from '../net/client';
import { getEventsFromReplay } from './replay';
import type { IGameLogMsg } from '../proto';
import replayDataRaw from '../dev/fixtures/full_game.json';

const replayData = replayDataRaw as unknown as IGameLogMsg;

describe('ReplayDriver - Seek & Result State Integration', () => {
  beforeEach(() => {
    // Start replay on seat 1, and pause it immediately to control step-by-step
    startReplay(replayData, 1);
    pauseReplay();
  });

  afterEach(() => {
    stopReplay();
  });

  it('should compute correct hasInMemoryResult when seeking back and forth', () => {
    const roundStartIndices = getRoundStartIndices();
    expect(roundStartIndices.length).toBeGreaterThan(1);

    // Import and get events from replay
    const events = getEventsFromReplay(replayData, 1);
    const concludeIndices: number[] = [];
    for (let i = 0; i < events.length; i++) {
      if (events[i]?.concludeGameEvent) {
        concludeIndices.push(i);
      }
    }

    expect(concludeIndices.length).toBeGreaterThan(0);
    const firstConcludeIdx = concludeIndices[0]!;

    // Seek to firstConcludeIdx + 1 (the paused state at the end of Round 1)
    seekToEvent(firstConcludeIdx + 1);
    // Since we seeked to concludeGameEvent, hasInMemoryResult should be true (since the round just ended with a win/draw)
    expect(rabiriichi.hasInMemoryResult).toBe(true);

    // Now seek to the beginning of Round 2 (which is the next round's start)
    // Find the next beginGameEvent index after firstConcludeIdx
    let nextBeginIdx = -1;
    for (let i = firstConcludeIdx + 1; i < events.length; i++) {
      if (events[i]?.beginGameEvent) {
        nextBeginIdx = i;
        break;
      }
    }
    expect(nextBeginIdx).toBeGreaterThan(firstConcludeIdx);

    // Seek to nextBeginIdx + 1 (just after beginGameEvent of Round 2)
    seekToEvent(nextBeginIdx + 1);
    // Since the new round has started, hasInMemoryResult should be false
    expect(rabiriichi.hasInMemoryResult).toBe(false);

    // Seek BACK to firstConcludeIdx + 1 (back to the result panel of Round 1)
    seekToEvent(firstConcludeIdx + 1);
    // It should become true again!
    expect(rabiriichi.hasInMemoryResult).toBe(true);
  });

  it('should skip dealHandEvents when calling jumpToRound to show dealt hands immediately', () => {
    // Jump to Round 2 (index 1)
    jumpToRound(1);

    // Let's verify we are in a state after beginGameEvent but after all dealHandEvents
    const room = rabiriichi.room;
    expect(room).not.toBeNull();
    if (!room) return;

    // Verify all players have non-empty hands now (since dealHandEvents were executed)
    for (const p of room.players) {
      if (p.gameState) {
        expect(p.gameState.hand.freeTiles.length).toBeGreaterThan(0);
      }
    }

    // Verify isAwaitingNextRound is false (since currentPlayer is not -1 and game has started)
    // We can check our updated currentPlayer logic: it should be the dealer (e.g. 0 or 1, not -1)
    expect(room.info?.currentPlayer).not.toBe(-1);
  });
});
