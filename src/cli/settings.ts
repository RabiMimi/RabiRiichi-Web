/**
 * CLI-specific settings persisted alongside credentials in the JSON config
 * file. These are concerns the web client does not have (terminal tile
 * rendering mode, whether the startup legibility prompt has been answered) plus
 * the UI language. Gameplay/animation settings continue to live in the shared
 * client `ClientSettings`.
 */
import type { KeyValueStore } from '../platform/storage';
import type { TileMode } from './render/tileGlyph';
import { type Language, isLanguage } from './i18n';

export const CLI_SETTINGS_KEY = 'rabiriichi_cli_settings';

export interface CliSettings {
  tileMode: TileMode;
  language: Language;
  /** Whether the first-run Unicode/ASCII legibility prompt has been answered. */
  tileModeConfirmed: boolean;
}

export const DEFAULT_CLI_SETTINGS: CliSettings = {
  tileMode: 'unicode', // prefer unicode (user confirms on first run)
  language: 'en',
  tileModeConfirmed: false,
};

function coerceTileMode(value: unknown): TileMode {
  return value === 'ascii' ? 'ascii' : 'unicode';
}

/** Reads CLI settings from the store, filling defaults for missing/invalid. */
export function loadCliSettings(store: KeyValueStore): CliSettings {
  const raw = store.getItem(CLI_SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_CLI_SETTINGS };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_CLI_SETTINGS };
    }
    const obj = parsed as Record<string, unknown>;
    const language =
      typeof obj.language === 'string' && isLanguage(obj.language)
        ? obj.language
        : DEFAULT_CLI_SETTINGS.language;
    return {
      tileMode: coerceTileMode(obj.tileMode),
      language,
      tileModeConfirmed: obj.tileModeConfirmed === true,
    };
  } catch {
    return { ...DEFAULT_CLI_SETTINGS };
  }
}

/** Merges a patch into the persisted CLI settings and returns the new value. */
export function saveCliSettings(
  store: KeyValueStore,
  patch: Partial<CliSettings>,
): CliSettings {
  const next = { ...loadCliSettings(store), ...patch };
  store.setItem(CLI_SETTINGS_KEY, JSON.stringify(next));
  return next;
}
