import { describe, expect, it } from 'vitest';
import { detectNativeApp } from './nativeApp';

const browserLaunch = { referrer: '', search: '', remembered: false };

describe('detectNativeApp', () => {
  it('recognises a launch from the Android app', () => {
    expect(
      detectNativeApp({
        ...browserLaunch,
        referrer: 'android-app://com.rabimimi.riichi/',
      }),
    ).toBe(true);
  });

  it('ignores other Android apps', () => {
    expect(
      detectNativeApp({
        ...browserLaunch,
        referrer: 'android-app://com.google.android.gm/',
      }),
    ).toBe(false);
  });

  it('keeps the answer after a reload drops the referrer', () => {
    expect(detectNativeApp({ ...browserLaunch, remembered: true })).toBe(true);
  });

  it('follows the flag across a client switch', () => {
    expect(
      detectNativeApp({
        referrer: 'https://riichi.rabimimi.com/',
        search: '?client=android-app',
        remembered: false,
      }),
    ).toBe(true);
  });

  it('treats a plain browser visit as the web client', () => {
    expect(detectNativeApp(browserLaunch)).toBe(false);
    expect(
      detectNativeApp({
        referrer: 'https://www.google.com/',
        search: '?gameId=123&client=web',
        remembered: false,
      }),
    ).toBe(false);
  });
});
