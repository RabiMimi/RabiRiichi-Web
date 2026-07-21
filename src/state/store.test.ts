import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rabiriichi } from '../net/client';
import type { ActiveInquiry } from '../net/client';
import { testStore } from './store';
import type { RoomModel, PlayerModel } from '../domain/model';
import { createEmptyTileRegistry } from '../domain/tileRegistry';
import { MockWebSocket } from '../transport/mockWebSocket';
import { ClientMessageDto, ServerMessageDto, AiType } from '../proto';
import type { IServerMessageDto } from '../proto';
import type { ActionOption } from '../domain/inquiry';
import { CLIENT_VERSION, MIN_SERVER_VERSION } from '../transport/constants';
import { Tile } from '../domain/tile';

describe('RabiRiichi Store', () => {
  beforeEach(() => {
    // Reset rabiriichi state before each test
    rabiriichi.connectionStatus = 'disconnected';
    rabiriichi.self = null;
    rabiriichi.room = null;
    rabiriichi.currentInquiry = null;
    rabiriichi.onChange.clear();
    testStore.reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    rabiriichi.close();
  });

  function sendServerMsg(ws: MockWebSocket, msg: IServerMessageDto) {
    const bytes = ServerMessageDto.encode(msg).finish();
    ws.triggerMessage(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );
  }

  function respondToGetInfo(ws: MockWebSocket) {
    const getInfoCall = ws.send.mock.calls.find((call) => {
      const msg = ClientMessageDto.decode(new Uint8Array(call[0]));
      return Boolean(msg.clientRequest?.getInfo);
    });
    if (getInfoCall) {
      const getInfoMsg = ClientMessageDto.decode(
        new Uint8Array(getInfoCall[0]),
      );
      sendServerMsg(ws, {
        id: 0,
        respondTo: getInfoMsg.id,
        serverResp: {
          getInfo: {
            game: 'rabiriichi',
            gameVersion: CLIENT_VERSION,
            server: 'dotnet',
            serverVersion: MIN_SERVER_VERSION,
            minClientVersion: CLIENT_VERSION,
          },
        },
      });
    }
  }

  it('should initialize with default state', () => {
    expect(testStore.getConnectionStatus()).toBe('disconnected');
    expect(testStore.getSelf()).toBeNull();
    expect(testStore.getRoom()).toBeNull();
    expect(testStore.getCurrentInquiry()).toBeNull();

    const snapshot = testStore.getSnapshot();
    expect(snapshot).toEqual({
      connectionStatus: 'disconnected',
      self: null,
      room: null,
      currentInquiry: null,
      isRiichiSelectMode: false,
      pendingActionOption: null,
      animationSpeed: 1.0,
      isWaitingForProceed: false,
      actionTimeout: 0,
      timerActiveSeat: null,
      ping: -1,
      selectedTileTraceId: null,
      hoveredTileTraceId: null,
      isCameraLocked: true,
      resultAnimation: null,
      isReplay: false,
      isReplayPaused: false,
      replayProgress: 0,
      replayTotal: 0,
      hasInMemoryResult: false,
      autoAgari: false,
      noCalls: false,
      autoDiscard: false,
      autoNuki: false,
      activeStickers: {},
      activeChatTexts: {},
      chatHistory: [],
      characterId: 'mimi',
      volumeSE: 1.0,
      volumeBGM: 1.0,
      volumeVoice: 1.0,
      muteSE: false,
      muteBGM: false,
      muteVoice: false,
      volumeAll: 1.0,
      isSettingsOpen: false,
      autoConnectError: null,
    });
  });

  it('should notify subscribers when onChange emits', () => {
    const listener = vi.fn();
    const unsubscribe = testStore.subscribe(listener);

    rabiriichi.connectionStatus = 'connected';
    rabiriichi.onChange.emit();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(testStore.getConnectionStatus()).toBe('connected');

    unsubscribe();
  });

  it('should support multiple subscribers and unsubscribe', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const unsubscribe1 = testStore.subscribe(listener1);
    const unsubscribe2 = testStore.subscribe(listener2);

    rabiriichi.connectionStatus = 'connected';
    rabiriichi.onChange.emit();

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);

    unsubscribe1();

    rabiriichi.connectionStatus = 'disconnected';
    rabiriichi.onChange.emit();

    expect(listener1).toHaveBeenCalledTimes(1); // Should not be called again
    expect(listener2).toHaveBeenCalledTimes(2); // Should be called again

    unsubscribe2();
  });

  it('should return stable snapshot if state does not change', () => {
    const snapshot1 = testStore.getSnapshot();
    const snapshot2 = testStore.getSnapshot();
    expect(snapshot1).toBe(snapshot2); // Same reference
  });

  it('should return new snapshot when connectionStatus changes', () => {
    const snapshot1 = testStore.getSnapshot();

    rabiriichi.connectionStatus = 'connecting';
    rabiriichi.onChange.emit();

    const snapshot2 = testStore.getSnapshot();
    expect(snapshot2).not.toBe(snapshot1); // New reference
    expect(snapshot2.connectionStatus).toBe('connecting');
  });

  it('should return new snapshot when room changes', () => {
    const snapshot1 = testStore.getSnapshot();

    const mockRoom: RoomModel = {
      id: 1234,
      config: null,
      info: null,
      players: [],
      tileRegistry: createEmptyTileRegistry(),
    };
    rabiriichi.room = mockRoom;
    rabiriichi.onChange.emit();

    const snapshot2 = testStore.getSnapshot();
    expect(snapshot2).not.toBe(snapshot1);
    expect(snapshot2.room).toBe(mockRoom);
  });

  it('should return new snapshot when self changes', () => {
    const snapshot1 = testStore.getSnapshot();

    const mockSelf: PlayerModel = {
      id: 1,
      nickname: 'Test',
      status: 1,
      gameState: null,
      aiType: AiType.AI_TYPE_NONE,
    };
    rabiriichi.self = mockSelf;
    rabiriichi.onChange.emit();

    const snapshot2 = testStore.getSnapshot();
    expect(snapshot2).not.toBe(snapshot1);
    expect(snapshot2.self).toBe(mockSelf);
  });

  it('should return new snapshot when currentInquiry changes', () => {
    const snapshot1 = testStore.getSnapshot();

    const mockInquiry: ActiveInquiry = {
      messageId: 42,
      mapped: {
        buttons: [],
      },
      original: {},
    };
    rabiriichi.currentInquiry = mockInquiry;
    rabiriichi.onChange.emit();

    const snapshot2 = testStore.getSnapshot();
    expect(snapshot2).not.toBe(snapshot1);
    expect(snapshot2.currentInquiry).toBe(mockInquiry);
  });

  it('should return new snapshot when isRiichiSelectMode changes', () => {
    const snapshot1 = testStore.getSnapshot();

    rabiriichi.isRiichiSelectMode = true;
    rabiriichi.onChange.emit();

    const snapshot2 = testStore.getSnapshot();
    expect(snapshot2).not.toBe(snapshot1);
    expect(snapshot2.isRiichiSelectMode).toBe(true);
  });

  it('should return new snapshot when pendingActionOption changes', () => {
    const snapshot1 = testStore.getSnapshot();

    const mockOption = {
      type: 'skip',
      label: 'Skip',
      actionIndex: 0,
    } as ActionOption;
    rabiriichi.pendingActionOption = mockOption;
    rabiriichi.onChange.emit();

    const snapshot2 = testStore.getSnapshot();
    expect(snapshot2).not.toBe(snapshot1);
    expect(snapshot2.pendingActionOption).toBe(mockOption);
  });

  it('maps every dora in room.info.doras in useDoraIndicators hook logic', () => {
    const mockRoom: RoomModel = {
      id: 1234,
      config: null,
      info: {
        round: 0,
        dealer: 0,
        honba: 0,
        riichiStick: 0,
        remainingTiles: 70,
        currentPlayer: 0,
        // The doras list only ever contains already-revealed indicators, so the
        // hook renders it verbatim (no slice-by-count).
        doras: [
          { traceId: 1, tile: 17 }, // 1m
          { traceId: 2, tile: 18 }, // 2m
        ],
        uradoras: [],
      },
      players: [],
      tileRegistry: createEmptyTileRegistry(),
    };
    rabiriichi.room = mockRoom;

    // Simulate hook selector logic
    const indicators = mockRoom.info!.doras.map((doraMsg) => {
      if (doraMsg.tile === null || doraMsg.tile === undefined) return null;
      return Tile.fromByte(doraMsg.tile);
    });

    expect(indicators).toHaveLength(2);
    expect(indicators[0]?.toString()).toBe('1m');
    expect(indicators[1]?.toString()).toBe('2m');
  });

  it('should return new room reference when real event is processed by reducer', async () => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    MockWebSocket.instances = [];
    vi.useFakeTimers();

    // Connect rabiriichi to mock socket
    const connectPromise = rabiriichi.connect(
      'ws://localhost:1234',
      'my-token',
    );
    await vi.advanceTimersByTimeAsync(15);
    const mockWS = MockWebSocket.instances[0]!;
    expect(mockWS).toBeDefined();

    // Respond to sign in
    const signInBytes = mockWS.send.mock.calls[0]![0];
    const signInMsg = ClientMessageDto.decode(new Uint8Array(signInBytes));
    sendServerMsg(mockWS, {
      id: -1,
      respondTo: signInMsg.id,
      serverResp: {
        userInfo: { id: 123, userData: { nickname: 'TestUser' }, status: 1 },
      },
    });
    await vi.advanceTimersByTimeAsync(0);

    // Send version check
    sendServerMsg(mockWS, {
      id: 10,
      serverMsg: {
        versionCheckMsg: {
          serverVersion: MIN_SERVER_VERSION,
          minClientVersion: CLIENT_VERSION,
        },
      },
    });
    await vi.advanceTimersByTimeAsync(0);
    respondToGetInfo(mockWS);
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    // Send Room State Msg to initialize room
    sendServerMsg(mockWS, {
      id: 11,
      serverMsg: {
        roomStateMsg: {
          id: 4321,
          config: { playerCount: 2 },
          players: [
            { id: 123, nickname: 'TestUser', status: 1, seat: 0 },
            { id: 999, nickname: 'Opponent', status: 1, seat: 1 },
          ],
        },
      },
    });
    await vi.advanceTimersByTimeAsync(0);

    const room1 = testStore.getRoom();
    expect(room1).not.toBeNull();
    expect(room1?.id).toBe(4321);

    // Send Begin Game Event (should trigger reducer and produce a NEW room reference)
    sendServerMsg(mockWS, {
      id: 12,
      event: {
        beginGameEvent: {
          round: 0,
          dealer: 0,
          honba: 0,
          riichiStick: 0,
          remainingTiles: 100,
        },
      },
    });
    await vi.advanceTimersByTimeAsync(0);

    const room2 = testStore.getRoom();
    expect(room2).not.toBeNull();
    expect(room2).not.toBe(room1); // Assert reference change
    expect(room2?.id).toBe(4321);
    expect(room2?.info?.round).toBe(0);
  });
});
