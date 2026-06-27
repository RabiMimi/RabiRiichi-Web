import type { IClientMessageDto, IServerMessageDto } from '../proto';
import { Deferred, waitTimeout } from '../lib';

export const WS_RESPONSE_TIMEOUT = 15 * 1000;

export class ClientMessageWrapper {
  private readonly deferred = new Deferred<IServerMessageDto>();
  private resolved = false;
  public readonly msg: IClientMessageDto;

  public constructor(msg: IClientMessageDto) {
    this.msg = msg;
    this.deferred.promise.catch(() => {
      // Prevent unhandled promise rejection if response is never awaited
    });
  }

  public waitResponse(
    timeout = WS_RESPONSE_TIMEOUT,
  ): Promise<IServerMessageDto> {
    return waitTimeout(this.deferred.promise, timeout);
  }

  public resolveResponse(msg: IServerMessageDto): void {
    if (this.resolved) {
      return;
    }
    this.resolved = true;
    this.deferred.resolve(msg);
  }

  public rejectResponse(reason: unknown): void {
    if (this.resolved) {
      return;
    }
    this.resolved = true;
    this.deferred.reject(reason);
  }
}
