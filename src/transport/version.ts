import type { IServerVersionCheckMsg } from '../proto';
import { CLIENT_VERSION, MIN_SERVER_VERSION } from './constants';

export class Version {
  public readonly data: number[];

  public static readonly CLIENT_VERSION = new Version(CLIENT_VERSION);
  public static readonly MIN_SERVER_VERSION = new Version(MIN_SERVER_VERSION);

  public constructor(str: string) {
    this.data = str.split('.').map((num) => {
      const parsed = parseInt(num, 10);
      return isNaN(parsed) ? 0 : parsed;
    });
  }

  public isAtLeast(rhs: Version): boolean {
    const maxLen = Math.max(this.data.length, rhs.data.length);
    for (let i = 0; i < maxLen; i++) {
      const lhsVal = this.data[i] ?? 0;
      const rhsVal = rhs.data[i] ?? 0;
      if (lhsVal < rhsVal) {
        return false;
      }
      if (lhsVal > rhsVal) {
        return true;
      }
    }
    return true;
  }

  public toJSON(): string {
    return this.data.join('.');
  }

  public toString(): string {
    return this.toJSON();
  }
}

export function isServerSupported(msg: IServerVersionCheckMsg): boolean {
  if (!msg.serverVersion || !msg.minClientVersion) {
    return false;
  }
  const serverVersion = new Version(msg.serverVersion);
  const minClientVersion = new Version(msg.minClientVersion);
  return (
    serverVersion.isAtLeast(Version.MIN_SERVER_VERSION) &&
    Version.CLIENT_VERSION.isAtLeast(minClientVersion)
  );
}
