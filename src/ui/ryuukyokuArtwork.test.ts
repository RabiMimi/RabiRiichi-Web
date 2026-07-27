import { describe, expect, it } from 'vitest';
import { getRyuukyokuArtwork, hasRyuukyokuArtwork } from './ryuukyokuArtwork';
import i18n from '../lib/i18n';

/** Reason names emitted by RabiRiichi/Events/InGame/RyuukyokuEvent.cs. */
const ABORTIVE_DRAWS = [
  'suufon_renda',
  'kyuushu_kyuuhai',
  'suucha_riichi',
  'triple_ron',
  'suukan_sanra',
] as const;

describe('ryuukyokuArtwork', () => {
  it.each(ABORTIVE_DRAWS)('has artwork for %s', async (reason) => {
    await i18n.changeLanguage('zhs');
    expect(getRyuukyokuArtwork(reason)).toBe(`/assets/ui/zhs/${reason}.png`);
    await i18n.changeLanguage('en');
    expect(getRyuukyokuArtwork(reason)).toBe(`/assets/ui/en/${reason}.png`);
    await i18n.changeLanguage('ja');
    expect(getRyuukyokuArtwork(reason)).toBe(`/assets/ui/ja/${reason}.png`);
    expect(hasRyuukyokuArtwork(reason)).toBe(true);
  });

  it('leaves the exhaustive draw to the text banner', () => {
    // end_game_ryuukyoku is the ordinary wall-exhausted draw; it has no
    // dedicated image, so ResultAnimation3D must still announce it.
    expect(getRyuukyokuArtwork('end_game_ryuukyoku')).toBeNull();
    expect(hasRyuukyokuArtwork('end_game_ryuukyoku')).toBe(false);
  });

  it('treats an absent reason as having no artwork', () => {
    expect(hasRyuukyokuArtwork(null)).toBe(false);
    expect(hasRyuukyokuArtwork(undefined)).toBe(false);
    expect(hasRyuukyokuArtwork('')).toBe(false);
    expect(hasRyuukyokuArtwork('not_a_real_reason')).toBe(false);
  });
});
