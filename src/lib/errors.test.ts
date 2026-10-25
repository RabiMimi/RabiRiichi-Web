import { describe, it, expect, beforeAll } from 'vitest';
import { formatError, RabiError } from './errors';
import { initI18n, setLanguage, tFunction } from '../cli/i18n';

describe('formatError authentication error separation', () => {
  beforeAll(async () => {
    await initI18n('en');
  });

  describe('English translations', () => {
    beforeAll(async () => {
      await setLanguage('en');
    });

    it('formats "User does not exist" status error', () => {
      const err = new Error(
        'Status(StatusCode="Unauthenticated", Detail="User does not exist")',
      );
      expect(formatError(err, tFunction)).toBe('User does not exist');
    });

    it('formats "Password mismatch" status error', () => {
      const err = new Error(
        'Status(StatusCode="Unauthenticated", Detail="Password mismatch")',
      );
      expect(formatError(err, tFunction)).toBe('Password mismatch');
    });

    it('formats "Username does not exist" alias', () => {
      const err = new Error(
        'Status(StatusCode="Unauthenticated", Detail="Username does not exist")',
      );
      expect(formatError(err, tFunction)).toBe('User does not exist');
    });

    it('formats "Passwords do not match" alias', () => {
      const err = new Error(
        'Status(StatusCode="Unauthenticated", Detail="Passwords do not match")',
      );
      expect(formatError(err, tFunction)).toBe('Password mismatch');
    });

    it('formats RabiError from proto with userDoesNotExist vs passwordMismatch', () => {
      const userErr = RabiError.fromProto({
        status:
          'Status(StatusCode="Unauthenticated", Detail="User does not exist")',
        message: 'User does not exist',
      });
      expect(formatError(userErr, tFunction)).toBe('User does not exist');

      const passErr = RabiError.fromProto({
        status:
          'Status(StatusCode="Unauthenticated", Detail="Password mismatch")',
        message: 'Password mismatch',
      });
      expect(formatError(passErr, tFunction)).toBe('Password mismatch');
    });
  });

  describe('Chinese (zhs) translations', () => {
    beforeAll(async () => {
      await setLanguage('zhs');
    });

    it('formats "User does not exist" as "用户不存在"', () => {
      const err = new Error(
        'Status(StatusCode="Unauthenticated", Detail="User does not exist")',
      );
      expect(formatError(err, tFunction)).toBe('用户不存在');
    });

    it('formats "Password mismatch" as "密码错误"', () => {
      const err = new Error(
        'Status(StatusCode="Unauthenticated", Detail="Password mismatch")',
      );
      expect(formatError(err, tFunction)).toBe('密码错误');
    });
  });

  describe('Japanese (ja) translations', () => {
    beforeAll(async () => {
      await setLanguage('ja');
    });

    it('formats "User does not exist" as "ユーザーが存在しません"', () => {
      const err = new Error(
        'Status(StatusCode="Unauthenticated", Detail="User does not exist")',
      );
      expect(formatError(err, tFunction)).toBe('ユーザーが存在しません');
    });

    it('formats "Password mismatch" as "パスワードが一致しません"', () => {
      const err = new Error(
        'Status(StatusCode="Unauthenticated", Detail="Password mismatch")',
      );
      expect(formatError(err, tFunction)).toBe('パスワードが一致しません');
    });
  });
});
