/**
 * Platform-agnostic WebSocket abstraction.
 *
 * The transport layer ({@link ../transport/rabiSocket}) needs a binary
 * WebSocket but must not hard-depend on the browser's global `WebSocket`
 * constructor, so that non-browser hosts (e.g. a Node/CLI client using the
 * `ws` package) can supply their own implementation.
 *
 * This module defines the minimal surface the transport actually uses, plus a
 * default factory that resolves the ambient browser `WebSocket`. The surface is
 * intentionally a structural subset of the WHATWG `WebSocket` interface, so the
 * browser global (and test doubles that mimic it) satisfy it without adapters.
 */

/** WHATWG `readyState` constants, defined here to avoid touching a global. */
export const SOCKET_CONNECTING = 0;
export const SOCKET_OPEN = 1;
export const SOCKET_CLOSING = 2;
export const SOCKET_CLOSED = 3;

/**
 * The subset of the WHATWG `WebSocket` API used by the transport layer. Any
 * conforming socket (browser `WebSocket`, the `ws` package, or a test double)
 * can be used interchangeably.
 */
export interface RabiWebSocket {
  binaryType: string;
  readonly readyState: number;
  send(data: ArrayBufferView | ArrayBuffer): void;
  close(): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
  ): void;
}

/**
 * Creates a new socket for the given URL (and optional subprotocols). The
 * returned socket must begin connecting immediately, mirroring the browser
 * `WebSocket` constructor contract.
 */
export type WebSocketFactory = (
  url: string | URL,
  protocols?: string | string[],
) => RabiWebSocket;

/**
 * Default factory backed by the ambient global `WebSocket`.
 *
 * The global is resolved lazily on each call (rather than captured once) so
 * that test setups which stub `globalThis.WebSocket` continue to work, and so
 * importing this module never throws in environments lacking the global.
 */
export const browserWebSocketFactory: WebSocketFactory = (url, protocols) => {
  const Ctor = (globalThis as { WebSocket?: unknown }).WebSocket;
  if (typeof Ctor !== 'function') {
    throw new Error(
      'No global WebSocket available; provide a WebSocketFactory via the platform config.',
    );
  }
  const Constructable = Ctor as new (
    url: string | URL,
    protocols?: string | string[],
  ) => RabiWebSocket;
  return protocols === undefined
    ? new Constructable(url)
    : new Constructable(url, protocols);
};
