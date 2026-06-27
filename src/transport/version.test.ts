import { describe, it, expect } from 'vitest';
import { Version, isServerSupported } from './version';
import type { IServerVersionCheckMsg } from '../proto';

describe('Version', () => {
  it('should parse version strings', () => {
    const v = new Version('1.2.3.4');
    expect(v.data).toEqual([1, 2, 3, 4]);
  });

  it('should handle malformed version strings', () => {
    const v = new Version('1.a.3');
    expect(v.data).toEqual([1, 0, 3]);
  });

  it('should compare versions correctly', () => {
    expect(new Version('1.2.3').isAtLeast(new Version('1.2.3'))).toBe(true);
    expect(new Version('1.2.4').isAtLeast(new Version('1.2.3'))).toBe(true);
    expect(new Version('1.3.0').isAtLeast(new Version('1.2.3'))).toBe(true);
    expect(new Version('2.0.0').isAtLeast(new Version('1.2.3'))).toBe(true);

    expect(new Version('1.2.2').isAtLeast(new Version('1.2.3'))).toBe(false);
    expect(new Version('1.1.9').isAtLeast(new Version('1.2.3'))).toBe(false);
    expect(new Version('0.9.9').isAtLeast(new Version('1.2.3'))).toBe(false);
  });

  it('should handle different length versions in comparison', () => {
    expect(new Version('1.2').isAtLeast(new Version('1.2.0'))).toBe(true);
    expect(new Version('1.2.0').isAtLeast(new Version('1.2'))).toBe(true);
    expect(new Version('1.2.1').isAtLeast(new Version('1.2'))).toBe(true);
    expect(new Version('1.2').isAtLeast(new Version('1.2.1'))).toBe(false);
  });

  it('should serialize to JSON', () => {
    const v = new Version('1.2.3');
    expect(v.toJSON()).toBe('1.2.3');
  });

  describe('isServerSupported', () => {
    it('should return true if server version is at least min server version and client version is at least min client version', () => {
      // Version.MIN_SERVER_VERSION is 0.1.0.0
      // Version.CLIENT_VERSION is 0.1.0
      const msg: IServerVersionCheckMsg = {
        serverVersion: '0.1.0.0',
        minClientVersion: '0.1.0',
      };
      expect(isServerSupported(msg)).toBe(true);

      const msgHigher: IServerVersionCheckMsg = {
        serverVersion: '0.2.0.0',
        minClientVersion: '0.0.9',
      };
      expect(isServerSupported(msgHigher)).toBe(true);
    });

    it('should return false if server version is too old', () => {
      const msg: IServerVersionCheckMsg = {
        serverVersion: '0.0.9.9',
        minClientVersion: '0.1.0',
      };
      expect(isServerSupported(msg)).toBe(false);
    });

    it('should return false if server requires a newer client', () => {
      const msg: IServerVersionCheckMsg = {
        serverVersion: '0.1.0.0',
        minClientVersion: '0.2.0',
      };
      expect(isServerSupported(msg)).toBe(false);
    });
  });
});
