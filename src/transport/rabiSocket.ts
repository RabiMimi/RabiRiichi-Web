import { ClientMessageDto, ServerMessageDto } from '../proto';
import type {
  IClientMessageDto,
  IServerMessageDto,
  IUserInfoResponse,
  ITwoWayHeartBeatMsg,
} from '../proto';
import { Logger, RabiEvent, sleep, TimeoutError } from '../lib';
import { MessageRecord } from './messageRecord';
import { ClientMessageWrapper } from './messageWrapper';
import { CLIENT_NAME, WS_HEARTBEAT_INTERVAL } from './constants';
import { Version, isServerSupported, versionErrorReason } from './version';
import i18n from '../lib/i18n';
import {
  type RabiWebSocket,
  type WebSocketFactory,
  browserWebSocketFactory,
  SOCKET_OPEN,
  SOCKET_CLOSING,
  SOCKET_CLOSED,
} from '../platform/socket';

export class RabiSocket {
  private readonly serverLog = new Logger('Server');
  private readonly clientLog = new Logger('Client');
  public readonly ws: RabiWebSocket;

  public readonly waitOpen: Promise<void>;
  public readonly waitClose: Promise<void>;
  public readonly accessToken: string | undefined;

  private readonly msgs = new MessageRecord();

  public get onMessage(): RabiEvent<IServerMessageDto> {
    return this.msgs.onMessage;
  }

  public readonly onPingUpdated = new RabiEvent<number>();
  private _ping = -1;
  public get ping(): number {
    return this._ping;
  }

  /**
   * @param url Server WebSocket URL.
   * @param accessToken Optional JWT for the authenticated `/ws/connect` socket.
   * @param socketFactory Creates the underlying socket. Defaults to the browser
   *   global `WebSocket`; non-browser hosts (e.g. a Node CLI backed by `ws`)
   *   inject their own.
   */
  public constructor(
    url: string | URL,
    accessToken: string | undefined = undefined,
    socketFactory: WebSocketFactory = browserWebSocketFactory,
  ) {
    this.accessToken = accessToken;
    this.ws = socketFactory(url);
    this.ws.binaryType = 'arraybuffer';

    this.waitOpen = new Promise((resolve, reject) => {
      const onOpen = () => {
        cleanup();
        resolve();
      };
      const onError = (err: unknown) => {
        cleanup();
        let message = 'Connection failed';
        if (typeof err === 'string') {
          message = err;
        } else if (err && typeof err === 'object' && 'message' in err) {
          const msgVal = (err as Record<string, unknown>).message;
          if (typeof msgVal === 'string') {
            message = msgVal;
          }
        } else if (typeof err === 'number' || typeof err === 'boolean') {
          message = String(err);
        }
        reject(err instanceof Error ? err : new Error(message));
      };
      const cleanup = () => {
        this.ws.removeEventListener('open', onOpen);
        this.ws.removeEventListener('error', onError);
        this.ws.removeEventListener('close', onCloseBeforeOpen);
      };
      const onCloseBeforeOpen = () => {
        cleanup();
        reject(new Error('Connection closed before open'));
      };

      this.ws.addEventListener('open', onOpen);
      this.ws.addEventListener('error', onError);
      this.ws.addEventListener('close', onCloseBeforeOpen);
    });

    this.waitClose = new Promise((resolve) => {
      this.ws.addEventListener('close', () => {
        resolve();
      });
    });

    this.ws.addEventListener('message', this.handleMessage.bind(this));
    this.ws.addEventListener('close', this.handleClose.bind(this));
    this.ws.addEventListener('error', this.handleError.bind(this));
  }

  public get isClosing(): boolean {
    return (
      this.ws.readyState === SOCKET_CLOSING ||
      this.ws.readyState === SOCKET_CLOSED
    );
  }

  public get isConnected(): boolean {
    return this.ws.readyState === SOCKET_OPEN;
  }

  public send(
    msg: IClientMessageDto | ClientMessageWrapper,
  ): ClientMessageWrapper {
    let wrapper: ClientMessageWrapper;
    if (msg instanceof ClientMessageWrapper) {
      wrapper = msg;
    } else {
      wrapper = new ClientMessageWrapper(msg);
    }

    if (this.isClosing) {
      this.clientLog.warn('Closing, drop message.');
      wrapper.rejectResponse(new Error('Socket is closing or closed'));
      return wrapper;
    }

    this.msgs.onSend(wrapper);

    try {
      const bytes = ClientMessageDto.encode(wrapper.msg).finish();
      this.clientLog.debug('Send', wrapper.msg);
      this.ws.send(bytes);
    } catch (e) {
      this.clientLog.error('Failed to encode/send message', e);
      wrapper.rejectResponse(e);
    }

    return wrapper;
  }

  public close(): void {
    this.ws.close();
  }

