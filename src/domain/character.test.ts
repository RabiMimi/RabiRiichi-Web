import { describe, it, expect } from 'vitest';
import { CHARACTERS, VOICE_CATEGORIES } from './character';
import en from '../locales/en.json';
import ja from '../locales/ja.json';
import zhs from '../locales/zhs.json';

// Locale tables are statically typed from the JSON imports, but we look labels
// up dynamically by voice id, so treat them as loose records here.
interface LocaleTable {
  settings?: { voiceCategories?: Record<string, string> };
  character?: Record<string, { voices?: Record<string, string> }>;
}

const LOCALES: Record<string, LocaleTable> = { en, ja, zhs };

describe('character voice config', () => {
  for (const character of CHARACTERS) {
    describe(`character "${character.id}"`, () => {
      it('has no duplicate voice ids', () => {
        const ids = character.voiceLines.map((v) => v.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it('only uses known voice categories', () => {
        for (const line of character.voiceLines) {
          expect(VOICE_CATEGORIES).toContain(line.category);
        }
      });

      it('gives every voice line a playable audio url', () => {
        for (const line of character.voiceLines) {
          expect(line.audioUrl.length).toBeGreaterThan(0);
        }
      });

      for (const [locale, table] of Object.entries(LOCALES)) {
        it(`has a ${locale} label for every voice id`, () => {
          const voices = table.character?.[character.id]?.voices ?? {};
          const missing = character.voiceLines
            .map((v) => v.id)
            .filter((id) => !voices[id]);
          expect(missing, `missing ${locale} labels`).toEqual([]);
        });

        it(`has a ${locale} header for every used category`, () => {
          const headers = table.settings?.voiceCategories ?? {};
          const usedCategories = new Set(
            character.voiceLines.map((v) => v.category),
          );
          for (const category of usedCategories) {
            expect(headers[category], `${locale}/${category}`).toBeTruthy();
          }
        });
      }
    });
  }
});
