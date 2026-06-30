import { Logger, NetworkError, AuthError, RabiEvent } from '../lib';
import { RabiSocket } from '../transport/rabiSocket';
import {
  createUser,
  getUserInfo,
  createRoom,
  joinRoom,
  addAi,
} from './requests';
import { UserStatus, AiType } from '../proto';
import type {
  IUserInfoResponse,
  IEventMsg,
  IServerRoomStateMsg,
  ISinglePlayerInquiryMsg,
  IGameConfigMsg,
} from '../proto';
import type { PlayerModel, RoomModel } from '../domain/model';
import { MessagePump } from './messagePump';
import { DEFAULT_ACTION_TIMEOUT } from '../domain/constants';
import { applyEvent, applyRoomState } from '../domain/reducer';
import {
  type MappedInquiry,
  mapInquiry,
  type ActionOption,
  encodeInquiryResponse,
} from '../domain/inquiry';
import { type YakuInfo, YAKUS } from '../domain/yakus';
import {
  updateRoom as sendUpdateRoom,
  respondInquiry as sendRespondInquiry,
} from './messages';

const URL_STORE_KEY = 'rabiriichi_url';
const TOKEN_STORE_KEY = 'rabiriichi_token';

function getPublicWSUrl(baseUrl: string): string {
  // Support relative URLs or ensure proper absolute URL
  try {
    return new URL('/ws/public', baseUrl).href;
  } catch {
    // If baseUrl is not absolute, try to construct it assuming ws:// or wss://
    if (!baseUrl.startsWith('ws://') && !baseUrl.startsWith('wss://')) {
      baseUrl = 'ws://' + baseUrl;
    }
    return new URL('/ws/public', baseUrl).href;
  }
}

