import { describe, it, expect, beforeAll } from 'vitest';
import { initI18n, setLanguage, currentLanguage, t, isLanguage } from './i18n';

describe('cli i18n', () => {
  beforeAll(async () => {
    await initI18n('en');
  });

  it('translates a known key in English', () => {
    expect(t('lobby.createRoom')).toBe('Create Room');
  });

  it('switches language and reflects it in translations', async () => {
    await setLanguage('zhs');
    expect(currentLanguage()).toBe('zhs');
    expect(t('lobby.createRoom')).toBe('创建房间');
    await setLanguage('en');
  });

  it('falls back to the key-ish default for unknown keys', () => {
    // i18next returns the key itself when missing.
    expect(t('this.key.does.not.exist')).toBe('this.key.does.not.exist');
  });

  it('interpolates both nickname and id in the lobby welcome', () => {
    expect(t('lobby.welcome', { nickname: 'Mimi', id: 123 })).toBe(
      'Welcome, Mimi! (ID: 123)',
    );
  });

  it('isLanguage guards supported languages', () => {
    expect(isLanguage('en')).toBe(true);
    expect(isLanguage('zhs')).toBe(true);
    expect(isLanguage('ja')).toBe(true);
    expect(isLanguage('fr')).toBe(false);
  });
});
