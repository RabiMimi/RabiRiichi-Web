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

    // Should have sent sign-in message
    expect(mockWS.send).toHaveBeenCalledTimes(1);
    const signInBytes = mockWS.send.mock.calls[0]![0];
    const signInMsg = ClientMessageDto.decode(new Uint8Array(signInBytes));
    expect(signInMsg.clientRequest?.signIn?.accessToken).toBe('my-token');
    const signInId = signInMsg.id;

    // Simulate server sign-in response
    const signInResp = ServerMessageDto.encode({
      id: -1,
      respondTo: signInId,
      serverResp: {
        userInfo: { id: 123, nickname: 'TestUser' },
      },
    }).finish();
    mockWS.triggerMessage(
      signInResp.buffer.slice(
        signInResp.byteOffset,
        signInResp.byteOffset + signInResp.byteLength,
      ),
    );

    // Wait for promise microtasks
    await vi.advanceTimersByTimeAsync(0);
    expect(onUserInfo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 123, nickname: 'TestUser' }),
    );

    // Simulate server sending version check
    const versionCheck = ServerMessageDto.encode({
      id: 10,
      serverMsg: {
        versionCheckMsg: {
          serverVersion: MIN_SERVER_VERSION,
          minClientVersion: CLIENT_VERSION,
        },
      },
    }).finish();
    mockWS.triggerMessage(
      versionCheck.buffer.slice(
        versionCheck.byteOffset,
        versionCheck.byteOffset + versionCheck.byteLength,
      ),
    );

    // Wait for handshake to resolve
    await handshakePromise;

    // Should have sent version check reply
    expect(mockWS.send).toHaveBeenCalledTimes(2);
    const replyBytes = mockWS.send.mock.calls[1]![0];
    const replyMsg = ClientMessageDto.decode(new Uint8Array(replyBytes));
    expect(replyMsg.respondTo).toBe(10);
    expect(replyMsg.clientMsg?.versionCheckMsg).toBeDefined();

    // Heartbeat should start. Interval is 2000ms.
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockWS.send).toHaveBeenCalledTimes(3);
    const hbBytes = mockWS.send.mock.calls[2]![0];
    const hbMsg = ClientMessageDto.decode(new Uint8Array(hbBytes));
    expect(hbMsg.clientMsg?.heartBeatMsg).toBeDefined();

    vi.useRealTimers();
  });

  it('should resend messages requested by heartbeat response', async () => {
    vi.useFakeTimers();
    const socket = new RabiSocket('ws://localhost:1234');
    const handshakePromise = socket.handShake(() => {
      // noop
    });

    await vi.advanceTimersByTimeAsync(15);
    await handshakePromise; // No token, resolves immediately after open

    const mockWS = MockWebSocket.instances[0]!;

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
    await handshakePromise;

    const mockWS = MockWebSocket.instances[0]!;
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
    await handshakePromise;

    const mockWS = MockWebSocket.instances[0]!;
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
