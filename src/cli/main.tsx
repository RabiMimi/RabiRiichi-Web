/**
 * CLI entry point. Parses a few flags, bootstraps headless i18n, builds the
 * Node-backed platform + client, applies any startup overrides, then renders
 * the Ink app. Also attempts a silent auto-reconnect when a saved session
 * exists.
 *
 * Flags:
 *   --config <path>   Override the JSON config/credentials file location.
 *   --server <url>    Pre-fill the server address.
 *   --tiles <mode>    Force tile display: `unicode` | `ascii`.
 *   --lang <lng>      UI language: `en` | `zhs` | `ja`.
 */
import { render } from 'ink';
import { createElement } from 'react';
import { RabiRiichiClient } from '../net/client';
import { createCliPlatform, resolveConfigPath } from './platform';
import { FileStore } from './platform/fileStore';
import { initI18n, isLanguage, type Language } from './i18n';
import { loadCliSettings, saveCliSettings } from './settings';
import { AppProvider } from './ui/AppContext';
import { App } from './App';

interface CliArgs {
  config?: string;
  server?: string;
  tiles?: 'unicode' | 'ascii';
  lang?: Language;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--config' && value) {
      args.config = value;
      i++;
    } else if (flag === '--server' && value) {
      args.server = value;
      i++;
    } else if (
      flag === '--tiles' &&
      (value === 'unicode' || value === 'ascii')
    ) {
      args.tiles = value;
      i++;
    } else if (flag === '--lang' && value && isLanguage(value)) {
      args.lang = value;
      i++;
    }
  }
  return args;
}

async function main(): Promise<void> {
  // Ink's keyboard input requires an interactive TTY (raw mode). Fail clearly
  // rather than crashing deep inside the render when piped or run in CI.
  if (!process.stdin.isTTY) {
    console.error(
      'RabiRiichi CLI requires an interactive terminal (TTY). ' +
        'Run it directly in a terminal, not through a pipe.',
    );
    process.exitCode = 1;
    return;
  }

  const args = parseArgs(process.argv.slice(2));

  const configPath = resolveConfigPath(args.config);
  const store = new FileStore(configPath);

  // Apply CLI flag overrides to persisted settings before first render.
  let settings = loadCliSettings(store);
  if (args.tiles) {
    settings = saveCliSettings(store, {
      tileMode: args.tiles,
      tileModeConfirmed: true,
    });
  }
  if (args.lang) {
    settings = saveCliSettings(store, { language: args.lang });
  }

  await initI18n(settings.language);

  const platform = createCliPlatform(configPath);
  const client = new RabiRiichiClient(platform);

  // Silent auto-reconnect if a saved session exists (unless a server override
  // was given, in which case we let the user pick a mode explicitly).
  if (!args.server) {
    const stored = client.loadStoredCredentials();
    if (stored) {
      client.connect(stored.url, stored.token).catch(() => {
        // Fall through to the connect screen on failure.
      });
    }
  } else {
    client.wsurl = args.server;
  }

  const { waitUntilExit } = render(
    createElement(AppProvider, {
      client,
      store,
      children: createElement(App),
    }),
  );
  await waitUntilExit();
  client.close();
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err);
  process.exitCode = 1;
});