function getUserWSUrl(baseUrl: string): string {
  try {
    return new URL('/ws/connect', baseUrl).href;
  } catch {
    if (!baseUrl.startsWith('ws://') && !baseUrl.startsWith('wss://')) {
      baseUrl = 'ws://' + baseUrl;
    }
    return new URL('/ws/connect', baseUrl).href;
  }
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface ActiveInquiry {
  messageId: number;
  mapped: MappedInquiry;
  original: ISinglePlayerInquiryMsg;
}

export class RabiRiichiClient {
  private readonly logger = new Logger('RabiRiichiClient');
  private readonly messagePump = new MessagePump();

  public wsurl: string | null = null;
  public accessToken: string | null = null;
  public self: PlayerModel | null = null;
  public room: RoomModel | null = null;
  private _ws: RabiSocket | null = null;

  public connectionStatus: ConnectionStatus = 'disconnected';
  public currentInquiry: ActiveInquiry | null = null;
  public ping = -1;
  private readonly pingListener = (ping: number) =>
    this.handlePingUpdated(ping);
  public readonly onChange = new RabiEvent<void>();
  public availableYakus: YakuInfo[] = YAKUS;

  public isRiichiSelectMode = false;
  public pendingActionOption: ActionOption | null = null;
  public animationSpeed = 1.0;
  public isWaitingForProceed = false;

  public selectedTileTraceId: number | null = null;
  public isCameraLocked = true;

  public selectTile(traceId: number | null): void {
    this.selectedTileTraceId = traceId;
    this.onChange.emit();
  }

  public toggleCameraLock(): void {
    this.isCameraLocked = !this.isCameraLocked;
    this.onChange.emit();
  }

  public actionTimeout = 0;
  public timerActiveSeat: number | null = null;
  private actionTimerId: ReturnType<typeof setInterval> | null = null;

  public setAnimationSpeed(speed: number): void {
    this.animationSpeed = speed;
    this.onChange.emit();
  }

  // Backdoor for development and testing helpers (e.g. replay driver, test mocks)
  public readonly dev = {
    setConnectionStatus: (newStatus: ConnectionStatus) =>
      this.setConnectionStatus(newStatus),
    setSelf: (newSelf: PlayerModel | null) => {
      this.self = newSelf;
      this.onChange.emit();
    },
    setRoom: (newRoom: RoomModel | null) => {
      this.room = newRoom;
      this.onChange.emit();
    },
    handleGameEvent: (eventMsg: IEventMsg) => this.handleGameEvent(eventMsg),
    setWaitingForProceed: (waiting: boolean) => {
      this.isWaitingForProceed = waiting;
      this.onChange.emit();
    },
  };

  public constructor() {
    this.messagePump.subscribeRoomState(this.handleRoomState.bind(this));
    this.messagePump.subscribeGameEvent(this.handleGameEvent.bind(this));
    this.messagePump.subscribeInquiry(this.handleInquiry.bind(this));
  }

  public get ws(): RabiSocket | null {
    return this._ws;
  }

  public get selfSeat(): number | undefined {
    if (!this.room || !this.self) return undefined;
    const me = this.room.players.find((p) => p.id === this.self?.id);
    return me?.seat;
  }

  public async connect(url: string, accessToken?: string): Promise<void> {
    this.wsurl = url;
    this.accessToken = accessToken ?? null;
    this.self = null;
    this.room = null;
    this.currentInquiry = null;
    this.setConnectionStatus('connecting');
    try {
      await this.connectWS();
    } catch (e) {
      this.setConnectionStatus('disconnected');
      throw e;
    }
  }

  private storeCredentials(): void {
    if (typeof localStorage !== 'undefined') {
      if (this.wsurl) localStorage.setItem(URL_STORE_KEY, this.wsurl);
      if (this.accessToken)
        localStorage.setItem(TOKEN_STORE_KEY, this.accessToken);
    }
  }

  private setConnectionStatus(newStatus: typeof this.connectionStatus): void {
    if (this.connectionStatus !== newStatus) {
      this.connectionStatus = newStatus;
      this.onChange.emit();
    }
  }

  private async connectWS(): Promise<void> {
    if (!this.wsurl) {
      throw new NetworkError('No WS URL configured');
    }
    if (this._ws) {
      this._ws.close();
    }
    this.setConnectionStatus('connecting');
    this._ws = this.accessToken
      ? new RabiSocket(getUserWSUrl(this.wsurl), this.accessToken)
      : new RabiSocket(getPublicWSUrl(this.wsurl));

    try {
      await this._ws.handShake(this.updateUserInfo.bind(this));
      this.messagePump.attach(this._ws);
      this.storeCredentials();
      this._ws.onPingUpdated.subscribe(this.pingListener);
      this.ping = this._ws.ping;
      this.setConnectionStatus('connected');

      const ws = this._ws;
      void ws.waitClose.then(() => {
        if (this._ws === ws) {
          this.setConnectionStatus('disconnected');
          this.handlePingUpdated(-1);
        }
      });
    } catch (e) {
      this.setConnectionStatus('disconnected');
      throw e;
    }
  }

  public async getWSClient(needAuth = false): Promise<RabiSocket> {
    if (
      !this._ws ||
      this._ws.isClosing ||
      (needAuth && !this._ws.accessToken)
    ) {
      if (needAuth && !this.accessToken) {
        throw new AuthError(
          'No access token, cannot create authenticated WS client',
        );
      }
      this.logger.info(
        `Recreating WS client. Authenticated: ${Boolean(this.accessToken)}`,
      );
      try {
        await this.connectWS();
      } catch (e) {
        this.logger.error(`Failed to connect WS`, e);
        if (needAuth || !this.accessToken) {
          throw e;
        }
        // Auth was optional and failed: drop the token and retry as a public
        // (unauthenticated) connection.
        this.accessToken = null;
        await this.connectWS();
      }
    }
    const ws = this._ws;
    if (!ws) {
      throw new Error('WS client unexpectedly missing after connect');
    }
    await ws.waitOpen;
    return ws;
  }

  private handlePingUpdated(ping: number): void {
    if (this.ping !== ping) {
      this.ping = ping;
      this.onChange.emit();
    }
  }

  private updateUserInfo(userInfo: IUserInfoResponse): void {
    this.self = {
      id: userInfo.id ?? -1,
      nickname: userInfo.nickname ?? '',
      status: userInfo.status ?? 0,
      gameState: null,
      aiType: AiType.AI_TYPE_NONE,
    };
    if (userInfo.room) {
      this.handleRoomState(userInfo.room);
    } else {
      this.room = null;
    }
    this.onChange.emit();
  }

  private handleRoomState(roomState: IServerRoomStateMsg): void {
    this.room = applyRoomState(this.room, roomState);
    this.logger.info(`Room state updated: ${this.room?.id}`);
    this.onChange.emit();
  }

  private handleGameEvent(gameEvent: IEventMsg): void {
    if (!this.room) {
      this.logger.warn('Received game event but not in a room');
      return;
    }
    this.room = applyEvent(this.room, gameEvent);
    this.logger.info(
      `Game event applied. Current player: ${this.room.info?.currentPlayer}`,
    );

    if (!gameEvent.syncGameStateEvent) {
      this.currentInquiry = null;
      this.isRiichiSelectMode = false;
      this.pendingActionOption = null;
      this.selectedTileTraceId = null;
    }

    const configTimeout =
      this.room.config?.gameplayActionTimeout ?? DEFAULT_ACTION_TIMEOUT;
    const visualTimeout = configTimeout;

    if (gameEvent.drawTileEvent) {
      this.startTimer(
        gameEvent.drawTileEvent.playerId ?? 0,
        visualTimeout,
        false,
      );
    } else if (gameEvent.dealerFirstTurnEvent) {
      this.startTimer(this.room.info?.dealer ?? 0, visualTimeout, false);
    } else if (gameEvent.claimTileEvent) {
      this.startTimer(
        gameEvent.claimTileEvent.playerId ?? 0,
        visualTimeout,
        false,
      );
    } else if (gameEvent.discardTileEvent) {
      this.clearTimer();
    } else if (gameEvent.endInquiryEvent) {
      const playerId = gameEvent.endInquiryEvent.playerId;
      if (this.selfSeat !== undefined && playerId === this.selfSeat) {
        this.currentInquiry = null;
        this.isRiichiSelectMode = false;
        this.pendingActionOption = null;
        this.clearTimer();
      }
    }
    this.onChange.emit();
  }

  private handleInquiry(
    inquiry: ISinglePlayerInquiryMsg,
    respondTo: number,
  ): void {
    this.isRiichiSelectMode = false;
    this.pendingActionOption = null;
    this.currentInquiry = {
      messageId: respondTo,
      mapped: mapInquiry(inquiry),
      original: inquiry,
    };
    this.logger.info(`Received inquiry ${respondTo}`);
    const configTimeout =
      this.room?.config?.gameplayActionTimeout ?? DEFAULT_ACTION_TIMEOUT;
    const fallbackTimeout = configTimeout;
    const serverTimeout =
      inquiry.timeoutSeconds && inquiry.timeoutSeconds > 0
        ? inquiry.timeoutSeconds
        : fallbackTimeout;

    if (serverTimeout > 0) {
      this.startTimer(this.selfSeat ?? 0, serverTimeout, true);
    } else {
      this.clearTimer();
    }
    this.onChange.emit();

    this.maybeAutoAckNextRound();
  }

  /**
   * After a reconnect the server re-pushes the pending next-round acknowledgement
   * inquiry, but the sync snapshot does not carry the finished round's result, so
   * we cannot faithfully redraw the result screen. In that case auto-acknowledge
   * the next round: the UI shows a brief "waiting" notice and the correct hand
   * appears once the next round is dealt.
   *
   * We only auto-ack when this is purely a next-round inquiry AND no player has an
   * in-memory agari result (i.e. we reconnected instead of playing through the
   * win); during live play the result screen is shown and the player advances it.
   */
  private maybeAutoAckNextRound(): void {
    const inquiry = this.currentInquiry;
    if (!inquiry) return;

    const { buttons } = inquiry.mapped;
    const isNextRoundOnly =
      buttons.length === 1 && buttons[0]?.type === 'next-round';
    if (!isNextRoundOnly) return;

    const hasInMemoryResult =
      this.room?.players.some((p) => p.gameState?.agari) ?? false;
    if (hasInMemoryResult) return;

    this.logger.info('Auto-acknowledging next round after reconnect.');
    const nextRound = buttons[0];
    if (nextRound) {
      void this.submitInquiryResponse(nextRound);
    }
  }

  public async registerUser(nickname: string): Promise<void> {
    this.logger.info(`Registering user: ${nickname}`);
    const client = await this.getWSClient();
    const resp = await createUser(client, nickname);
    this.logger.info(`Registration succeeded`, resp);

    this.self = {
      id: resp.id ?? -1,
      nickname: nickname,
      status: UserStatus.USER_STATUS_NONE,
      gameState: null,
      aiType: AiType.AI_TYPE_NONE,
    };
    this.accessToken = resp.accessToken ?? null;
    await this.connectWS();
  }

  public async refreshMyInfo(): Promise<void> {
    this.logger.info('Refreshing current user info');
    const client = await this.getWSClient(true);
    const resp = await getUserInfo(client);
    this.logger.info(`Retrieved user information`, resp);
    this.updateUserInfo(resp);
  }

  public async createRoom(config?: IGameConfigMsg): Promise<void> {
    this.logger.info('Creating room', config);
    const client = await this.getWSClient(true);
    const resp = await createRoom(client, config);
    if (resp.state) {
      this.handleRoomState(resp.state);
    }
  }

  public async joinRoom(roomId: number): Promise<void> {
    this.logger.info(`Joining room: ${roomId}`);
    const client = await this.getWSClient(true);
    const resp = await joinRoom(client, roomId);
    if (resp.state) {
      this.handleRoomState(resp.state);
    }
  }

  public async addAi(type: AiType): Promise<void> {
    this.logger.info(`Adding AI to room: ${type}`);
    const client = await this.getWSClient(true);
    const resp = await addAi(client, type);
    if (resp.state) {
      this.handleRoomState(resp.state);
    }
  }

  public async updateRoom(userStatus: UserStatus): Promise<void> {
    this.logger.info(`Updating room status: ${userStatus}`);
    const client = await this.getWSClient(true);
    sendUpdateRoom(client, userStatus);
  }

  public setRiichiSelectMode(active: boolean): void {
    this.isRiichiSelectMode = active;
    this.onChange.emit();
  }

  public setPendingActionOption(option: ActionOption | null): void {
    this.pendingActionOption = option;
    this.onChange.emit();
  }

  public async submitInquiryResponse(
    action: ActionOption,
    choice?: number,
  ): Promise<void> {
    if (!this.currentInquiry) return;
    this.clearTimer();
    const responseDto = encodeInquiryResponse(
      this.currentInquiry.original,
      action,
      choice,
    );
    await this.respondInquiry(
      this.currentInquiry.messageId,
      responseDto.index,
      responseDto.response,
    );
  }

  public async respondInquiry(
    respondTo: number,
    index: number,
    responseJson: string,
  ): Promise<void> {
    this.logger.info(`Responding to inquiry ${respondTo} with option ${index}`);
    const client = await this.getWSClient(true);
    sendRespondInquiry(client, respondTo, index, responseJson);
    if (this.currentInquiry?.messageId === respondTo) {
      this.currentInquiry = null;
      this.isRiichiSelectMode = false;
      this.pendingActionOption = null;
      this.selectedTileTraceId = null;
      this.onChange.emit();
    }
  }

  public close(): void {
    this.messagePump.detach();
    if (this._ws) {
      this._ws.onPingUpdated.unsubscribe(this.pingListener);
      this._ws.close();
      this._ws = null;
    }
    this.self = null;
    this.room = null;
    this.currentInquiry = null;
    this.isRiichiSelectMode = false;
    this.pendingActionOption = null;
    this.selectedTileTraceId = null;
    this.clearTimer();
    this.ping = -1;
    this.setConnectionStatus('disconnected');
  }

  public logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(URL_STORE_KEY);
      localStorage.removeItem(TOKEN_STORE_KEY);
    }
    this.accessToken = null;
    this.wsurl = null;
    this.close();
  }
  private startTimer(
    seat: number,
    seconds: number,
    interactive: boolean,
  ): void {
    this.clearTimer();
    this.timerActiveSeat = seat;
    this.actionTimeout = seconds;
    this.onChange.emit();

    const tick = 0.1; // 100ms in seconds
    this.actionTimerId = setInterval(() => {
      this.actionTimeout = Math.round((this.actionTimeout - tick) * 10) / 10;
      if (this.actionTimeout <= 0) {
        this.clearTimer();
        if (interactive) {
          this.logger.info(
            'Inquiry timeout reached. Auto-submitting default action.',
          );
          this.autoSubmitDefaultAction();
        }
      } else {
        const prevSec = Math.ceil(this.actionTimeout + tick);
        const currSec = Math.ceil(this.actionTimeout);
        if (prevSec !== currSec) {
          this.onChange.emit();
        }
      }
    }, tick * 1000);
  }

  private clearTimer(): void {
    if (this.actionTimerId) {
      clearInterval(this.actionTimerId);
      this.actionTimerId = null;
    }
    this.actionTimeout = 0;
    this.timerActiveSeat = null;
    this.onChange.emit();
  }

  private autoSubmitDefaultAction(): void {
    if (!this.currentInquiry) return;
    try {
      const mapped = this.currentInquiry.mapped;

      if (mapped.playTile) {
        const seat = this.selfSeat ?? 0;
        const pendingTile = this.room?.players.find((p) => p.seat === seat)
          ?.gameState?.hand.pendingTile;
        if (
          pendingTile?.traceId !== undefined &&
          pendingTile?.traceId !== null
        ) {
          const playTileAction: ActionOption = {
            type: 'play-tile',
            label: '打',
            actionIndex: mapped.playTile.actionIndex,
            legalTiles: mapped.playTile.legalTiles,
          };
          void this.submitInquiryResponse(playTileAction, pendingTile.traceId);
          return;
        } else {
          const freeTiles =
            this.room?.players.find((p) => p.seat === seat)?.gameState?.hand
              .freeTiles ?? [];
          if (freeTiles.length > 0) {
            const lastTile = freeTiles[freeTiles.length - 1];
            if (lastTile?.traceId !== undefined && lastTile?.traceId !== null) {
              const playTileAction: ActionOption = {
                type: 'play-tile',
                label: '打',
                actionIndex: mapped.playTile.actionIndex,
                legalTiles: mapped.playTile.legalTiles,
              };
              void this.submitInquiryResponse(playTileAction, lastTile.traceId);
              return;
            }
          }
        }
      }

      const skipAction = mapped.buttons.find(
        (b) => b.type === 'skip' || b.type === 'ryuukyoku',
      );
      if (skipAction) {
        void this.submitInquiryResponse(skipAction);
        return;
      }

      const firstButton = mapped.buttons[0];
      if (firstButton) {
        void this.submitInquiryResponse(firstButton);
      }
    } catch (err) {
      this.logger.error('Failed to auto-submit default action:', err);
    }
  }
}

export const rabiriichi = new RabiRiichiClient();

export async function initRabiRiichi(): Promise<void> {
  if (typeof localStorage === 'undefined') {
    return;
  }
  const url = localStorage.getItem(URL_STORE_KEY);
  const token = localStorage.getItem(TOKEN_STORE_KEY);
  if (!url || !token) {
    return;
  }
  const logger = new Logger('AutoReconnect');
  logger.info(`Auto-reconnecting to server: ${url}, token: ${token}`);
  try {
    await rabiriichi.connect(url, token);
    logger.info(`Auto-reconnection succeeded! Connected to ${url}`);
  } catch (err) {
    logger.error(`Auto-reconnection failed for URL ${url}`, err);
    // Silent fail on auto-connect
  }
}
