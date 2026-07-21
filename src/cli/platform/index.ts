/**
 * Assembles the Node-backed {@link ClientPlatform} for the CLI: a `ws` socket
 * factory, a JSON file key/value store, a `node:crypto` SHA-256 provider, and
 * the shared no-op sound player (the terminal has no audio).
 */
import type { ClientPlatform } from '../../platform';
import { nullSoundPlayer } from '../../platform';
import { createNodeWebSocketFactory } from './nodeSocket';
import { nodeCryptoProvider } from './nodeCrypto';
import { FileStore } from './fileStore';
import { resolveConfigPath } from './configPath';
import { t } from '../i18n';

export { resolveConfigPath } from './configPath';
export { FileStore } from './fileStore';

/**
 * Builds the CLI platform. The store is backed by the JSON config file at
 * {@link resolveConfigPath}; pass `configPath` to override its location.
 */
export function createCliPlatform(configPath?: string): ClientPlatform {
  return {
    socketFactory: createNodeWebSocketFactory(),
    store: new FileStore(resolveConfigPath(configPath)),
    crypto: nodeCryptoProvider,
    sound: nullSoundPlayer,
    translate: (key) => t(key),
  };
}
