import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startReplay,
  pauseReplay,
  seekToEvent,
  getRoundStartIndices,
  stopReplay,
  jumpToRound,
  togglePause,
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

  it('should not leak isWaitingForProceed from a stopped session into a fresh replay', async () => {
    // Play forward live so the loop naturally pauses at a round's concludeGameEvent
    // (isWaitingForProceed becomes true), mirroring watching a result screen.
    rabiriichi.setAnimationSpeed(200);
    togglePause();
    await vi.waitFor(
      () => {
        expect(rabiriichi.isWaitingForProceed).toBe(true);
      },
      { timeout: 15000, interval: 20 },
    );

    // Stop the session while the result screen is still showing (a very common
    // user action: watch a result, then rewind/reload the replay).
    stopReplay();
    expect(rabiriichi.isWaitingForProceed).toBe(false);

    // Restarting the same (or another) replay must not inherit the stale flag,
    // otherwise ResultPanel would render immediately against the fresh room
    // (no agari data yet) and show a zeroed score-transfer panel.
    startReplay(replayData, 1);
    expect(rabiriichi.isWaitingForProceed).toBe(false);
  }, 20000);
});

describe('ReplayDriver - reasoning track opt-in', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    stopReplay();
    globalThis.fetch = originalFetch;
    rabiriichi.wsurl = null;
  });

  it('does not touch the network for an ordinary replay', () => {
    const spy = vi.fn();
    globalThis.fetch = spy;
    rabiriichi.wsurl = 'ws://game.example.com';

    // No options: a plain game server is WebSocket-only and serves no REST API.
    startReplay(replayData, 1);
    pauseReplay();

    expect(spy).not.toHaveBeenCalled();
  });

  it('asks the server only when the replay opted in', () => {
    const spy = vi.fn((_url: string) => Promise.reject(new Error('offline')));
    globalThis.fetch = spy as unknown as typeof globalThis.fetch;
    rabiriichi.wsurl = 'ws://arena.example.com';

    startReplay(replayData, 1, { reasoning: true });
    pauseReplay();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toBe(
      'http://arena.example.com/api/arena/matches/' +
        'RABI-REPLAY-9999/reasoning-track',
    );
  });
});
