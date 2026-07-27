/**
 * Display font stacks for the result screens.
 *
 * Two decorative faces are bundled (see the `@font-face` rules in index.html):
 *  - `GameFont`   — TamanegiKaishov7.ttf, used for Japanese/English display face.
 *  - `GameFontZH` — Aa沈夜食堂, a Chinese display face.
 *
 * Every stack ends in a generic family so text renders while the (multi-MB) fonts are loading.
 */

/** Generic tail shared by all stacks, used while the webfont loads. */
const SYSTEM_FALLBACK =
  "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const FONT_STACKS: Record<string, string> = {
  zhs: `'GameFontZH', 'GameFont', ${SYSTEM_FALLBACK}`,
  ja: `'GameFont', 'GameFontZH', ${SYSTEM_FALLBACK}`,
  en: `'GameFont', ${SYSTEM_FALLBACK}`,
};

/**
 * Returns the CSS `font-family` for the given i18n language.
 *
 * Unknown languages get the system stack: guessing a CJK display face for an
 * unrelated script renders worse than plain text.
 */
export function getGameFontStack(language: string | undefined): string {
  if (!language) return SYSTEM_FALLBACK;
  // i18next hands back tags like `zhs`, but also regional ones like `en-US`.
  const base = language.toLowerCase().split('-')[0] ?? '';
  return (
    FONT_STACKS[language.toLowerCase()] ?? FONT_STACKS[base] ?? SYSTEM_FALLBACK
  );
}
