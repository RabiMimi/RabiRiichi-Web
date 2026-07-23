import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RabiSocket } from './rabiSocket';
import { ClientMessageDto, ServerMessageDto } from '../proto';
import { CLIENT_VERSION, MIN_SERVER_VERSION } from './constants';
import type { IServerMessageDto } from '../proto';
import { MockWebSocket } from './mockWebSocket';

describe('RabiSocket', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    MockWebSocket.instances = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function sendServerMsg(mockWS: MockWebSocket, msg: IServerMessageDto): void {
    const bytes = ServerMessageDto.encode(msg).finish();
    mockWS.triggerMessage(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );
  }

  function findClientSend(
    mockWS: MockWebSocket,
    pred: (msg: ReturnType<typeof ClientMessageDto.decode>) => boolean,
  ) {
    for (const call of mockWS.send.mock.calls) {
      const msg = ClientMessageDto.decode(new Uint8Array(call[0]));
      if (pred(msg)) return msg;
    }
    return null;
  }

  /**
   * Simulates the server's version-check push (sent on every connection, public
   * and authenticated), which the client validates and replies to.
   */
  function sendServerVersionCheck(mockWS: MockWebSocket, id = 10): void {
    sendServerMsg(mockWS, {
      id,
      serverMsg: {
        versionCheckMsg: {
          serverVersion: MIN_SERVER_VERSION,
          minClientVersion: CLIENT_VERSION,
        },
      },
    });
  }

  it('should connect and resolve waitOpen', async () => {
    const socket = new RabiSocket('ws://localhost:1234');
    await socket.waitOpen;
    expect(socket.isConnected).toBe(true);
  });

  it('should encode and send messages', async () => {
    const socket = new RabiSocket('ws://localhost:1234');
    await socket.waitOpen;

    const mockWS = MockWebSocket.instances[0]!;
    expect(mockWS).toBeDefined();

    const clientMsg = { id: 1, clientMsg: { heartBeatMsg: {} } };
    socket.send(clientMsg);

    expect(mockWS.send).toHaveBeenCalledTimes(1);
    const sentBytes = mockWS.send.mock.calls[0]![0];
    expect(sentBytes).toBeInstanceOf(Uint8Array);

    const decoded = ClientMessageDto.decode(new Uint8Array(sentBytes));
    expect(decoded.id).toBe(1);
    expect(decoded.clientMsg?.heartBeatMsg).toBeDefined();
  });

  it('should decode received messages and emit onMessage', async () => {
    const socket = new RabiSocket('ws://localhost:1234');
    await socket.waitOpen;

    const mockWS = MockWebSocket.instances[0]!;
    const callback = vi.fn<(msg: IServerMessageDto) => void>();
    socket.onMessage.subscribe(callback);

    const serverMsg: IServerMessageDto = {
      id: 42,
      serverMsg: { heartBeatMsg: { maxId: 10 } },
    };
    const bytes = ServerMessageDto.encode(serverMsg).finish();

    mockWS.triggerMessage(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );

    expect(callback).toHaveBeenCalledTimes(1);
    const received = callback.mock.calls[0]![0];
    expect(received.id).toBe(42);
    expect(received.serverMsg?.heartBeatMsg?.maxId).toBe(10);
  });

  it('should handle socket close', async () => {
    const socket = new RabiSocket('ws://localhost:1234');
    await socket.waitOpen;

    const mockWS = MockWebSocket.instances[0]!;
    mockWS.triggerClose();

    await socket.waitClose;
    expect(socket.isConnected).toBe(false);
  });

  it('should complete handshake and start heartbeat', async () => {
    vi.useFakeTimers();
    const socket = new RabiSocket('ws://localhost:1234', 'my-token');
    const onUserInfo = vi.fn();
    const handshakePromise = socket.handShake(onUserInfo);

    // Advance to trigger socket open
    await vi.advanceTimersByTimeAsync(15);

    const mockWS = MockWebSocket.instances[0]!;
    expect(mockWS).toBeDefined();

    // Authenticated path sends sign-in.
    const signInMsg = findClientSend(mockWS, (m) =>
      Boolean(m.clientRequest?.signIn),
    );
    expect(signInMsg?.clientRequest?.signIn?.accessToken).toBe('my-token');

    sendServerMsg(mockWS, {
      id: -1,
      respondTo: signInMsg!.id,
      serverResp: {
        userInfo: { id: 123, userData: { nickname: 'TestUser' } },
      },
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(onUserInfo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 123, userData: { nickname: 'TestUser' } }),
    );

    // The server pushes its version check; the client validates and replies.
    sendServerVersionCheck(mockWS);
    await handshakePromise;

    const replyMsg = findClientSend(mockWS, (m) =>
      Boolean(m.clientMsg?.versionCheckMsg),
    );
    expect(replyMsg?.respondTo).toBe(10);

    // Heartbeat should start.
    await vi.advanceTimersByTimeAsync(2000);
    const hbMsg = findClientSend(mockWS, (m) =>
      Boolean(m.clientMsg?.heartBeatMsg),
    );
    expect(hbMsg?.clientMsg?.heartBeatMsg).toBeDefined();

    vi.useRealTimers();
  });

  it('public (no-token) handshake validates the version check, no sign-in', async () => {
    vi.useFakeTimers();
    const socket = new RabiSocket('ws://localhost:1234'); // no token
    const handshakePromise = socket.handShake(vi.fn());
    await vi.advanceTimersByTimeAsync(15);

    const mockWS = MockWebSocket.instances[0]!;
    // Public path sends nothing until the server pushes its version check.
    expect(mockWS.send).not.toHaveBeenCalled();

    sendServerVersionCheck(mockWS);
    await handshakePromise;

    // Replies to the version check, but never signs in on the public path.
    expect(
      findClientSend(mockWS, (m) => Boolean(m.clientMsg?.versionCheckMsg)),
    ).not.toBeNull();
    expect(
      findClientSend(mockWS, (m) => Boolean(m.clientRequest?.signIn)),
    ).toBeNull();

    vi.useRealTimers();
  });

  it('rejects an old/incompatible server (server too old) with a clear error', async () => {
    vi.useFakeTimers();
    const socket = new RabiSocket('ws://localhost:1234'); // no token
    const handshakePromise = socket.handShake(vi.fn());
    await vi.advanceTimersByTimeAsync(15);

    const mockWS = MockWebSocket.instances[0]!;
    sendServerMsg(mockWS, {
      id: 10,
      serverMsg: {
        versionCheckMsg: {
          serverVersion: '0.0.1', // too old
          minClientVersion: CLIENT_VERSION,
        },
      },
    });

    await expect(handshakePromise).rejects.toThrow();
    expect(socket.isConnected).toBe(false);

    vi.useRealTimers();
  });

  it('should resend messages requested by heartbeat response', async () => {
    vi.useFakeTimers();
    const socket = new RabiSocket('ws://localhost:1234');
    const handshakePromise = socket.handShake(() => {
      // noop
    });

    await vi.advanceTimersByTimeAsync(15);
    const mockWS = MockWebSocket.instances[0]!;
    // Public (no-token) connections still get the server's version-check push.
    sendServerVersionCheck(mockWS);
    await handshakePromise;
    mockWS.send.mockClear(); // Drop the version-check reply from the log

    // Send a normal message that will be tracked
    socket.send({ clientMsg: { roomUpdateMsg: { status: 2 } } }); // Status 2 = READY maybe? Just some msg
    expect(mockWS.send).toHaveBeenCalledTimes(1);
    const sentMsgBytes = mockWS.send.mock.calls[0]![0];
    const sentMsg = ClientMessageDto.decode(new Uint8Array(sentMsgBytes));
    const sentMsgId = sentMsg.id; // Should be 1

    // Clear send mock history to make assertions easier
    mockWS.send.mockClear();

    // Advance to trigger heartbeat
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockWS.send).toHaveBeenCalledTimes(1); // Heartbeat sent
    const hbBytes = mockWS.send.mock.calls[0]![0];
    const hbMsg = ClientMessageDto.decode(new Uint8Array(hbBytes));
    const hbId = hbMsg.id;

    // Simulate heartbeat response requesting the message we sent (ID 1)
    const hbResp = ServerMessageDto.encode({
      id: -1,
      respondTo: hbId,
      serverMsg: {
        heartBeatMsg: {
          maxId: 0,
          requestingIds: [sentMsgId],
        },
      },
    }).finish();

    mockWS.send.mockClear();
    mockWS.triggerMessage(
      hbResp.buffer.slice(
        hbResp.byteOffset,
        hbResp.byteOffset + hbResp.byteLength,
      ),
    );

    // Wait for microtasks
    await vi.advanceTimersByTimeAsync(0);

    // Should have resent the message
    expect(mockWS.send).toHaveBeenCalledTimes(1);
    const resentBytes = mockWS.send.mock.calls[0]![0];
    const resentMsg = ClientMessageDto.decode(new Uint8Array(resentBytes));
    expect(resentMsg.id).toBe(sentMsgId);
    expect(resentMsg.clientMsg?.roomUpdateMsg?.status).toBe(2);

    vi.useRealTimers();
  });

  it('should update ping when heartbeat response is received', async () => {
    vi.useFakeTimers();
    const socket = new RabiSocket('ws://localhost:1234');
    const handshakePromise = socket.handShake(vi.fn());
    await vi.advanceTimersByTimeAsync(10);
    const mockWS = MockWebSocket.instances[0]!;
    sendServerVersionCheck(mockWS);
    await handshakePromise;

    mockWS.send.mockClear();

    const pingCallback = vi.fn();
    socket.onPingUpdated.subscribe(pingCallback);

    // Advance to trigger heartbeat
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockWS.send).toHaveBeenCalledTimes(1);
    const hbBytes = mockWS.send.mock.calls[0]![0];
    const hbMsg = ClientMessageDto.decode(new Uint8Array(hbBytes));
    const hbId = hbMsg.id;

    // Simulate server response after 150ms
    await vi.advanceTimersByTimeAsync(150);
    const hbResp = ServerMessageDto.encode({
      id: -1,
      respondTo: hbId,
      serverMsg: {
        heartBeatMsg: {
          maxId: 0,
        },
      },
    }).finish();

    mockWS.triggerMessage(
      hbResp.buffer.slice(
        hbResp.byteOffset,
        hbResp.byteOffset + hbResp.byteLength,
      ),
    );

    await vi.advanceTimersByTimeAsync(0);

    expect(socket.ping).toBe(150);
    expect(pingCallback).toHaveBeenCalledWith(150);

    vi.useRealTimers();
  });

  it('should close socket and set ping to -1 on heartbeat timeout', async () => {
    vi.useFakeTimers();
    const socket = new RabiSocket('ws://localhost:1234');
    const handshakePromise = socket.handShake(vi.fn());
    await vi.advanceTimersByTimeAsync(10);
    const mockWS = MockWebSocket.instances[0]!;
    sendServerVersionCheck(mockWS);
    await handshakePromise;

    mockWS.send.mockClear();

    const pingCallback = vi.fn();
    socket.onPingUpdated.subscribe(pingCallback);

    // Advance to trigger heartbeat
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockWS.send).toHaveBeenCalledTimes(1);

    // Wait for response timeout (15000ms)
    await vi.advanceTimersByTimeAsync(15000);

    expect(socket.ping).toBe(-1);
    expect(pingCallback).toHaveBeenCalledWith(-1);
    expect(socket.isConnected).toBe(false);

    vi.useRealTimers();
  });
});
