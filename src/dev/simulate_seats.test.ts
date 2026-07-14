import { test } from 'vitest';
import { rabiriichi } from '../net/client';
import {
  getEventsFromReplay,
  createInitialRoomFromReplay,
} from '../replay/replay';
import { createEmptyTileRegistry } from '../domain/tileRegistry';
import { getScreenPosition, getSeatRotation } from '../scene/seat';
import { UserStatus, AiType } from '../proto';
import type { IGameLogMsg } from '../proto';
import replayDataRaw from './fixtures/full_game.json';

const replayData = replayDataRaw as unknown as IGameLogMsg;

test('simulate seats positioning output', () => {
  const seat = 1;
  rabiriichi.replay.setConnectionStatus('connected');
  rabiriichi.replay.setSelf({
    id: seat,
    nickname: `Player ${seat}`,
    status: UserStatus.USER_STATUS_PLAYING,
    gameState: null,
    aiType: AiType.AI_TYPE_NONE,
  });

  const initialRoom = createInitialRoomFromReplay(replayData);
  rabiriichi.replay.setRoom(initialRoom);

  const events = getEventsFromReplay(replayData, seat);
  console.log(`Loaded ${events.length} events.`);

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
  console.log(`Self player: id=${currentUser.id}, seat=${selfSeat}`);

  const playerCount = room.config?.playerCount ?? 2;
  console.log(`Config playerCount: ${playerCount}`);

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

    console.log(
      `Player ID=${player.id} (seat=${player.seat}, Me=${isLocal}, hasGameState=${hasGameState}):`,
    );
    console.log(`  => screenPos=${screenPos}`);
    console.log(
      `  => rotation=${rotation} rad (${rotation !== undefined ? ((rotation * 180) / Math.PI).toFixed(0) : 'N/A'} deg)`,
    );
    console.log(`  => position=[${x?.toFixed(2)}, 0, ${z?.toFixed(2)}]`);
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

  const room = {
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
  console.log(`[2P] Self player: id=${currentUser.id}, seat=${selfSeat}`);

  const playerCount = room.config?.playerCount ?? 2;
  console.log(`[2P] Config playerCount: ${playerCount}`);

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

    console.log(
      `[2P] Player ID=${player.id} (seat=${player.seat}, Me=${isLocal}):`,
    );
    console.log(`  => screenPos=${screenPos}`);
    console.log(
      `  => rotation=${rotation} rad (${rotation !== undefined ? ((rotation * 180) / Math.PI).toFixed(0) : 'N/A'} deg)`,
    );
    console.log(`  => position=[${x?.toFixed(2)}, 0, ${z?.toFixed(2)}]`);
  });
});
