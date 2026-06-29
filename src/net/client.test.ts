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
import { ClientMessageDto, ServerMessageDto, UserStatus } from '../proto';
import type { IServerMessageDto, ISinglePlayerInquiryMsg } from '../proto';
import type { RoomModel } from '../domain/model';
import { mapInquiry } from '../domain/inquiry';

describe('RabiRiichiClient', () => {
  let mockLocalStorage: Record<string, string>;
  let setItemMock: Mock<(key: string, value: string) => void>;

  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    MockWebSocket.instances = [];

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
        userInfo: { id: 123, nickname: 'TestUser', status: 1 },
      },
    });

    await vi.advanceTimersByTimeAsync(0);

    // Send version check
    sendServerMsg(mockWS, {
      id: 10,
      serverMsg: {
        versionCheckMsg: {
          serverVersion: '0.1.0.0',
          minClientVersion: '0.1.0',
        },
      },
    });

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
        userInfo: { id: 123, nickname: 'TestUser', status: 1 },
      },
    });

    await vi.advanceTimersByTimeAsync(0);

    // Send version check from server
    sendServerMsg(mockWS, {
      id: 10,
      serverMsg: {
        versionCheckMsg: {
          serverVersion: '0.1.0.0',
          minClientVersion: '0.1.0',
        },
      },
    });

    await connectPromise;

    expect(client.self).toEqual({
      id: 123,
      nickname: 'TestUser',
      status: 1,
      gameState: null,
    });

    expect(setItemMock).toHaveBeenCalledWith(
      'rabiriichi_url',
      'ws://localhost:1234',
    );
    expect(setItemMock).toHaveBeenCalledWith('rabiriichi_token', 'my-token');

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

    // Since we don't have token, the handshake resolves immediately after open.
    // So getWSClient should return the client, and then createUser is called.
    // Wait for registerUser to send createUser message.
    await vi.advanceTimersByTimeAsync(0);

    expect(mockWS1.send).toHaveBeenCalledTimes(1);
    const registerBytes = mockWS1.send.mock.calls[0]![0];
    const registerMsg = ClientMessageDto.decode(new Uint8Array(registerBytes));
    expect(registerMsg.clientRequest?.createUser?.nickname).toBe('NewPlayer');

    // Respond to createUser
    sendServerMsg(mockWS1, {
      id: 1,
      respondTo: registerMsg.id,
      serverResp: {
        createUser: {
          id: 456,
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
        userInfo: { id: 456, nickname: 'NewPlayer', status: 1 },
      },
    });

    await vi.advanceTimersByTimeAsync(0);

    sendServerMsg(mockWS2, {
      id: 10,
      serverMsg: {
        versionCheckMsg: {
          serverVersion: '0.1.0.0',
          minClientVersion: '0.1.0',
        },
      },
    });

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
      serverResp: { userInfo: { id: 123, nickname: 'TestUser', status: 1 } },
    });
    await vi.advanceTimersByTimeAsync(0);
    sendServerMsg(mockWS, {
      id: 10,
      serverMsg: {
        versionCheckMsg: {
          serverVersion: '0.1.0.0',
          minClientVersion: '0.1.0',
        },
      },
    });
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
        userInfo: { id: 123, nickname: 'TestUserUpdated', status: 2 },
      },
    });

    await refreshPromise;
    expect(client.self?.nickname).toBe('TestUserUpdated');
    expect(client.self?.status).toBe(2);

    vi.useRealTimers();
  });

  it('should auto-connect using initRabiRiichi if credentials exist', async () => {
    vi.useFakeTimers();
    mockLocalStorage.rabiriichi_url = 'ws://stored-url:5150';
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

  it('should update room state and game state on socket messages', async () => {
    vi.useFakeTimers();
    mockLocalStorage.rabiriichi_url = 'ws://localhost:5150';
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
          nickname: 'TestUser',
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
          serverVersion: '0.1.0.0',
          minClientVersion: '0.1.0',
        },
      },
    });

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
            furiten: {},
            hand: {
              freeTiles: [],
              called: [],
              discarded: [],
              pendingTile: null,
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
        },
      ],
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
    client.dev.setRoom(makeRoomWithAgari(false));

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
    client.dev.setRoom(makeRoomWithAgari(true));

    sendNextRoundInquiry(mockWS, 11);
    await vi.advanceTimersByTimeAsync(0);

    // No auto-submit; the inquiry stays for the result panel to advance.
    expect(mockWS.send).not.toHaveBeenCalled();
    expect(client.currentInquiry).not.toBeNull();

    client.close();
    vi.useRealTimers();
  });

  it('should clear stored credentials and close connection on logout', async () => {
    vi.useFakeTimers();
    mockLocalStorage.rabiriichi_url = 'ws://localhost:5150';
    mockLocalStorage.rabiriichi_token = 'my-token';

    const client = new RabiRiichiClient();
    await setupConnectedClient(client);

    expect(client.accessToken).toBe('my-token');
    expect(client.wsurl).toBe('ws://localhost:1234');

    client.logout();

    expect(client.accessToken).toBeNull();
    expect(client.wsurl).toBeNull();
    expect(mockLocalStorage.rabiriichi_url).toBeUndefined();
    expect(mockLocalStorage.rabiriichi_token).toBeUndefined();
    expect(client.connectionStatus).toBe('disconnected');

    vi.useRealTimers();
  });
});
