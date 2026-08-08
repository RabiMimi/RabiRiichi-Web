import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import { RabiRiichiClient, initRabiRiichi, rabiriichi } from './client';
import { MockWebSocket } from '../transport/mockWebSocket';
import {
  ClientMessageDto,
  ServerMessageDto,
  UserStatus,
  AiType,
} from '../proto';
import { TILE_SET_PRESETS } from '../domain/tilesets';
import {
  CLIENT_VERSION,
  MIN_SERVER_VERSION,
  WS_CONNECT_TIMEOUT,
} from '../transport/constants';
import {
  STORAGE_KEY_SERVER_SETTINGS,
  STORAGE_KEY_CLIENT_SETTINGS,
  type ServerSettings,
  type ClientSettings,
} from '../domain/constants';

import type { ServerCredentials } from './credentialStore';
import type { IServerMessageDto, ISinglePlayerInquiryMsg } from '../proto';
import type { KeyValueStore } from '../platform/storage';
import type { WebSocketFactory } from '../platform/socket';
import type { RoomModel } from '../domain/model';
import { createEmptyTileRegistry } from '../domain/tileRegistry';
import { mapInquiry } from '../domain/inquiry';

function toNormalNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'object' && 'toNumber' in val) {
    const hasToNumber = val as { toNumber: () => number };
    if (typeof hasToNumber.toNumber === 'function') {
      return hasToNumber.toNumber();
    }
  }
  return Number(val);
}

