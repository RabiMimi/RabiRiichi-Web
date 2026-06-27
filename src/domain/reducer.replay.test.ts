import { describe, it, expect } from 'vitest';
import {
  getEventsFromReplay,
  createInitialRoomFromReplay,
} from '../dev/replay.js';
import { applyEvent } from './reducer.js';
import type { RoomModel } from './model.js';
import type { IGameLogMsg } from '../proto/index.js';
import replayDataRaw from '../dev/fixtures/full_game.json';

const replayData = replayDataRaw as unknown as IGameLogMsg;

describe('Reducer Integration - Replay Log', () => {
  it('should replay the entire game for seat 1 without throwing', () => {
    let state = createInitialRoomFromReplay(replayData);
    const events = getEventsFromReplay(replayData, 1);
    const playerLogs = replayData.playerLogs;
    expect(playerLogs).toBeDefined();
    expect(playerLogs).not.toBeNull();
    if (!playerLogs) return;
    const expectedPlayersCount = playerLogs.length;

    expect(events.length).toBeGreaterThan(0);

    let stateBeforeStop: RoomModel | null = null;

    for (const eventMsg of events) {
      if (eventMsg.stopGameEvent) {
        stateBeforeStop = state;
      }
      state = applyEvent(state, eventMsg);
    }

    // Verify final state (concluded)
    expect(state.players).toHaveLength(expectedPlayersCount);
    expect(state.info).toBeNull();
    for (const p of state.players) {
      expect(p.gameState).toBeNull();
    }

    // Verify active play state before stop
    expect(stateBeforeStop).not.toBeNull();
    if (!stateBeforeStop) return;
    const activeState = stateBeforeStop;
    expect(activeState.info).not.toBeNull();

    let totalPoints = 0;
    for (let i = 0; i < expectedPlayersCount; i++) {
      const p = activeState.players.find((player) => player.seat === i);
      expect(p?.gameState).not.toBeNull();
      totalPoints += p?.gameState?.points ?? 0;
    }

    // In riichi mahjong, points are conserved (4 players starting with 25k -> total 100k)
    expect(totalPoints).toBe(expectedPlayersCount * 25000);
  });

  it('should replay the entire game for all seats without throwing', () => {
    const playerLogs = replayData.playerLogs;
    expect(playerLogs).toBeDefined();
    expect(playerLogs).not.toBeNull();
    if (!playerLogs) return;
    const numSeats = playerLogs.length;
    expect(numSeats).toBeGreaterThan(0);

    for (let seat = 0; seat < numSeats; seat++) {
      let state = createInitialRoomFromReplay(replayData);
      const events = getEventsFromReplay(replayData, seat);

      let stateBeforeStop: RoomModel | null = null;

      for (const eventMsg of events) {
        if (eventMsg.stopGameEvent) {
          stateBeforeStop = state;
        }
        state = applyEvent(state, eventMsg);
      }

      // Verify that we successfully captured active state and points are conserved
      expect(stateBeforeStop).not.toBeNull();
      if (!stateBeforeStop) continue;
      const activeState = stateBeforeStop;
      let totalPoints = 0;
      for (let i = 0; i < numSeats; i++) {
        const p = activeState.players.find((player) => player.seat === i);
        expect(p?.gameState).not.toBeNull();
        totalPoints += p?.gameState?.points ?? 0;
      }
      expect(totalPoints).toBe(numSeats * 25000);
    }
  });
});
