import { test, expect } from 'vitest';
import { rabiriichi } from '../net/client';
import {
  getEventsFromReplay,
  createInitialRoomFromReplay,
} from '../replay/replay';
import { createEmptyTileRegistry } from '../domain/tileRegistry';
import { getScreenPosition, getSeatRotation } from '../scene/seat';
import type { RoomModel } from '../domain/model';
import { UserStatus, AiType } from '../proto';
import type { IGameLogMsg } from '../proto';
import replayDataRaw from './fixtures/full_game.json';

const replayData = replayDataRaw as unknown as IGameLogMsg;

test('simulate seats positioning output', () => {
  const seat = 1;
  const initialRoom = createInitialRoomFromReplay(replayData);
  const targetPlayer = initialRoom.players.find((p) => p.seat === seat);
  if (!targetPlayer) throw new Error('Player not found at seat 1');

  rabiriichi.replay.setConnectionStatus('connected');
  rabiriichi.replay.setSelf({
    id: targetPlayer.id,
    nickname: targetPlayer.nickname,
    status: UserStatus.USER_STATUS_PLAYING,
    gameState: null,
    aiType: targetPlayer.aiType,
  });

  rabiriichi.replay.setRoom(initialRoom);

  const events = getEventsFromReplay(replayData, seat);
  expect(events.length).toBeGreaterThan(0);

  for (const eventMsg of events) {
    void rabiriichi.replay.handleGameEvent(eventMsg, true);
  }

  const room = rabiriichi.room;
  const currentUser = rabiriichi.self;

  if (!room || !currentUser) {
    throw new Error('Room or current user is null!');
  }

  const selfPlayer = room.players.find((p) => p.id === currentUser.id);
  const selfSeat = selfPlayer?.seat;
  expect(selfSeat).toBeDefined();

  const playerCount = room.config?.playerCount ?? 2;
  expect(playerCount).toBe(4);

  room.players.forEach((player) => {
    const hasGameState = Boolean(player.gameState);
    const isLocal = player.id === currentUser.id;
    const screenPos =
      player.seat !== undefined && selfSeat !== undefined
        ? getScreenPosition(player.seat, selfSeat, playerCount)
        : undefined;
    const rotation =
      screenPos !== undefined ? getSeatRotation(screenPos) : undefined;
    const radius = 2.4;
    const x = rotation !== undefined ? Math.sin(rotation) * radius : undefined;
    const z = rotation !== undefined ? Math.cos(rotation) * radius : undefined;

    expect(hasGameState).toBeTypeOf('boolean');
    expect(isLocal).toBeTypeOf('boolean');
    expect(screenPos).toBeDefined();
    expect(rotation).toBeDefined();
    expect(x).toBeTypeOf('number');
    expect(z).toBeTypeOf('number');
  });
});

test('simulate 2-player positioning', () => {
  rabiriichi.replay.setConnectionStatus('connected');
  rabiriichi.replay.setSelf({
    id: 123, // Me
    nickname: `Player 123`,
    status: UserStatus.USER_STATUS_PLAYING,
    gameState: null,
    aiType: AiType.AI_TYPE_NONE,
  });

  const room: RoomModel = {
    id: 114514,
    config: {
      playerCount: 2,
    },
    info: {
      round: 0,
      dealer: 0,
      honba: 0,
      riichiStick: 0,
      remainingTiles: 70,
      currentPlayer: 0,
      doras: [],
      uradoras: [],
    },
    players: [
      {
        id: 123, // Me
        nickname: 'Me',
        status: UserStatus.USER_STATUS_PLAYING,
        seat: 1,
        gameState: {
          points: 25000,
          hand: {
            freeTiles: [],
            called: [],
            discarded: [],
            pendingTile: null,
            nukiDora: [],
          },
          furiten: {},
          riichiTileId: 0,
          jun: 0,
          agari: null,
        },
        aiType: AiType.AI_TYPE_NONE,
      },
      {
        id: 456, // Opponent
        nickname: 'Opponent',
        status: UserStatus.USER_STATUS_PLAYING,
        seat: 0,
        gameState: {
          points: 25000,
          hand: {
            freeTiles: [],
            called: [],
            discarded: [],
            pendingTile: null,
            nukiDora: [],
          },
          furiten: {},
          riichiTileId: 0,
          jun: 0,
          agari: null,
        },
        aiType: AiType.AI_TYPE_NONE,
      },
    ],
    tileRegistry: createEmptyTileRegistry(),
  };

  rabiriichi.replay.setRoom(room);

  const currentUser = rabiriichi.self;
  if (!currentUser) throw new Error('Self is null');

  const selfPlayer = room.players.find((p) => p.id === currentUser.id);
  const selfSeat = selfPlayer?.seat;
  expect(selfSeat).toBeDefined();

  const playerCount = room.config?.playerCount ?? 2;
  expect(playerCount).toBe(2);

  room.players.forEach((player) => {
    const isLocal = player.id === currentUser.id;
    const screenPos =
      player.seat !== undefined && selfSeat !== undefined
        ? getScreenPosition(player.seat, selfSeat, playerCount)
        : undefined;
    const rotation =
      screenPos !== undefined ? getSeatRotation(screenPos) : undefined;
    const radius = 2.4;
    const x = rotation !== undefined ? Math.sin(rotation) * radius : undefined;
    const z = rotation !== undefined ? Math.cos(rotation) * radius : undefined;

    expect(isLocal).toBeTypeOf('boolean');
    expect(screenPos).toBeDefined();
    expect(rotation).toBeDefined();
    expect(x).toBeTypeOf('number');
    expect(z).toBeTypeOf('number');
  });
});
