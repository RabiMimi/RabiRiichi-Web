import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Logger, logManager, LogLevel } from './logger';

describe('Logger', () => {
  beforeEach(() => {
    logManager.clear();
    logManager.logLevel = LogLevel.Debug;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log messages to logManager', () => {
    const logger = new Logger('Test');
    logger.info('Hello World', { foo: 'bar' });

    const [entry] = logManager.logs;
    expect(logManager.logs.length).toBe(1);
    expect(entry?.title).toBe('Hello World');
    expect(entry?.source).toBe('Test');
    expect(entry?.logLevel).toBe(LogLevel.Info);
    expect(entry?.data).toEqual({ foo: 'bar' });
    expect(entry?.time).toBeInstanceOf(Date);
  });

  it('should respect logManager.logLevel', () => {
    logManager.logLevel = LogLevel.Warn;
    const logger = new Logger('Test');

    logger.debug('Debug msg');
    logger.info('Info msg');
    logger.warn('Warn msg');
    logger.error('Error msg');

    expect(logManager.logs.map((l) => l.logLevel)).toEqual([
      LogLevel.Warn,
      LogLevel.Error,
    ]);
  });

  it('should call console methods', () => {
    const debugSpy = vi
      .spyOn(console, 'debug')
      .mockImplementation(() => undefined);
    const infoSpy = vi
      .spyOn(console, 'info')
      .mockImplementation(() => undefined);
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const logger = new Logger('Test');

    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');
    logger.fatal('fatal'); // fatal also uses console.error in our config

    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(2); // error + fatal
  });

  it('should assert and log error if condition is false', () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const logger = new Logger('Test');

    logger.assert(true, 'should not log');
    expect(logManager.logs.length).toBe(0);
    expect(errorSpy).not.toHaveBeenCalled();

    logger.assert(false, 'should log', { extra: 1 });
    const [entry] = logManager.logs;
    expect(logManager.logs.length).toBe(1);
    expect(entry?.title).toBe('should log');
    expect(entry?.logLevel).toBe(LogLevel.Error);
    expect(entry?.data).toEqual({ extra: 1 });
    expect(errorSpy).toHaveBeenCalled();
  });
});
