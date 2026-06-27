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
