export const LogLevel = {
  Debug: 0,
  Info: 1,
  Warn: 2,
  Error: 3,
  Fatal: 4,
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

const LOGLEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] as const;
const LOGLEVEL_METHODS = ['debug', 'info', 'warn', 'error', 'error'] as const;

function formatTime(date = new Date()): string {
  return date.toTimeString().split(' ')[0] ?? '';
}

function getLogLevelString(logLevel: LogLevel): string {
  return LOGLEVEL_NAMES[logLevel];
}

function getLogLevelConsole(logLevel: LogLevel) {
  const method = LOGLEVEL_METHODS[logLevel];
  return (msg: unknown, ...args: unknown[]) => {
    // This module is the single sanctioned console sink for the app.
    // eslint-disable-next-line no-console
    const fn = console[method] as (...args: unknown[]) => void;
    fn(msg, ...args);
  };
}

export interface LogEntry {
  title: string;
  data?: unknown;
  logLevel: LogLevel;
  time: Date;
  source: string;
}

class LogManager {
  public logLevel: LogLevel = LogLevel.Debug;
  private readonly _logs: LogEntry[] = [];

  public get logs(): readonly LogEntry[] {
    return this._logs;
  }

  public add(log: LogEntry) {
    if (log.logLevel < this.logLevel) {
      return;
    }
    this._logs.push(log);
    this.writeToConsole(log);
  }

  public clear() {
    this._logs.length = 0;
  }

  private writeToConsole(log: LogEntry) {
    let str = `[${formatTime(log.time)}/${getLogLevelString(log.logLevel)}:${
      log.source
    }] ${log.title}`;
    const consoleLog = getLogLevelConsole(log.logLevel);
    if (log.data !== undefined) {
      str += `\n${JSON.stringify(log.data, null, 2)}`;
      consoleLog(str);
    } else {
      consoleLog(str);
    }
  }
}

export const logManager = new LogManager();

export class Logger {
  public readonly source: string;
  public constructor(source: string) {
    this.source = source;
  }

  public log(
    title: string,
    data?: unknown,
    logLevel: LogLevel = LogLevel.Info,
  ): void {
    const logged: LogEntry = {
      title,
      data,
      logLevel,
      time: new Date(),
      source: this.source,
    };
    logManager.add(logged);
  }

  public debug(title: string, data?: unknown): void {
    this.log(title, data, LogLevel.Debug);
  }

  public info(title: string, data?: unknown): void {
    this.log(title, data, LogLevel.Info);
  }

  public warn(title: string, data?: unknown): void {
    this.log(title, data, LogLevel.Warn);
  }

  public error(title: string, data?: unknown): void {
    this.log(title, data, LogLevel.Error);
  }

  public fatal(title: string, data?: unknown): void {
    this.log(title, data, LogLevel.Fatal);
  }

  public assert(condition: boolean, error: string, data?: unknown): void {
    if (!condition) {
      this.error(error, data);
    }
  }
}
