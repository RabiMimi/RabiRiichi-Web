/**
 * Node WebSocket factory backed by the `ws` package.
 *
 * Adapts `ws` to the {@link RabiWebSocket} structural interface the transport
 * layer expects. The `ws` package implements the WHATWG event API
 * (`addEventListener`/`removeEventListener`, `binaryType`, `readyState`,
 * `send`, `close`) closely enough that only two things need bridging:
 *
 * 1. `binaryType = 'arraybuffer'` must yield `ArrayBuffer` message payloads
 *    (it does), so `RabiSocket.handleMessage` receives an `ArrayBuffer`.
 * 2. `ws` typings expose a slightly different event/type surface than the DOM,
 *    so we present it through the minimal `RabiWebSocket` shape.
 */
import WebSocket from 'ws';
import type { WebSocketFactory, RabiWebSocket } from '../../platform/socket';

/**
 * Creates a {@link WebSocketFactory} that produces `ws`-backed sockets. Inject
 * the result into `RabiRiichiClient`'s platform as `socketFactory`.
 */
export function createNodeWebSocketFactory(): WebSocketFactory {
  return (url, protocols) => {
    const socket =
      protocols === undefined
        ? new WebSocket(url)
        : new WebSocket(url, protocols);
    socket.binaryType = 'arraybuffer';
    // `ws`'s EventTarget-compatible surface satisfies RabiWebSocket. The cast
    // goes through `unknown` because `ws`'s event types differ from the DOM's
    // even though the runtime shapes the transport relies on are identical.
    return socket as unknown as RabiWebSocket;
  };
}
