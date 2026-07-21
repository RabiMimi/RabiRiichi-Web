/**
 * Resolves the on-disk path of the CLI's JSON config/credential file.
 *
 * Resolution order (first match wins):
 * 1. An explicit path (e.g. from a `--config` flag).
 * 2. The `RABIRIICHI_CLI_CONFIG` environment variable.
 * 3. `$XDG_CONFIG_HOME/rabiriichi-cli/config.json`.
 * 4. `$HOME/.config/rabiriichi-cli/config.json`.
 * 5. `./.rabiriichi-cli.json` in the current working directory (gitignored
 *    fallback when no home directory is available).
 *
 * The file itself is created lazily by {@link ../platform/fileStore.FileStore}.
 */
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_DIR = 'rabiriichi-cli';
const CONFIG_FILE = 'config.json';
const LOCAL_FALLBACK = '.rabiriichi-cli.json';

export function resolveConfigPath(explicitPath?: string): string {
  if (explicitPath) return explicitPath;

  const fromEnv = process.env.RABIRIICHI_CLI_CONFIG;
  if (fromEnv) return fromEnv;

  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return join(xdg, CONFIG_DIR, CONFIG_FILE);

  const home = homedir();
  if (home) return join(home, '.config', CONFIG_DIR, CONFIG_FILE);

  return join(process.cwd(), LOCAL_FALLBACK);
}
