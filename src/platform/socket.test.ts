import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  browserWebSocketFactory,
  SOCKET_CONNECTING,
  SOCKET_OPEN,
  SOCKET_CLOSING,
  SOCKET_CLOSED,
} from './socket';

describe('socket constants', () => {
  it('match the WHATWG readyState values', () => {
    expect(SOCKET_CONNECTING).toBe(0);
    expect(SOCKET_OPEN).toBe(1);
    expect(SOCKET_CLOSING).toBe(2);
    expect(SOCKET_CLOSED).toBe(3);
  });
});

describe('browserWebSocketFactory', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('constructs via the global WebSocket, forwarding the url', () => {
    const ctor = vi.fn();
    class FakeWS {
      public constructor(url: string) {
        ctor(url);
      }
    }
    vi.stubGlobal('WebSocket', FakeWS);

    const socket = browserWebSocketFactory('ws://host:1/ws/public');
    expect(socket).toBeInstanceOf(FakeWS);
    expect(ctor).toHaveBeenCalledWith('ws://host:1/ws/public');
  });

  it('forwards subprotocols when provided', () => {
    const ctor = vi.fn();
    class FakeWS {
      public constructor(url: string, protocols?: string | string[]) {
        ctor(url, protocols);
      }
    }
    vi.stubGlobal('WebSocket', FakeWS);

    browserWebSocketFactory('ws://host:1', 'proto');
    expect(ctor).toHaveBeenCalledWith('ws://host:1', 'proto');
  });

  it('throws a helpful error when no global WebSocket exists', () => {
    vi.stubGlobal('WebSocket', undefined);
    expect(() => browserWebSocketFactory('ws://host:1')).toThrow(
      /No global WebSocket/,
    );
  });
});
