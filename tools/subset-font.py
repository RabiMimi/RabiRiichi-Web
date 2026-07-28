#!/usr/bin/env python3
"""Subset the bundled display fonts down to what the UI can actually render.

Both faces ship whole-CJK coverage (8-13MB) and the game draws a small slice of
it. Subsetting keeps the look while cutting most of the download.

Why the coverage sets below are drawn the way they are:

* A glyph the font *omits* falls through the stack in `gameFont.ts`. A glyph the
  font *maps to an empty outline* renders as blank space and defeats the
  fallback entirely -- that is how 飜 disappeared. A subset is therefore safe
  (absent), while an under-built font is not (blank).
* The 3D table centre is drawn by troika, which has **no fallback at all** and
  cannot read woff2 ("woff2 fonts not supported"). It therefore gets its own
  tiny TTF per language, holding only the handful of glyphs it draws.
* No user-supplied text (player names, chat) renders in either face today; it
  all uses the default sans. If that changes, widen these sets.

Usage:  pip install fonttools brotli
        python3 tools/subset-font.py ja    <YujiSyuku.ttf>       <out.woff2>
        python3 tools/subset-font.py zh    <AaShenYeShiTang.ttf> <out.woff2>
        python3 tools/subset-font.py table <either.ttf>          <out.ttf>

The output flavour follows the extension: .woff2 for CSS, .ttf for troika.
"""

import json
import pathlib
import sys

from fontTools import subset

REPO = pathlib.Path(__file__).resolve().parent.parent

ASCII_PRINTABLE = "".join(chr(c) for c in range(0x20, 0x7F))
KANA = "".join(chr(c) for c in range(0x3040, 0x3100))
FULLWIDTH = "".join(chr(c) for c in range(0xFF01, 0xFF5F))
PUNCTUATION = "、。「」『』（）・ー〜…！？　※〒℃±×÷←→↑↓■●▲▼◆★☆"

# Kanji baked into the 3D table centre (TableCenter.tsx). Troika renders with a
# single font file and cannot fall back, so these are mandatory for `zh`.
TABLE_CENTRE = "東南西北局余"


def jis_kanji(first_row: int, last_row: int) -> str:
    """JIS X 0208 kanji rows, enumerated exactly via the euc-jp codec.

    Level 1 is rows 16-47 (frequency ordered); level 2 is rows 48-84.
    """
    out = []
    for row in range(first_row, last_row + 1):
        for cell in range(1, 95):
            try:
                out.append(bytes([0xA0 + row, 0xA0 + cell]).decode("euc_jp"))
            except UnicodeDecodeError:
                pass
    return "".join(out)


def locale_glyphs(*locales: str) -> str:
    """Every character the given locale files can put on screen."""
    chars: set[str] = set()

    def walk(node) -> None:
        if isinstance(node, dict):
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)
        elif isinstance(node, str):
            chars.update(node)

    for locale in locales:
        walk(json.loads((REPO / "src/locales" / f"{locale}.json").read_text("utf-8")))
    return "".join(sorted(chars))


def coverage(profile: str) -> str:
    if profile == "table":
        # Exactly what TableCenter draws: winds, the round/remaining labels,
        # scores and their sign. Keep this in sync with TableCenter.tsx.
        return TABLE_CENTRE + "0123456789+-"

    common = ASCII_PRINTABLE + FULLWIDTH + PUNCTUATION + TABLE_CENTRE
    if profile == "ja":
        # JIS levels 1 and 2 cover essentially any Japanese text, so the face
        # stays usable if it is ever pointed at names or other dynamic strings.
        return (
            common + KANA + jis_kanji(16, 47) + jis_kanji(48, 84) + locale_glyphs("ja")
        )
    if profile == "zh":
        # Chinese has no equivalent of the JIS levels and the simplified set is
        # far larger, so scope this one to text the UI can actually produce.
        return common + KANA + locale_glyphs("zhs", "en")
    raise SystemExit(f"unknown profile {profile!r} (expected ja, zh or table)")


def main() -> int:
    if len(sys.argv) != 4:
        print(__doc__)
        return 1
    profile, src, dst = sys.argv[1], sys.argv[2], sys.argv[3]
    args = [src, f"--text={coverage(profile)}", "--layout-features=*",
            f"--output-file={dst}"]
    if dst.endswith(".woff2"):
        args.append("--flavor=woff2")
    subset.main(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
