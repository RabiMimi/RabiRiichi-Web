/**
 * Platform abstraction layer.
 *
 * Bundles the host-specific capabilities the networking client depends on so
 * that the same core (transport, reducers, inquiry mapping, session
 * orchestration) can run unchanged on the web (browser globals) or on a
 * non-browser host such as a CLI (Node `ws`, `node:crypto`, a file store, and
 * no audio).
 *
 * Consumers inject a {@link ClientPlatform}; when omitted, the browser defaults
 * are used, preserving the previous behavior exactly.
 */
export {
  type RabiWebSocket,
  type WebSocketFactory,
  browserWebSocketFactory,
  SOCKET_CONNECTING,
  SOCKET_OPEN,
  SOCKET_CLOSING,
  SOCKET_CLOSED,
} from './socket';
export { type KeyValueStore, browserLocalStore, nullStore } from './storage';
export { type GameSoundPlayer, nullSoundPlayer } from './sound';
export { type CryptoProvider, browserCryptoProvider } from './crypto';

import { type WebSocketFactory, browserWebSocketFactory } from './socket';
import { type KeyValueStore, browserLocalStore } from './storage';
import { type GameSoundPlayer, nullSoundPlayer } from './sound';
import { type CryptoProvider, browserCryptoProvider } from './crypto';

/** The complete set of host capabilities the client requires. */
export interface ClientPlatform {
  socketFactory: WebSocketFactory;
  store: KeyValueStore;
  sound: GameSoundPlayer;
  crypto: CryptoProvider;
}

/**
 * Builds a {@link ClientPlatform}, filling any omitted capability with a safe
 * default: browser socket/store/crypto and a no-op sound player. Web callers
 * that want audio pass a real sound player (see `platform/soundBrowser`).
 */
export function createClientPlatform(
  overrides: Partial<ClientPlatform> = {},
): ClientPlatform {
  return {
    socketFactory: overrides.socketFactory ?? browserWebSocketFactory,
    store: overrides.store ?? browserLocalStore,
    sound: overrides.sound ?? nullSoundPlayer,
    crypto: overrides.crypto ?? browserCryptoProvider,
  };
}
