/**
 * Display font stacks for the result screens.
 *
 * Two decorative faces are bundled (see the `@font-face` rules in index.html):
 *  - `GameFont`   — Yuji Syuku, a Japanese brush face (SIL OFL).
 *  - `GameFontZH` — Aa沈夜食堂, a Chinese display face.
 *
 * Every stack ends in a generic family so text renders while the (multi-MB)
 * fonts load. Ordering matters beyond taste: a glyph missing from the first
 * face falls through to the next, but only if that face omits it entirely —
 * a font that maps a codepoint to an empty glyph renders blank and defeats the
 * fallback, which is why the subset in tools/subset-font.py must cover the UI.
 */

/** Generic tail shared by all stacks, used while the webfont loads. */
const SYSTEM_FALLBACK =
  "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const FONT_STACKS: Record<string, string> = {
  zhs: `'GameFontZH', 'GameFont', ${SYSTEM_FALLBACK}`,
  ja: `'GameFont', 'GameFontZH', ${SYSTEM_FALLBACK}`,
  en: `'GameFontZH', ${SYSTEM_FALLBACK}`,
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
