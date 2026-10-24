import { describe, expect, it } from 'vitest';
import { isHandheldDevice } from './handheldDevice';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID_TABLET =
  'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
/** What iPadOS Safari sends by default ("Request Desktop Website"). */
const DESKTOP_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const WINDOWS_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

describe('isHandheldDevice', () => {
  it('recognises phones and Android tablets by user agent', () => {
    expect(isHandheldDevice(IPHONE, 5)).toBe(true);
    expect(isHandheldDevice(ANDROID_TABLET, 10)).toBe(true);
  });

  it('recognises an iPad behind its desktop user agent', () => {
    expect(isHandheldDevice(DESKTOP_SAFARI, 5)).toBe(true);
  });

  it('leaves a Mac with no touch screen alone', () => {
    expect(isHandheldDevice(DESKTOP_SAFARI, 0)).toBe(false);
  });

  it('leaves desktop browsers alone, touch screen or not', () => {
    expect(isHandheldDevice(WINDOWS_CHROME, 0)).toBe(false);
    expect(isHandheldDevice(WINDOWS_CHROME, 10)).toBe(false);
  });
});
