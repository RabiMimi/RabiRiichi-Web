import type { TFunction } from 'i18next';

export const RabiErrorType = {
  AuthError: 'AUTH_ERROR',
  ServerError: 'SERVER_ERROR',
  Timeout: 'TIMEOUT',
  NetworkError: 'NETWORK_ERROR',
  ArgumentError: 'ARGUMENT_ERROR',
  StateError: 'STATE_ERROR',
  NotImplemented: 'NOT_IMPLEMENTED',
} as const;
export type RabiErrorType = (typeof RabiErrorType)[keyof typeof RabiErrorType];

export class RabiError extends Error {
  public readonly type: string;
  public readonly detail: string;

  constructor(type: string, detail = '') {
    super(detail ? `${type}: ${detail}` : type);
    this.type = type;
    this.detail = detail;
    this.name = 'RabiError';
  }

  public static fromProto(error: {
    status?: string | null;
    message?: string | null;
  }): RabiError {
    return new RabiError(error.status ?? 'UNKNOWN_ERROR', error.message ?? '');
  }
}

export class AuthError extends RabiError {
  constructor(detail = '') {
    super(RabiErrorType.AuthError, detail);
    this.name = 'AuthError';
  }
}

export class ServerError extends RabiError {
  constructor(detail = '') {
    super(RabiErrorType.ServerError, detail);
    this.name = 'ServerError';
  }
}

export class TimeoutError extends RabiError {
  constructor(detail = '') {
    super(RabiErrorType.Timeout, detail);
    this.name = 'TimeoutError';
  }
}

export class NetworkError extends RabiError {
  constructor(detail = '') {
    super(RabiErrorType.NetworkError, detail);
    this.name = 'NetworkError';
  }
}

export class ArgumentError extends RabiError {
  constructor(detail = '') {
    super(RabiErrorType.ArgumentError, detail);
    this.name = 'ArgumentError';
  }
}

export class StateError extends RabiError {
  constructor(detail = '') {
    super(RabiErrorType.StateError, detail);
    this.name = 'StateError';
  }
}

export class NotImplementedError extends RabiError {
  constructor(detail = '') {
    super(RabiErrorType.NotImplemented, detail);
    this.name = 'NotImplementedError';
  }
}

const SERVER_ERROR_DETAIL_MAP: Record<string, string> = {
  'Invalid game ID': 'invalidGameId',
  'Replay not found': 'replayNotFound',
  'Server is busy': 'serverBusy',
  'Cannot add user': 'cannotAddUser',
  'User is not in a room': 'userNotInRoom',
  'Only the room owner can add AI': 'onlyOwnerCanAddAi',
  'Cannot add AI to room': 'cannotAddAi',
  'Only the room owner can remove players': 'onlyOwnerCanRemovePlayer',
  'Player not found in room': 'playerNotFound',
  'Cannot remove player from room': 'cannotRemovePlayer',
  'User does not exist': 'userDoesNotExist',
};

const STATUS_REGEX = /^Status\(StatusCode="([A-Za-z]+)",\s*Detail="(.*)"\)$/;

export function formatError(err: unknown, t: TFunction): string {
  const parseStatusAndLocalize = (msg: string): string | null => {
    const match = STATUS_REGEX.exec(msg);
    if (!match) return null;
    const statusCode = match[1];
    const detail = match[2];
    if (!statusCode || !detail) return null;

    const mappedKey = SERVER_ERROR_DETAIL_MAP[detail];
    if (mappedKey) {
      return t(`error.server.${statusCode}.${mappedKey}`, {
        defaultValue: t(`error.server.${statusCode}.generic`, {
          defaultValue: detail,
        }),
      });
    }

    if (detail.startsWith('Invalid or unsupported AI type')) {
      return t(`error.server.InvalidArgument.invalidAiType`, {
        defaultValue: detail,
      });
    }

    return t(`error.server.${statusCode}.generic`, {
      defaultValue: detail,
    });
  };

  if (err instanceof RabiError) {
    try {
      const payload = JSON.parse(err.detail) as unknown;
      if (
        payload &&
        typeof payload === 'object' &&
        'key' in payload &&
        typeof payload.key === 'string'
      ) {
        const key = payload.key;
        const params = (('params' in payload && payload.params) ??
          {}) as Record<string, unknown>;
        return t(key, params);
      }
    } catch {
      // ignore
    }

    // Try parsing status error from the message (which contains status details)
    const localized = parseStatusAndLocalize(err.message);
    if (localized) return localized;

    // Or try parsing from detail (some errors might put status string in detail)
    const localizedFromDetail = parseStatusAndLocalize(err.detail);
    if (localizedFromDetail) return localizedFromDetail;

    return err.message;
  }

  if (err instanceof Error) {
    const localized = parseStatusAndLocalize(err.message);
    if (localized) return localized;
    return err.message;
  }

  return String(err);
}
