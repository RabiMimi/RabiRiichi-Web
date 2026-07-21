/**
 * Headless i18n for the CLI.
 *
 * The web client's `lib/i18n.ts` pulls in `react-i18next` and reads
 * `localStorage`/`navigator`, which are browser concerns. The CLI initializes
 * i18next core directly from the same locale JSON resources, so translation keys
 * stay identical across clients. Exposes a plain `t(key, opts)` compatible with
 * the `(key) => string` signature used by domain display helpers
 * (e.g. `getPlayerDisplayName`).
 */
import i18next from 'i18next';
import en from '../locales/en.json';
import zhs from '../locales/zhs.json';
import ja from '../locales/ja.json';
import { CLI_LOCALES } from './locales';

export const SUPPORTED_LANGUAGES = ['en', 'zhs', 'ja'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export function isLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** Human-readable language names for the settings menu. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  zhs: '简体中文',
  ja: '日本語',
};

let initialized = false;

/** Initializes i18next once with the given language. Safe to call repeatedly. */
export async function initI18n(lng: Language = 'en'): Promise<void> {
  if (initialized) {
    await setLanguage(lng);
    return;
  }
  await i18next.init({
    resources: {
      en: { translation: { ...en, cli: CLI_LOCALES.en } },
      zhs: { translation: { ...zhs, cli: CLI_LOCALES.zhs } },
      ja: { translation: { ...ja, cli: CLI_LOCALES.ja } },
    },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
  initialized = true;
}

export async function setLanguage(lng: Language): Promise<void> {
  await i18next.changeLanguage(lng);
}

export function currentLanguage(): Language {
  const lng = i18next.language;
  return isLanguage(lng) ? lng : 'en';
}

/**
 * The raw i18next `TFunction`, for APIs that require it (e.g. `formatError`).
 * Prefer {@link t}/{@link tc} elsewhere.
 */
export const tFunction = i18next.t.bind(i18next);

/**
 * Typed accessor for the CLI-only strings in the current language. Prefer this
 * over `t('cli.*')` in components for full type-safety and autocompletion.
 */
export function tc(): (typeof CLI_LOCALES)[Language] {
  return CLI_LOCALES[currentLanguage()];
}

/** Translate a key. Values are always coerced to a string for terminal output. */
export function t(key: string, options?: Record<string, unknown>): string {
  // Branch so we never pass an explicit `undefined` options object, which the
  // i18next overloads reject under exactOptionalPropertyTypes.
  return options === undefined
    ? String(i18next.t(key))
    : String(i18next.t(key, options));
}