  private async waitHeartBeat(msg: ClientMessageWrapper): Promise<void> {
    const heartBeatId = -(msg.msg.id ?? 0);
    const startTime = Date.now();
    let reply: ITwoWayHeartBeatMsg | undefined;
    try {
      const resp = await msg.waitResponse();
      reply = resp.serverMsg?.heartBeatMsg ?? undefined;
    } catch (e) {
      if (e instanceof TimeoutError) {
        this.clientLog.info(`Heartbeat ${heartBeatId} timeout`);
        this._ping = -1;
        this.onPingUpdated.emit(-1);
        this.close();
        return;
      }
      if (this.isClosing) {
        this.clientLog.debug(
          `Heartbeat ${heartBeatId} failed during close:`,
          e,
        );
      } else {
        this.clientLog.error(`Heartbeat error`, e);
      }
      this._ping = -1;
      this.onPingUpdated.emit(-1);
      return;
    }
    if (!reply) {
      this.clientLog.warn(`Heartbeat ${heartBeatId} reply is not a heartbeat`);
      return;
    }
    const ping = Date.now() - startTime;
    this._ping = ping;
    this.onPingUpdated.emit(ping);

    this.msgs.maxServerMsgId = Math.max(
      this.msgs.maxServerMsgId,
      reply.maxId ?? 0,
    );
    if (reply.requestingIds) {
      const missing = this.msgs.getClientMsgs(reply.requestingIds);
      missing.forEach((m) => this.send(m));
    }
  }

  private async heartBeatLoop(): Promise<void> {
    while (this.isConnected) {
      await sleep(WS_HEARTBEAT_INTERVAL);
      if (this.isClosing) {
        break;
      }
      const heartBeatMsg: ITwoWayHeartBeatMsg = {
        maxId: this.msgs.maxMsgId,
      };
      const missing = this.msgs.getMissingServerMsgIds();
      if (missing) {
        heartBeatMsg.requestingIds = missing;
      }
      const dto: IClientMessageDto = {
        id: this.msgs.nextHeartBeatId,
        clientMsg: {
          heartBeatMsg,
        },
      };
      void this.waitHeartBeat(this.send(dto));
    }
  }

  public async handShake(
    onUserInfoLoaded: (userInfo: IUserInfoResponse) => void,
  ): Promise<void> {
    await this.waitOpen;

    return new Promise<void>((resolve, reject) => {
      // The server is the single source of truth for version compatibility: it
      // pushes a versionCheckMsg on EVERY connection (public and authenticated)
      // and closes the socket unless we reply with a supported version. We
      // validate that push here so an incompatible/old server fails with a clear
      // error. If the server never sends it, the WS connect timeout applies.
      const listener = (msg: IServerMessageDto) => {
        const versionCheck = msg.serverMsg?.versionCheckMsg;
        if (!versionCheck) {
          return;
        }
        if (!isServerSupported(versionCheck)) {
          this.close();
          this.onMessage.unsubscribe(listener);
          return reject(
            new Error(
              `${i18n.t('connect.serverVersionUnsupported')}: ${versionErrorReason(
                versionCheck,
              )}`,
            ),
          );
        }
        this.send({
          clientMsg: {
            versionCheckMsg: {
              client: CLIENT_NAME,
              clientVersion: Version.CLIENT_VERSION.toJSON(),
              minServerVersion: Version.MIN_SERVER_VERSION.toJSON(),
            },
          },
          respondTo: msg.id ?? null,
        });
        void this.heartBeatLoop();
        this.onMessage.unsubscribe(listener);
        resolve();
      };

      this.onMessage.subscribe(listener);

      // Public connections (e.g. replay viewing) only do the version handshake
      // above; authenticated connections additionally sign in.
      const accessToken = this.accessToken;
      if (!accessToken) {
        return;
      }

      try {
        const signIn = this.send(
          new ClientMessageWrapper({
            id: this.msgs.nextHeartBeatId,
            clientRequest: {
              signIn: {
                accessToken,
              },
            },
          }),
        );
        signIn
          .waitResponse()
          .then((resp) => {
            const error = resp.serverResp?.serverError;
            if (error) {
              this.clientLog.error('Sign in rejected', error);
              this.close();
              this.onMessage.unsubscribe(listener);
              return reject(new Error(`Sign in failed: ${error.message}`));
            }
            if (resp.serverResp?.userInfo) {
              onUserInfoLoaded(resp.serverResp.userInfo);
            }
          })
          .catch((e) => {
            this.onMessage.unsubscribe(listener);
            reject(e instanceof Error ? e : new Error(String(e)));
          });
      } catch (e) {
        this.onMessage.unsubscribe(listener);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }

  private handleMessage(ev: Event): void {
    // Typed as the generic Event so the handler is assignable to the
    // platform-agnostic EventListener; the binary payload lives on `.data`
    // for both browser MessageEvent and the `ws` package's message event.
    const data = (ev as { data?: unknown }).data;
    if (!(data instanceof ArrayBuffer)) {
      this.serverLog.error('Received non-binary message', data);
      return;
    }
    let dto: IServerMessageDto;
    try {
      dto = ServerMessageDto.decode(new Uint8Array(data));
    } catch (e) {
      this.serverLog.error('Invalid data received', e);
      return;
    }
    this.serverLog.debug('Receive', dto);
    this.msgs.onReceive(dto);
  }

  private handleClose(): void {
    this.clientLog.info('Connection closed');
    this.msgs.onClose();
  }

  private handleError(ev: Event): void {
    this.clientLog.error('WebSocket error', ev);
  }
}