describe('RabiRiichiClient', () => {
  let mockLocalStorage: Record<string, string>;
  let setItemMock: Mock<(key: string, value: string) => void>;

  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    MockWebSocket.instances = [];

    vi.stubGlobal('crypto', {
      subtle: {
        digest: vi.fn().mockResolvedValue(new Uint8Array(32)),
      },
    });

    mockLocalStorage = {};
    setItemMock = vi.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
      setItem: setItemMock,
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function sendServerMsg(ws: MockWebSocket, msg: IServerMessageDto) {
    const bytes = ServerMessageDto.encode(msg).finish();
    ws.triggerMessage(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );
  }

  /**
   * Drives the server->client version handshake that every connection (public
   * and authenticated) must pass before use.
   */
  function sendServerVersionCheck(ws: MockWebSocket, id = 10) {
    sendServerMsg(ws, {
      id,
      serverMsg: {
        versionCheckMsg: {
          serverVersion: MIN_SERVER_VERSION,
          minClientVersion: CLIENT_VERSION,
        },
      },
    });
  }

  function findSend(
    ws: MockWebSocket,
    pred: (msg: ReturnType<typeof ClientMessageDto.decode>) => boolean,
  ) {
    for (const call of ws.send.mock.calls) {
      const msg = ClientMessageDto.decode(new Uint8Array(call[0]));
      if (pred(msg)) return msg;
    }
    return null;
  }

  const signedInSockets = new WeakSet<MockWebSocket>();
  const versionCheckedSockets = new WeakSet<MockWebSocket>();

  /**
   * Fully drives a socket's handshake by responding to whatever it sent:
   * a sign-in request (authenticated sockets) and/or the version check that
   * every connection now performs. Idempotent and timing-robust: it flushes
   * fake-timer microtasks a bounded number of times, answering each handshake
   * step as it appears.
   */
  async function driveHandshake(ws: MockWebSocket, nickname = 'P') {
    for (let i = 0; i < 12; i++) {
      const signIn = findSend(ws, (m) => Boolean(m.clientRequest?.signIn));
      if (signIn && !signedInSockets.has(ws)) {
        signedInSockets.add(ws);
        sendServerMsg(ws, {
          id: -1,
          respondTo: signIn.id,
          serverResp: { userInfo: { id: 7, userData: { nickname } } },
        });
      }
      if (!versionCheckedSockets.has(ws)) {
        versionCheckedSockets.add(ws);
        sendServerVersionCheck(ws);
      }
      await vi.advanceTimersByTimeAsync(0);
    }
  }

  /**
   * Drives the handshake, then responds to the getInfo the salt fetch sends.
   */
  async function flushGetInfo(ws: MockWebSocket) {
    await driveHandshake(ws);
    respondToGetInfo(ws);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);
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

  async function setupConnectedClient(
    client: RabiRiichiClient,
  ): Promise<MockWebSocket> {
    const connectPromise = client.connect('ws://localhost:1234', 'my-token');
    await vi.advanceTimersByTimeAsync(15);
    const mockWS = MockWebSocket.instances[MockWebSocket.instances.length - 1];
    if (!mockWS) {
      throw new Error('No MockWebSocket instance found');
    }

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
    mockWS.send.mockClear();
    return mockWS;
  }

  it('should connect and perform handshake', async () => {
    vi.useFakeTimers();
    const client = new RabiRiichiClient();
    const connectPromise = client.connect('ws://localhost:1234', 'my-token');

    // Advance to trigger socket open
    await vi.advanceTimersByTimeAsync(15);

    const mockWS = MockWebSocket.instances[0]!;
    expect(mockWS).toBeDefined();

    // Sign in message should be sent
    expect(mockWS.send).toHaveBeenCalledTimes(1);
    const signInBytes = mockWS.send.mock.calls[0]![0];
    const signInMsg = ClientMessageDto.decode(new Uint8Array(signInBytes));
    expect(signInMsg.clientRequest?.signIn?.accessToken).toBe('my-token');

    // Respond to sign in
    sendServerMsg(mockWS, {
      id: -1,
      respondTo: signInMsg.id,
      serverResp: {
        userInfo: { id: 123, userData: { nickname: 'TestUser' }, status: 1 },
      },
    });

    await vi.advanceTimersByTimeAsync(0);

    // Send version check from server
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

    expect(client.self).toEqual({
      id: 123,
      nickname: 'TestUser',
      status: 1,
      gameState: null,
      aiType: AiType.AI_TYPE_NONE,
    });

    expect(setItemMock).toHaveBeenCalledWith(
      STORAGE_KEY_SERVER_SETTINGS,
      JSON.stringify({ lastUrl: 'ws://localhost:1234' }),
    );
    expect(setItemMock).toHaveBeenCalledWith(
      'rabiriichi_server_credentials',
      JSON.stringify({
        'ws://localhost:1234': {
          token: 'my-token',
          username: '',
          nickname: 'TestUser',
        },
      }),
    );

    vi.useRealTimers();
  });

  it('rejects and resets to disconnected when the socket never opens', async () => {
    vi.useFakeTimers();

    // Simulate an unreachable server: the socket stays in CONNECTING forever
    // (no open, error, or close event). This is the case the browser would
    // otherwise leave pending for minutes, hanging the UI on "connecting".
    class NeverOpenWebSocket extends MockWebSocket {
      public constructor(url: string) {
        super(url);
        // Cancel the base class's scheduled auto-open so it stays CONNECTING.
        this.readyState = MockWebSocket.CONNECTING;
      }
      public override triggerOpen(): void {
        // no-op: never opens
      }
    }
    vi.stubGlobal('WebSocket', NeverOpenWebSocket);

    const client = new RabiRiichiClient();
    const connectPromise = client.connect('ws://unreachable:1234', 'my-token');
    // Prevent an unhandled rejection while we advance the fake clock.
    const settled = connectPromise.then(
      () => 'resolved',
      () => 'rejected',
    );

    expect(client.connectionStatus).toBe('connecting');

    // Advance past the connect timeout; the doomed connect must fail fast.
    // Fake timers make this virtual/instant.
    await vi.advanceTimersByTimeAsync(WS_CONNECT_TIMEOUT + 10);

    expect(await settled).toBe('rejected');
    expect(client.connectionStatus).toBe('disconnected');
    // The timed-out socket should have been closed so it can't resurrect state.
    const mockWS = MockWebSocket.instances[MockWebSocket.instances.length - 1]!;
    expect(mockWS.close).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('should register user and connect', async () => {
    vi.useFakeTimers();
    const client = new RabiRiichiClient();
    client.wsurl = 'ws://localhost:1234';

    const registerPromise = client.registerUser('NewPlayer');

    // We need to wait for the first connect (unauthenticated) to open
    await vi.advanceTimersByTimeAsync(15);

    const mockWS1 = MockWebSocket.instances[0]!;
    expect(mockWS1).toBeDefined();

    // Even the public (no-token) socket must pass the version handshake first.
    sendServerVersionCheck(mockWS1);
    // Let the handshake resolve so getWSClient returns and registerUser proceeds
    // to fetchServerSalt, which sends getInfo. Flush the multi-await chain, then
    // respond to whichever getInfo appears.
    await flushGetInfo(mockWS1);

    const registerCall = mockWS1.send.mock.calls.find((call) => {
      const msg = ClientMessageDto.decode(new Uint8Array(call[0]));
      return Boolean(msg.clientRequest?.createUser);
    });
    const registerBytes = registerCall![0];
    const registerMsg = ClientMessageDto.decode(new Uint8Array(registerBytes));
    expect(registerMsg.clientRequest?.createUser?.userData?.nickname).toBe(
      'NewPlayer',
    );

    // Respond to createUser (id<=0 so it invokes immediately regardless of the
    // version-check message's positive id having advanced the ordered stream).
    sendServerMsg(mockWS1, {
      id: 0,
      respondTo: registerMsg.id,
      serverResp: {
        userInfo: {
          id: 456,
          userData: { nickname: 'NewPlayer' },
          accessToken: 'new-token',
        },
      },
    });

    // After createUser succeeds, it calls connectWS again with the new token.
    // This will close the first socket and create a new one.
    await vi.advanceTimersByTimeAsync(15); // Wait for second socket to open

    expect(MockWebSocket.instances.length).toBe(2);
    const mockWS2 = MockWebSocket.instances[1]!;
    expect(mockWS1.close).toHaveBeenCalled();

    // Second socket should perform handshake (sign in with new-token)
    expect(mockWS2.send).toHaveBeenCalledTimes(1);
    const signInBytes = mockWS2.send.mock.calls[0]![0];
    const signInMsg = ClientMessageDto.decode(new Uint8Array(signInBytes));
    expect(signInMsg.clientRequest?.signIn?.accessToken).toBe('new-token');

    // Complete second handshake
    sendServerMsg(mockWS2, {
      id: -1,
      respondTo: signInMsg.id,
      serverResp: {
        userInfo: { id: 456, userData: { nickname: 'NewPlayer' }, status: 1 },
      },
    });

    await vi.advanceTimersByTimeAsync(0);

    sendServerMsg(mockWS2, {
      id: 10,
      serverMsg: {
        versionCheckMsg: {
          serverVersion: MIN_SERVER_VERSION,
          minClientVersion: CLIENT_VERSION,
        },
      },
    });

    await vi.advanceTimersByTimeAsync(0);
    respondToGetInfo(mockWS2);
    await vi.advanceTimersByTimeAsync(0);
    await registerPromise;

    expect(client.accessToken).toBe('new-token');
    expect(client.self?.id).toBe(456);
    expect(client.self?.nickname).toBe('NewPlayer');

    vi.useRealTimers();
  });

  it('should refresh user info', async () => {
    vi.useFakeTimers();
    const client = new RabiRiichiClient();
    client.wsurl = 'ws://localhost:1234';
    client.accessToken = 'my-token';

    // Connect first
    const connectPromise = client.connect('ws://localhost:1234', 'my-token');
    await vi.advanceTimersByTimeAsync(15);
    const mockWS = MockWebSocket.instances[0]!;

    // Complete handshake
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

    mockWS.send.mockClear();

    // Call refreshMyInfo
    const refreshPromise = client.refreshMyInfo();
    await vi.advanceTimersByTimeAsync(0);

    // Should send getMyInfo request
    expect(mockWS.send).toHaveBeenCalledTimes(1);
    const reqBytes = mockWS.send.mock.calls[0]![0];
    const reqMsg = ClientMessageDto.decode(new Uint8Array(reqBytes));
    expect(reqMsg.clientRequest?.getMyInfo).toBeDefined();

    // Respond to getMyInfo
    sendServerMsg(mockWS, {
      id: 11,
      respondTo: reqMsg.id,
      serverResp: {
        userInfo: {
          id: 123,
          userData: { nickname: 'TestUserUpdated' },
          status: 2,
        },
      },
    });

    await refreshPromise;
    expect(client.self?.nickname).toBe('TestUserUpdated');
    expect(client.self?.status).toBe(2);

    vi.useRealTimers();
  });

  it('should auto-connect using initRabiRiichi if credentials exist', async () => {
    vi.useFakeTimers();
    mockLocalStorage[STORAGE_KEY_SERVER_SETTINGS] = JSON.stringify({
      lastUrl: 'ws://stored-url:5150',
    });
    mockLocalStorage.rabiriichi_token = 'stored-token';

    // Mock connect of global rabiriichi instance
    const connectSpy = vi
      .spyOn(rabiriichi, 'connect')
      .mockImplementation(() => Promise.resolve());

    await initRabiRiichi();

    expect(connectSpy).toHaveBeenCalledWith(
      'ws://stored-url:5150',
      'stored-token',
    );
    connectSpy.mockRestore();
    vi.useRealTimers();
  });

  it('should expose a failed auto-reconnect to the login screen', async () => {
    mockLocalStorage[STORAGE_KEY_SERVER_SETTINGS] = JSON.stringify({
      lastUrl: 'ws://stored-url:5150',
    });
    mockLocalStorage.rabiriichi_token = 'expired-token';

    const onChange = vi.fn();
    rabiriichi.onChange.subscribe(onChange);
    const connectSpy = vi
      .spyOn(rabiriichi, 'connect')
      .mockRejectedValue(new Error('Sign in failed'));

    await initRabiRiichi();

    expect(rabiriichi.autoConnectError).toBe('connect.error.autoConnectFailed');
    expect(rabiriichi.autoConnectFailedUrl).toBe('ws://stored-url:5150');
    expect(onChange).toHaveBeenCalled();

    rabiriichi.onChange.unsubscribe(onChange);
    connectSpy.mockRestore();
  });

  it('should update room state and game state on socket messages', async () => {
    vi.useFakeTimers();
    mockLocalStorage[STORAGE_KEY_SERVER_SETTINGS] = JSON.stringify({
      lastUrl: 'ws://localhost:5150',
    });
    mockLocalStorage.rabiriichi_token = 'my-token';

    const client = new RabiRiichiClient();
    const connectPromise = client.connect('ws://localhost:5150', 'my-token');

    // Advance to open socket
    await vi.advanceTimersByTimeAsync(15);

    const serverMock = MockWebSocket.instances[0]!;
    expect(serverMock).toBeDefined();

    // Verify client sent SignIn
    expect(serverMock.send).toHaveBeenCalledTimes(1);
    const signInBytes = serverMock.send.mock.calls[0]![0];
    const signInMsg = ClientMessageDto.decode(new Uint8Array(signInBytes));
    expect(signInMsg.clientRequest?.signIn?.accessToken).toBe('my-token');

    // 1. Send SignIn response
    sendServerMsg(serverMock, {
      id: -1,
      respondTo: signInMsg.id,
      serverResp: {
        userInfo: {
          id: 123,
          userData: { nickname: 'TestUser' },
          status: UserStatus.USER_STATUS_IN_ROOM,
        },
      },
    });

    await vi.advanceTimersByTimeAsync(0);

    // 2. Send version check from server
    sendServerMsg(serverMock, {
      id: 10,
      serverMsg: {
        versionCheckMsg: {
          serverVersion: MIN_SERVER_VERSION,
          minClientVersion: CLIENT_VERSION,
        },
      },
    });

    await vi.advanceTimersByTimeAsync(0);
    respondToGetInfo(serverMock);
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    expect(client.self?.id).toBe(123);

    // 3. Server sends Room State Msg (Lobby)
    sendServerMsg(serverMock, {
      id: 11,
      serverMsg: {
        roomStateMsg: {
          id: 4321,
          config: { playerCount: 2 },
          players: [
            {
              id: 123,
              nickname: 'TestUser',
              status: UserStatus.USER_STATUS_READY,
              seat: 0,
            },
            {
              id: 999,
              nickname: 'Opponent',
              status: UserStatus.USER_STATUS_READY,
              seat: 1,
            },
          ],
        },
      },
    });

    // Wait for message pump
    await vi.advanceTimersByTimeAsync(0);

    expect(client.room).not.toBeNull();
    expect(client.room?.id).toBe(4321);
    expect(client.room?.players).toHaveLength(2);
    expect(client.room?.players[0]?.nickname).toBe('TestUser');
    expect(client.room?.players[0]?.status).toBe(UserStatus.USER_STATUS_READY);

    // 4. Server sends Begin Game Event
    sendServerMsg(serverMock, {
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

    expect(client.room?.info).not.toBeNull();
    expect(client.room?.info?.round).toBe(0);
    expect(client.room?.info?.dealer).toBe(0);
    expect(client.room?.players[0]?.status).toBe(
      UserStatus.USER_STATUS_PLAYING,
    );

    client.close();
    vi.useRealTimers();
  });

  // setupConnectedClient moved to top

  it('should create room', async () => {
    vi.useFakeTimers();
    const client = new RabiRiichiClient();
    const mockWS = await setupConnectedClient(client);

    const createPromise = client.createRoom();

    await vi.advanceTimersByTimeAsync(0);

    // Verify createRoom request sent
    expect(mockWS.send).toHaveBeenCalledTimes(1);
    const reqBytes = mockWS.send.mock.calls[0]![0];
    const reqMsg = ClientMessageDto.decode(new Uint8Array(reqBytes));
    expect(reqMsg.clientRequest?.createRoom).toBeDefined();

    // Respond with room state
    sendServerMsg(mockWS, {
      id: 11,
      respondTo: reqMsg.id,
      serverResp: {
        roomState: {
          state: {
            id: 4321,
            config: { playerCount: 2 },
            players: [
              {
                id: 123,
                nickname: 'TestUser',
                status: UserStatus.USER_STATUS_IN_ROOM,
                seat: 0,
              },
            ],
          },
        },
      },
    });

    await vi.advanceTimersByTimeAsync(0);
    await createPromise;

    expect(client.room).not.toBeNull();
    expect(client.room?.id).toBe(4321);

    client.close();
    vi.useRealTimers();
  });

  it('should create room with custom configuration', async () => {
    vi.useFakeTimers();
    const client = new RabiRiichiClient();
    const mockWS = await setupConnectedClient(client);

    const sanmaTiles = TILE_SET_PRESETS.Sanma().map((t) => t.toByte());
    const customConfig = {
      playerCount: 3,
      totalRound: 2,
      minHan: 2,
      gameplayActionTimeout: 15,
      pointThreshold: {
        initialPoints: 35000,
        finishPoints: 40000,
        validPointsRange: [0, 60000],
      },
      initialTiles: sanmaTiles,
      allowedYakus: ['Riichi', 'Tanyao'],
    };

    const createPromise = client.createRoom(customConfig);

    await vi.advanceTimersByTimeAsync(0);

    expect(mockWS.send).toHaveBeenCalledTimes(1);
    const reqBytes = mockWS.send.mock.calls[0]![0];
    const reqMsg = ClientMessageDto.decode(new Uint8Array(reqBytes));
    expect(reqMsg.clientRequest?.createRoom?.config).toBeDefined();

    const sentConfig = reqMsg.clientRequest?.createRoom?.config;
    expect(sentConfig?.playerCount).toBe(3);
    expect(sentConfig?.totalRound).toBe(2);
    expect(sentConfig?.minHan).toBe(2);
    expect(sentConfig?.gameplayActionTimeout).toBe(15);
    expect(toNormalNumber(sentConfig?.pointThreshold?.initialPoints)).toBe(
      35000,
    );
    expect(toNormalNumber(sentConfig?.pointThreshold?.finishPoints)).toBe(
      40000,
    );
    expect(
      sentConfig?.pointThreshold?.validPointsRange?.map(toNormalNumber),
    ).toEqual([0, 60000]);

    expect(sentConfig?.initialTiles).toEqual(sanmaTiles);
    expect(sentConfig?.allowedYakus).toEqual(['Riichi', 'Tanyao']);

    // Respond with room state
    sendServerMsg(mockWS, {
      id: 11,
      respondTo: reqMsg.id,
      serverResp: {
        roomState: {
          state: {
            id: 4321,
            config: customConfig,
            players: [
              {
                id: 123,
                nickname: 'TestUser',
                status: UserStatus.USER_STATUS_IN_ROOM,
                seat: 0,
              },
            ],
          },
        },
      },
    });

    await vi.advanceTimersByTimeAsync(0);
    await createPromise;

    expect(client.room).not.toBeNull();
    expect(client.room?.id).toBe(4321);

    client.close();
    vi.useRealTimers();
  });

  it('should join room', async () => {
    vi.useFakeTimers();
    const client = new RabiRiichiClient();
    const mockWS = await setupConnectedClient(client);

    const joinPromise = client.joinRoom(4321);

    await vi.advanceTimersByTimeAsync(0);

    expect(mockWS.send).toHaveBeenCalledTimes(1);
    const reqBytes = mockWS.send.mock.calls[0]![0];
    const reqMsg = ClientMessageDto.decode(new Uint8Array(reqBytes));
    expect(reqMsg.clientRequest?.joinRoom?.roomId).toBe(4321);

    sendServerMsg(mockWS, {
      id: 11,
      respondTo: reqMsg.id,
      serverResp: {
        roomState: {
          state: {
            id: 4321,
            config: { playerCount: 2 },
            players: [
              {
                id: 999,
                nickname: 'Opponent',
                status: UserStatus.USER_STATUS_IN_ROOM,
                seat: 0,
              },
              {
                id: 123,
                nickname: 'TestUser',
                status: UserStatus.USER_STATUS_IN_ROOM,
                seat: 1,
              },
            ],
          },
        },
      },
    });

    await vi.advanceTimersByTimeAsync(0);
    await joinPromise;

    expect(client.room).not.toBeNull();
    expect(client.room?.id).toBe(4321);
    expect(client.room?.players).toHaveLength(2);

    client.close();
    vi.useRealTimers();
  });

  it('should update room status (ready)', async () => {
    vi.useFakeTimers();
    const client = new RabiRiichiClient();
    const mockWS = await setupConnectedClient(client);

    await client.updateRoom(UserStatus.USER_STATUS_READY);

    expect(mockWS.send).toHaveBeenCalledTimes(1);
    const msgBytes = mockWS.send.mock.calls[0]![0];
    const msg = ClientMessageDto.decode(new Uint8Array(msgBytes));
    expect(msg.clientMsg?.roomUpdateMsg?.status).toBe(
      UserStatus.USER_STATUS_READY,
    );

    client.close();
    vi.useRealTimers();
  });

  it('should respond to inquiry', async () => {
    vi.useFakeTimers();
    const client = new RabiRiichiClient();
    const mockWS = await setupConnectedClient(client);

    await client.respondInquiry(42, 1, '"0"');

    expect(mockWS.send).toHaveBeenCalledTimes(1);
    const msgBytes = mockWS.send.mock.calls[0]![0];
    const msg = ClientMessageDto.decode(new Uint8Array(msgBytes));
    expect(msg.respondTo).toBe(42);
    expect(msg.clientMsg?.inquiryMsg?.index).toBe(1);
    expect(msg.clientMsg?.inquiryMsg?.response).toBe('"0"');

    client.close();
    vi.useRealTimers();
  });

  it('should submit inquiry response and reset interaction states', async () => {
    vi.useFakeTimers();
    const client = new RabiRiichiClient();
    const mockWS = await setupConnectedClient(client);

    const mockInquiryMsg: ISinglePlayerInquiryMsg = {
      actions: [
        {
          skipAction: {},
        },
      ],
    };

    client.currentInquiry = {
      messageId: 42,
      mapped: mapInquiry(mockInquiryMsg),
      original: mockInquiryMsg,
    };

    // Pre-set some interaction flags
    client.isRiichiSelectMode = true;
    client.pendingActionOption = {
      type: 'skip',
      label: 'Skip',
      actionIndex: 0,
    };

    const skipOption = client.currentInquiry.mapped.buttons[0]!;
    await client.submitInquiryResponse(skipOption);

    // Assert wire message sent
    expect(mockWS.send).toHaveBeenCalledTimes(1);
    const msgBytes = mockWS.send.mock.calls[0]![0];
    const msg = ClientMessageDto.decode(new Uint8Array(msgBytes));
    expect(msg.respondTo).toBe(42);
    expect(msg.clientMsg?.inquiryMsg?.index).toBe(0);
    expect(msg.clientMsg?.inquiryMsg?.response).toBe('{}');

    // Assert states reset
    expect(client.currentInquiry).toBeNull();
    expect(client.isRiichiSelectMode).toBe(false);
    expect(client.pendingActionOption).toBeNull();

    client.close();
    vi.useRealTimers();
  });

  it('should defer to the server default (index -1) on inquiry timeout', async () => {
    vi.useFakeTimers();
    const client = new RabiRiichiClient();
    const mockWS = await setupConnectedClient(client);

    // A riichi self-draw offers both tsumo and a forced tsumogiri. The client
    // must NOT pick a default itself; it should defer to the server default.
    const mockInquiryMsg: ISinglePlayerInquiryMsg = {
      actions: [
        { playTileAction: { tiles: [{ traceId: 7, tile: 17 }] } },
        { agariAction: {} },
      ],
    };
    client.currentInquiry = {
      messageId: 42,
      mapped: mapInquiry(mockInquiryMsg),
      original: mockInquiryMsg,
    };

    // Start the interactive countdown, then let it expire.
    (
      client as unknown as {
        startTimer: (
          seat: number,
          seconds: number,
          interactive: boolean,
        ) => void;
      }
    ).startTimer(0, 1, true);
    await vi.advanceTimersByTimeAsync(1100);

    expect(mockWS.send).toHaveBeenCalledTimes(1);
    const msgBytes = mockWS.send.mock.calls[0]![0];
    const msg = ClientMessageDto.decode(new Uint8Array(msgBytes));
    expect(msg.respondTo).toBe(42);
    // index = -1 is the server's "use default" sentinel.
    expect(msg.clientMsg?.inquiryMsg?.index).toBe(-1);
    expect(msg.clientMsg?.inquiryMsg?.response).toBe('');
    expect(client.currentInquiry).toBeNull();

    client.close();
    vi.useRealTimers();
  });

  function makeRoomWithAgari(hasAgari: boolean): RoomModel {
    return {
      id: 4321,
      config: { playerCount: 2 },
      info: null,
      players: [
        {
          id: 123,
          nickname: 'TestUser',
          status: UserStatus.USER_STATUS_PLAYING,
          seat: 0,
          gameState: {
            jun: 0,
            points: 25000,
            riichiTileId: 0,
            isRiichiConfirmed: false,
            furiten: {},
            hand: {
              freeTiles: [],
              called: [],
              discarded: [],
              pendingTile: null,
              nukiDora: [],
            },
            agari: hasAgari
              ? {
                  gainPoints: 1000,
                  losePoints: 0,
                  scores: null,
                  incoming: null,
                }
              : null,
          },
          aiType: AiType.AI_TYPE_NONE,
        },
      ],
      tileRegistry: createEmptyTileRegistry(),
    };
  }

  function sendNextRoundInquiry(ws: MockWebSocket, id: number) {
    sendServerMsg(ws, {
      id,
      serverMsg: {
        inquiry: { inquiry: { actions: [{ nextRoundAction: {} }] } },
      },
    });
  }

  it('auto-acks the next-round inquiry on reconnect (no in-memory result)', async () => {
    vi.useFakeTimers();
    const client = new RabiRiichiClient();
    const mockWS = await setupConnectedClient(client);

    // Reconnect: snapshot hydrated, no finished-round result in memory.
    client.replay.setRoom(makeRoomWithAgari(false));

    sendNextRoundInquiry(mockWS, 11);
    await vi.advanceTimersByTimeAsync(0);

    // The client should have auto-submitted the next-round acknowledgement.
    expect(mockWS.send).toHaveBeenCalledTimes(1);
    const msgBytes = mockWS.send.mock.calls[0]![0];
    const msg = ClientMessageDto.decode(new Uint8Array(msgBytes));
    expect(msg.respondTo).toBe(11);
    expect(msg.clientMsg?.inquiryMsg?.response).toBe('{}');
    expect(client.currentInquiry).toBeNull();

    client.close();
    vi.useRealTimers();
  });

  it('does NOT auto-ack the next-round inquiry during live play (has result)', async () => {
    vi.useFakeTimers();
    const client = new RabiRiichiClient();
    const mockWS = await setupConnectedClient(client);

    // Live play: the win was observed, so an agari result is in memory.
    client.replay.setRoom(makeRoomWithAgari(true));
    client.replay.setHasInMemoryResult(true);

    sendNextRoundInquiry(mockWS, 11);
    await vi.advanceTimersByTimeAsync(0);

    // No auto-submit; the inquiry stays for the result panel to advance.
    expect(mockWS.send).not.toHaveBeenCalled();
    expect(client.currentInquiry).not.toBeNull();

    client.close();
    vi.useRealTimers();
  });

  it('does NOT auto-ack the next-round inquiry after mid-game ryuukyoku', async () => {
    vi.useFakeTimers();
    const client = new RabiRiichiClient();
    const mockWS = await setupConnectedClient(client);

    // Initial state: running game, no agari
    client.replay.setRoom(makeRoomWithAgari(false));

    // Send mid-game ryuukyoku event
    sendServerMsg(mockWS, {
      event: {
        ryuukyokuEvent: {
          midGameRyuukyoku: {
            name: 'suufon_renda',
          },
          scoreChange: [],
        },
      },
    });
    await vi.advanceTimersByTimeAsync(3000);

    // Send ConcludeGameEvent
    sendServerMsg(mockWS, {
      event: {
        concludeGameEvent: {
          doras: [],
          uradoras: [],
        },
      },
    });
    await vi.advanceTimersByTimeAsync(0);

    // Send NextGameEvent
    sendServerMsg(mockWS, {
      event: {
        nextGameEvent: {
          nextRound: 1,
          nextDealer: 0,
          nextHonba: 1,
          riichiStick: 0,
        },
      },
    });
    await vi.advanceTimersByTimeAsync(0);

    mockWS.send.mockClear();

    // Send NextRoundAction inquiry
    sendNextRoundInquiry(mockWS, 11);
    await vi.advanceTimersByTimeAsync(0);

    // Should NOT auto-ack
    expect(mockWS.send).not.toHaveBeenCalled();
    expect(client.currentInquiry).not.toBeNull();

    client.close();
    vi.useRealTimers();
  });

  it('should clear stored credentials and close connection on logout', async () => {
    vi.useFakeTimers();
    mockLocalStorage[STORAGE_KEY_SERVER_SETTINGS] = JSON.stringify({
      lastUrl: 'ws://localhost:1234',
    });
    mockLocalStorage.rabiriichi_server_credentials = JSON.stringify({
      'ws://localhost:1234': {
        token: 'my-token',
        username: 'alice',
        nickname: 'Alice',
      },
    });

    const client = new RabiRiichiClient();
    await setupConnectedClient(client);

    expect(client.accessToken).toBe('my-token');
    expect(client.wsurl).toBe('ws://localhost:1234');

    client.logout();

    expect(client.accessToken).toBeNull();
    expect(client.wsurl).toBeNull();
    expect(
      (
        JSON.parse(
          mockLocalStorage[STORAGE_KEY_SERVER_SETTINGS] ?? '{}',
        ) as ServerSettings
      ).lastUrl,
    ).toBeUndefined();
    expect(mockLocalStorage.rabiriichi_server_credentials).toBeUndefined();
    expect(client.connectionStatus).toBe('disconnected');

    vi.useRealTimers();
  });

  describe('Auto-play options', () => {
    it('should auto-respond to agari option when autoAgari is enabled', async () => {
      vi.useFakeTimers();
      const client = new RabiRiichiClient();
      const mockWS = await setupConnectedClient(client);
      client.autoAgari = true;

      // Send inquiry with skip (index 0) and agari (index 1)
      sendServerMsg(mockWS, {
        id: 11,
        serverMsg: {
          inquiry: {
            inquiry: {
              actions: [
                { skipAction: {} },
                { agariAction: { incoming: { tile: 17, traceId: 1 } } },
              ],
            },
          },
        },
      });

      await vi.advanceTimersByTimeAsync(0);

      // Client should auto-respond to agari (index 1)
      expect(mockWS.send).toHaveBeenCalledTimes(1);
      const msgBytes = mockWS.send.mock.calls[0]![0];
      const msg = ClientMessageDto.decode(new Uint8Array(msgBytes));
      expect(msg.respondTo).toBe(11);
      expect(msg.clientMsg?.inquiryMsg?.index).toBe(1);
      expect(msg.clientMsg?.inquiryMsg?.response).toBe('{}');

      client.close();
      vi.useRealTimers();
    });

    it('should auto-respond to skip when noCalls is enabled and only calls/skip are present', async () => {
      vi.useFakeTimers();
      const client = new RabiRiichiClient();
      const mockWS = await setupConnectedClient(client);
      client.noCalls = true;

      // Setup room state without playTile (not our turn)
      client.replay.setRoom(makeRoomWithAgari(false));

      // Send inquiry with skip (index 0) and pon (index 1)
      sendServerMsg(mockWS, {
        id: 11,
        serverMsg: {
          inquiry: {
            inquiry: {
              actions: [{ skipAction: {} }, { ponAction: { tileGroups: [] } }],
            },
          },
        },
      });

      await vi.advanceTimersByTimeAsync(0);

      // Client should auto-respond with skip (index 0)
      expect(mockWS.send).toHaveBeenCalledTimes(1);
      const msgBytes = mockWS.send.mock.calls[0]![0];
      const msg = ClientMessageDto.decode(new Uint8Array(msgBytes));
      expect(msg.respondTo).toBe(11);
      expect(msg.clientMsg?.inquiryMsg?.index).toBe(0);
      expect(msg.clientMsg?.inquiryMsg?.response).toBe('{}');

      client.close();
      vi.useRealTimers();
    });

    it('should auto-discard drawn tile when autoDiscard is enabled and only play-tile is available', async () => {
      vi.useFakeTimers();
      const client = new RabiRiichiClient();
      const mockWS = await setupConnectedClient(client);
      client.autoDiscard = true;

      // Setup room where local player has a pending drawn tile
      const room = makeRoomWithAgari(false);
      if (room.players[0]?.gameState?.hand) {
        room.players[0].gameState.hand.pendingTile = {
          tile: 17,
          traceId: 999,
          playerId: 123,
          source: 1, // TILE_SOURCE_WALL
        };
      }
      client.replay.setRoom(room);

      // Send inquiry with only play-tile action (index 0)
      sendServerMsg(mockWS, {
        id: 11,
        serverMsg: {
          inquiry: {
            inquiry: {
              actions: [
                {
                  playTileAction: {
                    tiles: [
                      { tile: 1, traceId: 101 },
                      { tile: 2, traceId: 102 },
                      { tile: 17, traceId: 999 },
                    ],
                  },
                },
              ],
            },
          },
        },
      });

      await vi.advanceTimersByTimeAsync(0);

      // Client should auto-discard the tile (index 0, response index 2)
      expect(mockWS.send).toHaveBeenCalledTimes(1);
      const msgBytes = mockWS.send.mock.calls[0]![0];
      const msg = ClientMessageDto.decode(new Uint8Array(msgBytes));
      expect(msg.respondTo).toBe(11);
      expect(msg.clientMsg?.inquiryMsg?.index).toBe(0);
      expect(msg.clientMsg?.inquiryMsg?.response).toBe('2'); // index 2 in playTileAction.tiles (traceId 999)

      client.close();
      vi.useRealTimers();
    });

    it('should auto-respond to nukidora when autoNuki is enabled', async () => {
      vi.useFakeTimers();
      const client = new RabiRiichiClient();
      const mockWS = await setupConnectedClient(client);
      client.autoNuki = true;

      // Send inquiry with skip (index 0) and nukidora (index 1)
      sendServerMsg(mockWS, {
        id: 11,
        serverMsg: {
          inquiry: {
            inquiry: {
              actions: [{ skipAction: {} }, { nukiDoraAction: { tiles: [] } }],
            },
          },
        },
      });

      await vi.advanceTimersByTimeAsync(0);

      // Client should auto-respond with nukidora (index 1)
      expect(mockWS.send).toHaveBeenCalledTimes(1);
      const msgBytes = mockWS.send.mock.calls[0]![0];
      const msg = ClientMessageDto.decode(new Uint8Array(msgBytes));
      expect(msg.respondTo).toBe(11);
      expect(msg.clientMsg?.inquiryMsg?.index).toBe(1);
      expect(msg.clientMsg?.inquiryMsg?.response).toBe('0'); // choiceIndex is 0 for nukidora

      client.close();
      vi.useRealTimers();
    });

    it('should reset auto-play properties to false when beginGameEvent is received', async () => {
      vi.useFakeTimers();
      const client = new RabiRiichiClient();
      const mockWS = await setupConnectedClient(client);

      // Initialize room
      const room = makeRoomWithAgari(false);
      client.replay.setRoom(room);

      // Set toggles to true
      client.autoAgari = true;
      client.noCalls = true;
      client.autoDiscard = true;
      client.autoNuki = true;

      // Send beginGameEvent
      sendServerMsg(mockWS, {
        id: 0,
        event: {
          beginGameEvent: {
            round: 0,
            dealer: 0,
            honba: 0,
            riichiStick: 0,
            remainingTiles: 70,
            gameId: 'test-game',
          },
        },
      });

      // Verification
      expect(client.autoAgari).toBe(false);
      expect(client.noCalls).toBe(false);
      expect(client.autoDiscard).toBe(false);
      expect(client.autoNuki).toBe(false);

      client.close();
      vi.useRealTimers();
    });
  });

  describe('Client Settings Persistence', () => {
    it('should load animation speed from localStorage on creation', () => {
      mockLocalStorage[STORAGE_KEY_CLIENT_SETTINGS] = JSON.stringify({
        animationSpeed: 1.5,
      });

      const client = new RabiRiichiClient();
      expect(client.animationSpeed).toBe(1.5);
    });

    it('should save animation speed to localStorage when set', () => {
      const client = new RabiRiichiClient();
      expect(client.animationSpeed).toBe(1.0); // Default

      client.setAnimationSpeed(2.5);
      expect(client.animationSpeed).toBe(2.5);

      const saved = JSON.parse(
        mockLocalStorage[STORAGE_KEY_CLIENT_SETTINGS] ?? '{}',
      ) as ClientSettings;
      expect(saved.animationSpeed).toBe(2.5);
    });
  });

  // Proves the client is host-agnostic: given an injected platform (custom
  // socket factory, in-memory store, no-op sound, custom crypto) it never
  // touches the browser globals stubbed in beforeEach. This is the seam a CLI
  // host plugs into.
  describe('Platform injection (CLI-ready)', () => {
    function memoryStore(): {
      store: KeyValueStore;
      backing: Record<string, string>;
    } {
      const backing: Record<string, string> = {};
      return {
        backing,
        store: {
          getItem: (k) => backing[k] ?? null,
          setItem: (k, v) => {
            backing[k] = v;
          },
          removeItem: (k) => {
            delete backing[k];
          },
        },
      };
    }

    it('routes persistence through an injected store, not localStorage', () => {
      const { store, backing } = memoryStore();
      const client = new RabiRiichiClient({ store });

      client.setAnimationSpeed(3);

      // Persisted to the injected store...
      expect(
        JSON.parse(
          backing[STORAGE_KEY_CLIENT_SETTINGS] ?? '{}',
        ) as ClientSettings,
      ).toEqual({ animationSpeed: 3 });
      // ...and NOT to the (stubbed) browser localStorage.
      expect(mockLocalStorage[STORAGE_KEY_CLIENT_SETTINGS]).toBeUndefined();
      expect(setItemMock).not.toHaveBeenCalled();
    });

    it('connects via an injected socket factory and injected crypto', async () => {
      vi.useFakeTimers();
      const { store, backing } = memoryStore();
      const created: MockWebSocket[] = [];
      const sha256 = vi.fn().mockResolvedValue('deadbeef');

      // MockWebSocket mimics the WebSocket surface; its send() mock signature
      // is narrower than the interface's, so cast the factory.
      const socketFactory = ((url: string | URL) => {
        const ws = new MockWebSocket(String(url));
        created.push(ws);
        return ws;
      }) as unknown as WebSocketFactory;

      const client = new RabiRiichiClient({
        store,
        crypto: { sha256 },
        socketFactory,
      });

      client.wsurl = 'ws://cli-host:5150';
      const registerPromise = client.registerUser('CliPlayer');

      await vi.advanceTimersByTimeAsync(15);
      expect(created.length).toBe(1);
      const ws = created[0]!;
      // Public socket must pass the version handshake first.
      sendServerVersionCheck(ws);
      await flushGetInfo(ws);

      // The password hash used the injected crypto provider.
      expect(sha256).toHaveBeenCalled();

      const registerCall = ws.send.mock.calls.find((call) => {
        const msg = ClientMessageDto.decode(new Uint8Array(call[0]));
        return Boolean(msg.clientRequest?.createUser);
      });
      const registerBytes = registerCall![0];
      const registerMsg = ClientMessageDto.decode(
        new Uint8Array(registerBytes),
      );
      expect(registerMsg.clientRequest?.createUser?.passwordHash).toBe(
        'deadbeef',
      );

      sendServerMsg(ws, {
        id: 0,
        respondTo: registerMsg.id,
        serverResp: {
          userInfo: {
            id: 7,
            userData: { nickname: 'CliPlayer' },
            accessToken: 'cli-token',
          },
        },
      });
      // createUser succeeds → reconnect with the new token (second socket).
      await vi.advanceTimersByTimeAsync(15);
      if (created[1]) {
        await driveHandshake(created[1], 'CliPlayer');
      }

      const storedCreds = JSON.parse(
        backing.rabiriichi_server_credentials ?? '{}',
      ) as Record<string, ServerCredentials>;
      expect(storedCreds['ws://cli-host:5150']).toEqual({
        token: 'cli-token',
        username: 'CliPlayer',
        nickname: 'CliPlayer',
      });
      expect(mockLocalStorage.rabiriichi_server_credentials).toBeUndefined();

      client.close();
      await registerPromise.catch(() => undefined);
      vi.useRealTimers();
    });

    it('changePassword sends the hashes and stores the rotated token', async () => {
      vi.useFakeTimers();
      const { store, backing } = memoryStore();
      backing.rabiriichi_username = 'alice';
      const sha256 = vi
        .fn()
        .mockResolvedValueOnce('oldhash')
        .mockResolvedValueOnce('newhash');
      const created: MockWebSocket[] = [];
      const socketFactory = ((url: string | URL) => {
        const ws = new MockWebSocket(String(url));
        created.push(ws);
        return ws;
      }) as unknown as WebSocketFactory;

      const client = new RabiRiichiClient({
        store,
        crypto: { sha256 },
        socketFactory,
      });
      client.restoreStoredUsername();
      client.wsurl = 'ws://host:5150';

      const changePromise = client.changePassword('oldpw', 'newpw');
      await vi.advanceTimersByTimeAsync(15);
      const ws = created[0]!;
      // Public socket must pass the version handshake first.
      sendServerVersionCheck(ws);
      await flushGetInfo(ws);

      const changeCall = ws.send.mock.calls.find((call) => {
        const msg = ClientMessageDto.decode(new Uint8Array(call[0]));
        return msg.clientRequest?.req === 'changePassword';
      });
      const sentBytes = changeCall![0];
      const sentMsg = ClientMessageDto.decode(new Uint8Array(sentBytes));
      const clientRequest = sentMsg.clientRequest;
      expect(clientRequest?.req).toBe('changePassword');
      const req =
        clientRequest?.req === 'changePassword'
          ? clientRequest.changePassword
          : null;
      expect(req?.username).toBe('alice');
      expect(req?.oldPasswordHash).toBe('oldhash');
      expect(req?.newPasswordHash).toBe('newhash');

      sendServerMsg(ws, {
        id: 0,
        respondTo: sentMsg.id,
        serverResp: {
          userInfo: { id: 7, accessToken: 'rotated-token' },
        },
      });
      await vi.advanceTimersByTimeAsync(0);
      await changePromise;

      expect(client.accessToken).toBe('rotated-token');
      const storedCreds = JSON.parse(
        backing.rabiriichi_server_credentials ?? '{}',
      ) as Record<string, ServerCredentials>;
      expect(storedCreds['ws://host:5150']).toEqual({
        token: 'rotated-token',
        username: 'alice',
        nickname: 'alice',
      });

      client.close();
      vi.useRealTimers();
    });

    it('loadStoredCredentials reads from the injected store', () => {
      const { store, backing } = memoryStore();
      backing[STORAGE_KEY_SERVER_SETTINGS] = JSON.stringify({
        lastUrl: 'ws://cli-host:5150',
      });
      backing.rabiriichi_token = 'cli-token';

      const client = new RabiRiichiClient({ store });
      expect(client.loadStoredCredentials()).toEqual({
        url: 'ws://cli-host:5150',
        token: 'cli-token',
      });
    });

    it('returns null from loadStoredCredentials when nothing is stored', () => {
      const { store } = memoryStore();
      const client = new RabiRiichiClient({ store });
      expect(client.loadStoredCredentials()).toBeNull();
    });
  });

  describe('Delayed Chat Display', () => {
    it('defers chat display during round results and flushes on next round or final result', async () => {
      const client = new RabiRiichiClient();
      client.room = {
        id: 1,
        config: null,
        info: null,
        players: [
          {
            id: 1,
            nickname: 'Alice',
            seat: 0,
            aiType: AiType.AI_TYPE_NONE,
            status: UserStatus.USER_STATUS_PLAYING,
            gameState: null,
          },
          {
            id: 2,
            nickname: 'Bob',
            seat: 1,
            aiType: AiType.AI_TYPE_NONE,
            status: UserStatus.USER_STATUS_PLAYING,
            gameState: null,
          },
        ],
        tileRegistry: createEmptyTileRegistry(),
      };

      const internalClient = client as unknown as {
        handleChatMessage: (msg: {
          senderId: number;
          text?: string;
          sticker?: string;
        }) => void;
      };

      // 1. Normal mode: chats are displayed immediately
      internalClient.handleChatMessage({
        senderId: 1,
        text: 'Hello!',
        sticker: 'happy.png',
      });
      expect(client.activeChatTexts[1]).toBe('Hello!');
      expect(client.activeStickers[1]).toBe('happy.png');

      // 2. Enter round result screen: chats should be deferred
      await client.replay.handleGameEvent(
        {
          agariEvent: {
            agariInfos: [],
          },
        },
        true,
      );
      expect(client.isShowingRoundResult).toBe(true);

      // Processing stopGameEvent does not cancel isShowingRoundResult prematurely
      await client.replay.handleGameEvent(
        {
          stopGameEvent: {},
        },
        true,
      );
      expect(client.isShowingRoundResult).toBe(true);
      expect(client.isFinalResultScreen).toBe(true);

      // Trigger chat during result screen
      internalClient.handleChatMessage({
        senderId: 2,
        text: 'Nice game!',
        sticker: 'gg.png',
      });

      // Active chat text/sticker for player 2 should not be set yet
      expect(client.activeChatTexts[2]).toBeUndefined();
      expect(client.activeStickers[2]).toBeUndefined();

      // 3. Flush deferred chats when FinalResultPanel mounts
      client.flushDeferredChats(10000);
      expect(client.isShowingRoundResult).toBe(false);
      expect(client.activeChatTexts[2]).toBe('Nice game!');
      expect(client.activeStickers[2]).toBe('gg.png');

      client.close();
    });
  });
});
