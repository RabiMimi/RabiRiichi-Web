import {
  Logger,
  NetworkError,
  AuthError,
  StateError,
  RabiEvent,
  waitTimeout,
} from '../lib';
import { RabiSocket } from '../transport/rabiSocket';
import { WS_CONNECT_TIMEOUT } from '../transport/constants';
import { DEFAULT_SERVERS } from '../config/servers';
import {
  type ClientPlatform,
  type GameSoundPlayer,
  type TranslateFn,
  createClientPlatform,
} from '../platform';
import { getPublicWSUrl, getUserWSUrl } from './wsUrl';
import { CredentialStore, type ServerCredentials } from './credentialStore';
import { soundEffectForEvent } from './eventSound';
import {
  createUser,
  getUserInfo,
  createRoom,
  joinRoom,
  addAi,
  removeRoomPlayer,
  getReplay,
  loginUser,
  getInfo,
  updateProfile,
  changePassword,
} from './requests';
import { UserStatus, AiType } from '../proto';
import type {
  IUserInfoResponse,
  IEventMsg,
  IServerRoomStateMsg,
  ISinglePlayerInquiryMsg,
  IGameConfigMsg,
  IGameLogMsg,
  IPlayerChatMessage,
  ILlmAiConfig,
  IServerMessageDto,
} from '../proto';
import type { PlayerModel, RoomModel, MappedTenpaiInfo } from '../domain/model';
import {
  applyRiichiBonusToWaits,
  getPlayerDisplayName,
  riichiBonusHan,
} from '../domain/model';
import { CHARACTERS, getCharacterVoiceUrl } from '../domain/character';
import {
  createGameVoiceState,
  getGameVoiceSpeakerSeat,
  reduceGameVoice,
  type GameVoiceState,
} from '../domain/gameVoice';
import { MessagePump } from './messagePump';
import {
  DEFAULT_ACTION_TIMEOUT,
  INQUIRY_DEFAULT_INDEX,
  RESULT_ANIMATION_DURATION_MS,
  type ClientSettings,
  type ServerSettings,
} from '../domain/constants';
import { VisualsSettings, SoundsSettings } from '../domain/settings';
import { applyEvent, applyRoomState } from '../domain/reducer';
import {
  displayedSecondChanged,
  monotonicNow,
  remainingSeconds,
  shouldSoundUrgency,
} from '../domain/countdown';
import {
  type MappedInquiry,
  mapInquiry,
  type ActionOption,
  encodeInquiryResponse,
  getAutoResponse,
} from '../domain/inquiry';
import {
  buildTileSetCounts,
  collectVisibleTileKindsFromRoom,
} from '../domain/tenpai';
import { type YakuInfo, YAKUS } from '../domain/yakus';
import {
  updateRoom as sendUpdateRoom,
  respondInquiry as sendRespondInquiry,
} from './messages';
import { SOUND_EFFECTS } from '../lib/soundEffects';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface ChatHistoryEntry {
  id: string;
  senderId: number;
  /** Processed display name at send time (AI sentinels already resolved). */
  senderName: string;
  text?: string | null;
  sticker?: string | null;
  timestamp: number;
}

export interface ActiveInquiry {
  messageId: number;
  mapped: MappedInquiry;
  original: ISinglePlayerInquiryMsg;
}

export class RabiRiichiClient {
  private readonly logger = new Logger('RabiRiichiClient');
  private readonly messagePump = new MessagePump();
  private readonly platform: ClientPlatform;
  private readonly credentials: CredentialStore;

  public wsurl: string | null = null;
  public accessToken: string | null = null;
  /** Login username (distinct from the display nickname); persisted locally. */
  public username: string | null = null;
  public self: PlayerModel | null = null;
  public room: RoomModel | null = null;
  private _ws: RabiSocket | null = null;
  // Dedupes concurrent connect() calls for the same target (URL + token) so
  // that e.g. React StrictMode's dev-only double-invoke of an effect calling
  // connect() twice back-to-back doesn't spawn two WebSockets that each close
  // the other's socket via the shared `_ws` field below.
  private connectPromise: Promise<void> | null = null;
  private connectingKey: string | null = null;
  public disconnectReason: 'kicked' | null = null;
  private serverMessageListener: ((msg: IServerMessageDto) => void) | null =
    null;
  public autoConnectError: string | null = null;
  public autoConnectFailedUrl: string | null = null;

  public connectionStatus: ConnectionStatus = 'disconnected';
  public currentInquiry: ActiveInquiry | null = null;
  public ping = -1;
  private readonly pingListener = (ping: number) =>
    this.handlePingUpdated(ping);
  public readonly onChange = new RabiEvent<void>();
  public availableYakus: YakuInfo[] = YAKUS;
  public activeStickers: Record<string, string> = {};
  private stickerTimers = new Map<number, ReturnType<typeof setTimeout>>();
  public activeChatTexts: Record<number, string> = {};
  private chatTextTimers = new Map<number, ReturnType<typeof setTimeout>>();
  public chatHistory: ChatHistoryEntry[] = [];
  private deferredChats: IPlayerChatMessage[] = [];
  public isShowingRoundResult = false;
  public isFinalResultScreen = false;

  public isRiichiSelectMode = false;
  public pendingActionOption: ActionOption | null = null;
  public animationSpeed = 1.0;
  public visuals = new VisualsSettings();
  public sounds = new SoundsSettings();
  public isWaitingForProceed = false;

  public autoAgari = false;
  public noCalls = false;
  public autoDiscard = false;
  public autoNuki = false;
  public isSettingsOpen = false;

  public setSettingsOpen(isOpen: boolean): void {
    this.isSettingsOpen = isOpen;
    this.onChange.emit();
  }

  public toggleAutoAgari(): void {
    this.autoAgari = !this.autoAgari;
    this.onChange.emit();
    this.maybeAutoRespond();
  }

  public toggleNoCalls(): void {
    this.noCalls = !this.noCalls;
    this.onChange.emit();
    this.maybeAutoRespond();
  }

  public toggleAutoDiscard(): void {
    this.autoDiscard = !this.autoDiscard;
    this.onChange.emit();
    this.maybeAutoRespond();
  }

  public toggleAutoNuki(): void {
    this.autoNuki = !this.autoNuki;
    this.onChange.emit();
    this.maybeAutoRespond();
  }
  public isReplay = false;
  public isReplayPaused = false;
  public replayProgress = 0;
  public replayTotal = 0;

  public selectedTileTraceId: number | null = null;
  public hoveredTileTraceId: number | null = null;
  public callHighlightTileIds: Set<number> | null = null;
  public isCameraLocked = true;
  public hasInMemoryResult = false;

  public selectTile(traceId: number | null): void {
    this.selectedTileTraceId = traceId;
    this.onChange.emit();
  }

  public hoverTile(traceId: number | null): void {
    this.hoveredTileTraceId = traceId;
    this.onChange.emit();
  }

  public setCallHighlight(traceIds: Set<number> | null): void {
    this.callHighlightTileIds = traceIds;
    this.onChange.emit();
  }

  public toggleCameraLock(): void {
    this.isCameraLocked = !this.isCameraLocked;
    this.onChange.emit();
  }

  public actionTimeout = 0;
  public timerActiveSeat: number | null = null;
  private actionTimerId: ReturnType<typeof setInterval> | null = null;
  public resultAnimation: 'agari' | 'ryuukyoku' | null = null;
  private resultAnimationTimerId: ReturnType<typeof setTimeout> | null = null;
  private isDealingHand = false;
  private hasPlayedActionSequenceSound = false;
  private hasExitedGame = false;
  private gameVoiceState: GameVoiceState = createGameVoiceState();

  public updateClientSettings(patch: Partial<ClientSettings>): void {
    if (patch.animationSpeed !== undefined) {
      this.animationSpeed = patch.animationSpeed;
    }
    this.visuals.update(patch);
    this.sounds.update(patch);
    this.platform.sound.updateAllVolumes();

    this.onChange.emit();

    this.credentials.mergeClientSettings(patch);
  }

  public setAnimationSpeed(speed: number): void {
    this.updateClientSettings({ animationSpeed: speed });
  }

  /**
   * Swaps the sound player after construction. The web composition root uses
   * this to install the `howler`-backed player onto the shared singleton
   * (which defaults to no audio), keeping the audio engine out of the core.
   * Re-registers the volume provider so the new player honors current settings.
   */
  public setSoundPlayer(sound: GameSoundPlayer): void {
    this.platform.sound = sound;
    sound.setVolumeProvider(() => this.sounds);
    sound.updateAllVolumes();
    sound.preloadVoices(
      CHARACTERS.flatMap((character) =>
        character.voiceLines
          .map((line) => line.audioUrl)
          .filter((url) => !url.startsWith('data:')),
      ),
    );
  }

  /**
   * Installs a localizer after construction. Used to resolve AI display names
   * (e.g. "@llm:gemini" → "Gemibo") when caching chat sender names. Defaults to
   * the identity function so the core stays i18n-agnostic.
   */
  public setTranslate(translate: TranslateFn): void {
    this.platform.translate = translate;
  }

  // Backdoor for replay and testing helpers (e.g. replay driver, test mocks)
  public readonly replay = {
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
    handleGameEvent: (eventMsg: IEventMsg, skipDelay = false) =>
      this.handleGameEvent(eventMsg, skipDelay),
    setWaitingForProceed: (waiting: boolean) => {
      this.isWaitingForProceed = waiting;
      this.onChange.emit();
    },
    setIsReplay: (isReplay: boolean) => {
      this.isReplay = isReplay;
      this.onChange.emit();
    },
    setReplayPaused: (paused: boolean) => {
      this.isReplayPaused = paused;
      this.onChange.emit();
    },
    setReplayProgress: (progress: number) => {
      this.replayProgress = progress;
      this.onChange.emit();
    },
    setReplayTotal: (total: number) => {
      this.replayTotal = total;
      this.onChange.emit();
    },
    setHasInMemoryResult: (val: boolean) => {
      this.hasInMemoryResult = val;
      this.onChange.emit();
    },
  };

  /**
   * @param platform Host capabilities (socket, storage, sound, crypto). Omit to
   *   use the browser defaults (global WebSocket + localStorage + Web Crypto,
   *   no audio); web callers wanting sound pass a real sound player. A CLI host
   *   injects Node-backed implementations.
   */
  public constructor(platform?: Partial<ClientPlatform>) {
    this.platform = createClientPlatform(platform);
    this.credentials = new CredentialStore(this.platform.store);

    this.messagePump.subscribeRoomState(this.handleRoomState.bind(this));
    this.messagePump.subscribeGameEvent(this.handleGameEvent.bind(this));
    this.messagePump.subscribeInquiry(this.handleInquiry.bind(this));
    this.messagePump.subscribeChatMessage(this.handleChatMessage.bind(this));

    try {
      const settings = this.credentials.loadClientSettings();
      this.visuals = new VisualsSettings(settings);
      this.sounds = new SoundsSettings(settings);
      if (typeof settings.animationSpeed === 'number') {
        this.animationSpeed = settings.animationSpeed;
      }
    } catch (err) {
      this.logger.error('Failed to load client settings:', err);
    }
    this.platform.sound.setVolumeProvider(() => this.sounds);
  }

  public showStickerLocally(
    senderId: number,
    sticker: string,
    durationMs = 6000,
  ): void {
    const prevTimer = this.stickerTimers.get(senderId);
    if (prevTimer) {
      clearTimeout(prevTimer);
    }

    this.activeStickers = {
      ...this.activeStickers,
      [senderId]: sticker,
    };
    this.onChange.emit();

    const timer = setTimeout(() => {
      const next = { ...this.activeStickers };
      delete next[senderId];
      this.activeStickers = next;
      this.stickerTimers.delete(senderId);
      this.onChange.emit();
    }, durationMs);

    this.stickerTimers.set(senderId, timer);
  }

  public showChatTextLocally(
    senderId: number,
    text: string,
    durationMs = 6000,
  ): void {
    const prevTimer = this.chatTextTimers.get(senderId);
    if (prevTimer) {
      clearTimeout(prevTimer);
    }

    const trimmed = text.trim().slice(0, 300);
    if (!trimmed) return;

    this.activeChatTexts = {
      ...this.activeChatTexts,
      [senderId]: trimmed,
    };
    this.onChange.emit();

    const timer = setTimeout(() => {
      const next = { ...this.activeChatTexts };
      delete next[senderId];
      this.activeChatTexts = next;
      this.chatTextTimers.delete(senderId);
      this.onChange.emit();
    }, durationMs);

    this.chatTextTimers.set(senderId, timer);
  }

  public flushDeferredChats(durationMs?: number): void {
    this.isShowingRoundResult = false;
    const effectiveDuration =
      durationMs ?? (this.isFinalResultScreen ? 10000 : 6000);
    const toFlush = [...this.deferredChats];
    this.deferredChats = [];
    for (const msg of toFlush) {
      if (msg.senderId === null || msg.senderId === undefined) continue;
      if (msg.sticker) {
        this.showStickerLocally(msg.senderId, msg.sticker, effectiveDuration);
      }
      if (msg.text) {
        this.showChatTextLocally(msg.senderId, msg.text, effectiveDuration);
      }
    }
  }

  private handleChatMessage(msg: IPlayerChatMessage): void {
    if (msg.senderId === null || msg.senderId === undefined) {
      return;
    }
    const player = this.room?.players.find((p) => p.id === msg.senderId);
    // Cache the processed name so a later room-state snapshot can't revert it.
    const senderName = player
      ? getPlayerDisplayName(player, this.platform.translate)
      : `Player ${msg.senderId}`;
    const newEntry: ChatHistoryEntry = {
      id: `${Date.now()}-${Math.random()}`,
      senderId: msg.senderId,
      senderName,
      text: msg.text ?? null,
      sticker: msg.sticker ?? null,
      timestamp: Date.now(),
    };
    this.chatHistory = [...this.chatHistory, newEntry];

    // Retain up to 500 messages
    while (this.chatHistory.length > 500) {
      this.chatHistory.shift();
    }
    // Retain up to 16K characters
    const getHistoryChars = (list: ChatHistoryEntry[]) => {
      return list.reduce(
        (sum, item) =>
          sum + (item.text?.length ?? 0) + (item.sticker?.length ?? 0),
        0,
      );
    };
    while (
      this.chatHistory.length > 0 &&
      getHistoryChars(this.chatHistory) > 16384
    ) {
      this.chatHistory.shift();
    }

    if (this.isShowingRoundResult) {
      this.deferredChats.push(msg);
    } else {
      const durationMs = this.isFinalResultScreen ? 10000 : 6000;
      if (msg.sticker) {
        this.showStickerLocally(msg.senderId, msg.sticker, durationMs);
      }
      if (msg.text) {
        this.showChatTextLocally(msg.senderId, msg.text, durationMs);
      }
    }
    this.onChange.emit();
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
    const key = `${url}\u0000${accessToken ?? ''}`;
    if (this.connectPromise && this.connectingKey === key) {
      // Same target already connecting - piggyback instead of racing a
      // second attempt that would close this one out from under it.
      return this.connectPromise;
    }
    this.connectingKey = key;
    const promise = this.doConnect(url, accessToken);
    this.connectPromise = promise;
    try {
      await promise;
    } finally {
      if (this.connectPromise === promise) {
        this.connectPromise = null;
        this.connectingKey = null;
      }
    }
  }

  private async doConnect(url: string, accessToken?: string): Promise<void> {
    this.wsurl = url;
    this.accessToken = accessToken ?? null;
    this.self = null;
    this.room = null;
    this.chatHistory = [];
    this.currentInquiry = null;
    this.setConnectionStatus('connecting');
    await this.connectWS();
  }

  private storeCredentials(): void {
    if (this.wsurl) {
      this.credentials.saveLastUrl(this.wsurl);
      if (this.accessToken) {
        const oldCreds = this.credentials.loadCredentialsForServer(
          this.wsurl,
        ) ?? {
          token: '',
          username: '',
          nickname: '',
        };
        this.credentials.saveCredentialsForServer(this.wsurl, {
          token: this.accessToken,
          username: this.username ?? oldCreds.username,
          nickname:
            this.self?.nickname ??
            (oldCreds.nickname !== ''
              ? oldCreds.nickname
              : (this.username ?? '')),
        });
      }
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
      this.setConnectionStatus('disconnected');
      throw new NetworkError('No WS URL configured');
    }
    if (this._ws) {
      this._ws.close();
    }
    this.setConnectionStatus('connecting');
    const ws = this.accessToken
      ? new RabiSocket(
          getUserWSUrl(this.wsurl),
          this.accessToken,
          this.platform.socketFactory,
        )
      : new RabiSocket(
          getPublicWSUrl(this.wsurl),
          undefined,
          this.platform.socketFactory,
        );
    this._ws = ws;

    try {
      // Bound the open+handshake time. Without this, an unreachable server
      // leaves the browser socket in CONNECTING for minutes and the UI stuck
      // on "connecting". On timeout we close the doomed socket and reject.
      await waitTimeout(
        ws.handShake(this.updateUserInfo.bind(this)),
        WS_CONNECT_TIMEOUT,
      );
      if (this._ws !== ws) {
        // This connection was superseded by a newer one while handshaking
        ws.close();
        return;
      }
      this.messagePump.attach(ws);
      this.storeCredentials();
      ws.onPingUpdated.subscribe(this.pingListener);
      this.serverMessageListener = (msg: IServerMessageDto) => {
        const error = msg.serverResp?.serverError;
        if (error?.message === 'Logged in from another client') {
          this.disconnectReason = 'kicked';
          this.close();
        }
      };
      ws.onMessage.subscribe(this.serverMessageListener);
      this.ping = ws.ping;
      this.setConnectionStatus('connected');

      void ws.waitClose.then(() => {
        if (this._ws === ws) {
          this.setConnectionStatus('disconnected');
          this.handlePingUpdated(-1);
        }
      });
    } catch (e) {
      // Close the (possibly still-opening) socket so a late open/error event
      // from a timed-out connection can't resurrect stale state.
      ws.close();
      if (this._ws === ws) {
        this.setConnectionStatus('disconnected');
        this._ws = null;
      }
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
      nickname: userInfo.userData?.nickname ?? '',
      status: userInfo.status ?? 0,
      gameState: null,
      aiType: AiType.AI_TYPE_NONE,
    };
    if (userInfo.accessToken) {
      this.accessToken = userInfo.accessToken;
      this.storeCredentials();
    }
    this.autoConnectError = null;
    this.autoConnectFailedUrl = null;
    if (userInfo.room) {
      this.handleRoomState(userInfo.room);
    } else {
      this.room = null;
      this.chatHistory = [];
    }
    this.onChange.emit();
  }

  private handleRoomState(roomState: IServerRoomStateMsg): void {
    const oldRoomId = this.room?.id;
    this.room = applyRoomState(this.room, roomState);
    if (oldRoomId !== undefined && this.room && oldRoomId !== this.room.id) {
      this.chatHistory = [];
    }
    if (!this.room?.info) {
      this.clearTimer();
      this.platform.sound.stopEffect(SOUND_EFFECTS.game.timeoutWarning);
      this.hasPlayedActionSequenceSound = false;
      this.gameVoiceState = createGameVoiceState();
    }
    this.logger.info(`Room state updated: ${this.room?.id}`);
    this.onChange.emit();
  }

  private async handleGameEvent(
    gameEvent: IEventMsg,
    skipDelay = false,
  ): Promise<void> {
    if (!this.room) {
      this.logger.warn('Received game event but not in a room');
      return;
    }
    if (this.hasExitedGame && !gameEvent.beginGameEvent) {
      this.logger.info('Ignoring game event after leaving the game.');
      return;
    }
    if (gameEvent.beginGameEvent) {
      this.hasExitedGame = false;
      this.autoAgari = false;
      this.noCalls = false;
      this.autoDiscard = false;
      this.autoNuki = false;
      this.isDealingHand = true;
      this.hasPlayedActionSequenceSound = false;
    }
    this.playDealSoundIfNeeded(gameEvent);
    const roomBeforeEvent = this.room;
    this.room = applyEvent(this.room, gameEvent);
    this.logger.info(
      `Game event applied. Current player: ${this.room.info?.currentPlayer}`,
    );

    if (!gameEvent.syncGameStateEvent) {
      this.currentInquiry = null;
      this.isRiichiSelectMode = false;
      this.pendingActionOption = null;
      this.selectedTileTraceId = null;
      this.hoveredTileTraceId = null;
    }

    this.playGameEventSound(gameEvent);
    this.playGameEventVoice(gameEvent, roomBeforeEvent);

    const configTimeout =
      this.room.config?.gameplayActionTimeout ?? DEFAULT_ACTION_TIMEOUT;
    const visualTimeout = configTimeout;

    if (gameEvent.drawTileEvent) {
      this.hasPlayedActionSequenceSound = false;
      this.startTimer(
        gameEvent.drawTileEvent.playerId ?? 0,
        visualTimeout,
        false,
      );
    } else if (gameEvent.dealerFirstTurnEvent) {
      this.hasPlayedActionSequenceSound = false;
      this.startTimer(this.room.info?.dealer ?? 0, visualTimeout, false);
    } else if (gameEvent.claimTileEvent) {
      this.startTimer(
        gameEvent.claimTileEvent.playerId ?? 0,
        visualTimeout,
        false,
      );
    } else if (gameEvent.discardTileEvent) {
      this.hasPlayedActionSequenceSound = false;
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

    if (gameEvent.agariEvent) {
      this.isShowingRoundResult = true;
      this.startResultAnimation('agari');
      this.hasInMemoryResult = true;
    } else if (gameEvent.ryuukyokuEvent) {
      this.isShowingRoundResult = true;
      this.startResultAnimation('ryuukyoku');
      this.hasInMemoryResult = true;
    } else if (gameEvent.beginGameEvent) {
      // A new hand cancels any lingering result animation from the prior hand.
      this.clearResultAnimation();
      this.hasInMemoryResult = false;
      this.isShowingRoundResult = false;
      this.isFinalResultScreen = false;
      this.flushDeferredChats(6000);
    } else if (gameEvent.stopGameEvent) {
      this.isFinalResultScreen = true;
      this.hasInMemoryResult = false;
    } else if (gameEvent.syncGameStateEvent) {
      this.hasInMemoryResult = false;
    }

    this.onChange.emit();

    const delay = this.getEventDelay(gameEvent);
    if (delay > 0 && !skipDelay) {
      const isResult = Boolean(
        gameEvent.agariEvent ??
        gameEvent.ryuukyokuEvent ??
        gameEvent.concludeGameEvent,
      );
      const speed = isResult ? 1 : this.animationSpeed;
      await new Promise<void>((resolve) => {
        setTimeout(resolve, delay / speed);
      });
    }
  }

  private playGameEventSound(gameEvent: IEventMsg): void {
    const effect = soundEffectForEvent(gameEvent);
    if (effect) {
      this.platform.sound.playEffect(effect);
    }
  }

  private playGameEventVoice(
    gameEvent: IEventMsg,
    roomBeforeEvent: RoomModel,
  ): void {
    if (!this.room) return;
    const decision = reduceGameVoice(this.gameVoiceState, {
      event: gameEvent,
      before: roomBeforeEvent,
      after: this.room,
      selfSeat: this.selfSeat,
    });
    this.gameVoiceState = decision.state;
    if (!decision.voiceId) return;

    const url = getCharacterVoiceUrl(
      this.visuals.characterId,
      decision.voiceId,
    );
    if (url) {
      const speakerSeat =
        decision.speakerSeat ??
        getGameVoiceSpeakerSeat(gameEvent, this.selfSeat, decision.voiceId);
      const channel =
        speakerSeat === undefined ? 'game' : `game-player-${speakerSeat}`;
      this.platform.sound.playVoice(url, channel);
    }
  }

  private playDealSoundIfNeeded(gameEvent: IEventMsg): void {
    if (!gameEvent.dealHandEvent || !this.isDealingHand) return;

    this.isDealingHand = false;
    this.platform.sound.playEffect(SOUND_EFFECTS.game.deal);
  }

  private getEventDelay(eventMsg: IEventMsg): number {
    if (eventMsg.drawTileEvent || eventMsg.dealerFirstTurnEvent) {
      return 600;
    }
    if (eventMsg.claimTileEvent || eventMsg.kanEvent) {
      return 400;
    }
    if (eventMsg.agariEvent || eventMsg.ryuukyokuEvent) {
      return 3000;
    }
    if (eventMsg.dealHandEvent) {
      return 80;
    }
    return 0;
  }

  /**
   * Plays the end-of-hand result animation (agari/ryuukyoku) for a fixed
   * duration, after which the result panel is shown. The countdown timer for the
   * next-round ack is started independently (at inquiry time), so it keeps
   * running during the animation.
   */
  private startResultAnimation(type: 'agari' | 'ryuukyoku'): void {
    this.clearResultAnimation();
    this.resultAnimation = type;
    this.resultAnimationTimerId = setTimeout(() => {
      this.resultAnimationTimerId = null;
      this.resultAnimation = null;
      this.onChange.emit();
    }, RESULT_ANIMATION_DURATION_MS);
  }

  private clearResultAnimation(): void {
    if (this.resultAnimationTimerId !== null) {
      clearTimeout(this.resultAnimationTimerId);
      this.resultAnimationTimerId = null;
    }
    this.resultAnimation = null;
  }

  private handleInquiry(
    inquiry: ISinglePlayerInquiryMsg,
    respondTo: number,
  ): void {
    if (this.hasExitedGame) {
      this.logger.info('Ignoring inquiry after leaving the game.');
      return;
    }
    this.isRiichiSelectMode = false;
    this.pendingActionOption = null;
    this.currentInquiry = {
      messageId: respondTo,
      mapped: mapInquiry(
        inquiry,
        {
          visibleKinds: this.room
            ? collectVisibleTileKindsFromRoom(this.room)
            : [],
          tileSetCounts: buildTileSetCounts(this.room?.config),
        },
        this.selfSeat,
      ),
      original: inquiry,
    };
    this.logger.info(`Received inquiry ${respondTo}`);
    const isTurnInquiry = this.currentInquiry.mapped.playTile != null;
    const hasCallAction = this.currentInquiry.mapped.buttons.some(
      (button) =>
        button.type === 'chii' ||
        button.type === 'pon' ||
        button.type === 'kan',
    );
    if (!this.hasPlayedActionSequenceSound) {
      if (hasCallAction) {
        this.platform.sound.playEffect(SOUND_EFFECTS.game.call);
        this.hasPlayedActionSequenceSound = true;
      } else if (isTurnInquiry) {
        this.platform.sound.playEffect(SOUND_EFFECTS.game.turn);
        this.hasPlayedActionSequenceSound = true;
      }
    }
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

    if (!this.maybeAutoAckNextRound()) {
      this.maybeAutoRespond();
    }
  }

  private maybeAutoRespond(): void {
    const inquiry = this.currentInquiry;
    if (!inquiry) return;

    // 1. Check autoAgari (Ron or Tsumo)
    if (this.autoAgari) {
      const agariOpt = inquiry.mapped.buttons.find((b) => b.type === 'agari');
      if (agariOpt) {
        this.logger.info(`Auto Agari triggered: auto-responding with Agari`);
        void this.submitInquiryResponse(agariOpt, undefined);
        return;
      }
    }

    // 2. Check autoNuki (automatically nuki dora if no agari option)
    if (this.autoNuki) {
      const nukiOpt = inquiry.mapped.buttons.find((b) => b.type === 'nukidora');
      const hasAgari = inquiry.mapped.buttons.some((b) => b.type === 'agari');
      if (nukiOpt && !hasAgari) {
        this.logger.info(`Auto Nuki triggered: auto-responding with Nukidora`);
        void this.submitInquiryResponse(nukiOpt, nukiOpt.choiceIndex);
        return;
      }
    }

    // 3. Check noCalls (never call tiles from other players. Skip if only calls + skip are present)
    if (this.noCalls) {
      const playTileAction = inquiry.mapped.playTile;
      if (!playTileAction) {
        const hasCalls = inquiry.mapped.buttons.some(
          (b) => b.type === 'chii' || b.type === 'pon' || b.type === 'kan',
        );
        const hasAgari = inquiry.mapped.buttons.some((b) => b.type === 'agari');
        const skipOpt = inquiry.mapped.buttons.find((b) => b.type === 'skip');
        if (hasCalls && !hasAgari && skipOpt) {
          this.logger.info(`No Calls active: auto-skipping call options`);
          void this.submitInquiryResponse(skipOpt, undefined);
          return;
        }
      }
    }

    // 4. Check autoDiscard (auto discard drawn tile if only play-tile is available, i.e. no buttons)
    if (this.autoDiscard) {
      const playTileAction = inquiry.mapped.playTile;
      if (playTileAction && inquiry.mapped.buttons.length === 0) {
        const me = this.room?.players.find((p) => p.id === this.self?.id);
        const drawnTileId = me?.gameState?.hand.pendingTile?.traceId;
        if (drawnTileId && playTileAction.legalTiles.includes(drawnTileId)) {
          this.logger.info(
            `Auto Discard active: auto-discarding drawn tile ${drawnTileId}`,
          );
          const option: ActionOption = {
            type: 'play-tile',
            label: '打',
            actionIndex: playTileAction.actionIndex,
            legalTiles: playTileAction.legalTiles,
            ...(playTileAction.candidates
              ? { candidates: playTileAction.candidates }
              : {}),
          };
          void this.submitInquiryResponse(option, drawnTileId);
          return;
        }
      }
    }

    const response = getAutoResponse(inquiry.mapped);
    if (response) {
      this.logger.info(
        `Auto-responding to single-choice inquiry: ${JSON.stringify(response)}`,
      );
      void this.submitInquiryResponse(response.action, response.choice);
    }
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
  private maybeAutoAckNextRound(): boolean {
    const inquiry = this.currentInquiry;
    if (!inquiry) return false;

    const { buttons } = inquiry.mapped;
    const isNextRoundOnly =
      buttons.length === 1 && buttons[0]?.type === 'next-round';
    if (!isNextRoundOnly) return false;

    const hasInMemoryResult = this.hasInMemoryResult;
    if (hasInMemoryResult) return false;

    this.logger.info('Auto-acknowledging next round after reconnect.');
    const nextRound = buttons[0];
    if (nextRound) {
      void this.submitInquiryResponse(nextRound);
      return true;
    }
    return false;
  }

  public serverPasswordSalt = 'RABIRIICHI'; // default fallback

  public async fetchServerSalt(): Promise<string> {
    try {
      const client = await this.getWSClient();
      const info = await getInfo(client);
      if (info.passwordSalt) {
        this.serverPasswordSalt = info.passwordSalt;
      }
    } catch (err) {
      this.logger.error('Failed to fetch server salt, using fallback:', err);
    }
    return this.serverPasswordSalt;
  }

  public async computePasswordHash(
    passwordRaw: string,
    salt: string,
  ): Promise<string> {
    return this.platform.crypto.sha256(passwordRaw + '@' + salt);
  }

  public async registerUser(
    username: string,
    nickname = username,
    passwordRaw = 'default_password',
  ): Promise<void> {
    this.logger.info(`Registering user: ${username}`);
    const client = await this.getWSClient();
    const salt = await this.fetchServerSalt();
    const passwordHash = await this.computePasswordHash(passwordRaw, salt);
    const resp = await createUser(client, username, nickname, passwordHash);
    this.logger.info(`Registration succeeded`, resp);

    this.self = {
      id: resp.id ?? -1,
      nickname: resp.userData?.nickname ?? nickname,
      status: UserStatus.USER_STATUS_NONE,
      gameState: null,
      aiType: AiType.AI_TYPE_NONE,
    };
    this.username = username;
    this.accessToken = resp.accessToken ?? null;
    this.storeCredentials();
    await this.connectWS();
  }

  public async loginUser(
    username: string,
    passwordRaw = 'default_password',
  ): Promise<void> {
    this.logger.info(`Logging in user: ${username}`);
    const client = await this.getWSClient();
    const salt = await this.fetchServerSalt();
    const passwordHash = await this.computePasswordHash(passwordRaw, salt);
    const resp = await loginUser(client, username, passwordHash);
    this.logger.info(`Login succeeded`, resp);

    this.self = {
      id: resp.id ?? -1,
      nickname: resp.userData?.nickname ?? username,
      status: UserStatus.USER_STATUS_NONE,
      gameState: null,
      aiType: AiType.AI_TYPE_NONE,
    };
    this.username = username;
    this.accessToken = resp.accessToken ?? null;
    this.storeCredentials();
    await this.connectWS();
  }

  public async fetchReplay(gameId: string): Promise<IGameLogMsg> {
    this.logger.info(`Fetching replay: ${gameId}`);
    const client = await this.getWSClient();
    return getReplay(client, gameId);
  }

  public async refreshMyInfo(): Promise<void> {
    this.logger.info('Refreshing current user info');
    const client = await this.getWSClient(true);
    const resp = await getUserInfo(client);
    this.logger.info(`Retrieved user information`, resp);
    this.updateUserInfo(resp);
  }

  public async updateProfile(nickname: string): Promise<void> {
    this.logger.info('Updating profile');
    const client = await this.getWSClient(true);
    const resp = await updateProfile(client, nickname);
    this.logger.info('Profile updated', resp);
    this.updateUserInfo(resp);
  }

  /**
   * Changes the password over the public socket (the user proves identity with
   * the old password). The server rotates the access token; store the new one so
   * the current session survives the token-version bump.
   */
  public async changePassword(
    oldPasswordRaw: string,
    newPasswordRaw: string,
  ): Promise<void> {
    const username = this.username;
    if (!username) {
      throw new StateError('Not signed in');
    }
    this.logger.info('Changing password');
    const client = await this.getWSClient();
    const salt = await this.fetchServerSalt();
    const oldHash = await this.computePasswordHash(oldPasswordRaw, salt);
    const newHash = await this.computePasswordHash(newPasswordRaw, salt);
    const resp = await changePassword(client, username, oldHash, newHash);
    this.logger.info('Password changed', resp);
    if (resp.accessToken) {
      this.accessToken = resp.accessToken;
      this.storeCredentials();
    }
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

  public async addAi(type: AiType, llmConfig?: ILlmAiConfig): Promise<void> {
    this.logger.info(`Adding AI to room: ${type}`);
    const client = await this.getWSClient(true);
    const resp = await addAi(client, type, llmConfig);
    if (resp.state) {
      this.handleRoomState(resp.state);
    }
  }

  public async removeRoomPlayer(id: number): Promise<void> {
    this.logger.info(`Removing player from room: ${id}`);
    const client = await this.getWSClient(true);
    const resp = await removeRoomPlayer(client, id);
    if (resp.state) {
      this.handleRoomState(resp.state);
    }
  }

  public async updateRoom(userStatus: UserStatus): Promise<void> {
    this.logger.info(`Updating room status: ${userStatus}`);
    const client = await this.getWSClient(true);
    sendUpdateRoom(client, userStatus);
  }

  public returnToRoom(): void {
    this.beginExitGame();
    this.gameVoiceState = createGameVoiceState();
    this.deferredChats = [];
    this.isShowingRoundResult = false;
    this.isFinalResultScreen = false;
    if (this.room) {
      this.room = {
        ...this.room,
        info: null,
        gameEnded: false,
        endGamePoints: null,
        concludedPlayers: null,
      };
      this.onChange.emit();
    }
  }

  public beginExitGame(): void {
    this.hasExitedGame = true;
    this.clearTimer();
    this.platform.sound.stopEffect(SOUND_EFFECTS.game.timeoutWarning);
    this.hasPlayedActionSequenceSound = false;
  }

  public cancelExitGame(): void {
    this.hasExitedGame = false;
  }

  public setRiichiSelectMode(active: boolean): void {
    this.isRiichiSelectMode = active;
    this.onChange.emit();
  }

  public setPendingActionOption(option: ActionOption | null): void {
    this.pendingActionOption = option;
    this.onChange.emit();
  }

  private setLocalPlayerAwaitedTiles(
    waits: MappedTenpaiInfo[] | undefined,
  ): void {
    if (!this.room || !this.self) return;
    const me = this.room.players.find((p) => p.id === this.self?.id);
    if (me?.gameState) {
      const nextGameState = { ...me.gameState };
      if (waits && waits.length > 0) {
        nextGameState.awaitedTiles = waits;
      } else {
        delete nextGameState.awaitedTiles;
      }
      me.gameState = nextGameState;
      this.onChange.emit();
    }
  }

  public async submitInquiryResponse(
    action: ActionOption,
    choice?: number,
  ): Promise<void> {
    if (!this.currentInquiry) return;
    this.clearTimer();

    if (
      choice !== undefined &&
      (action.type === 'play-tile' || action.type === 'riichi')
    ) {
      const candidates = action.candidates ?? [];
      const match = candidates.find((c) => c.tileId === choice);
      if (match && match.tenpaiInfos.length > 0) {
        // Riichi candidates are computed server-side before riichi is
        // committed, so add its guaranteed han for the optimistic pre-sync
        // display -- 2 when this would be a double riichi.
        const waits =
          action.type === 'riichi'
            ? applyRiichiBonusToWaits(
                match.tenpaiInfos,
                riichiBonusHan(this.room?.players ?? []),
              )
            : match.tenpaiInfos;
        this.setLocalPlayerAwaitedTiles(waits);
      } else {
        this.setLocalPlayerAwaitedTiles(undefined);
      }
    }

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
      this.hoveredTileTraceId = null;
      this.onChange.emit();
    }
  }

  public close(): void {
    this.messagePump.detach();
    if (this._ws) {
      this._ws.onPingUpdated.unsubscribe(this.pingListener);
      if (this.serverMessageListener) {
        this._ws.onMessage.unsubscribe(this.serverMessageListener);
        this.serverMessageListener = null;
      }
      this._ws.close();
      this._ws = null;
    }
    this.self = null;
    this.room = null;
    this.chatHistory = [];
    this.currentInquiry = null;
    this.isRiichiSelectMode = false;
    this.pendingActionOption = null;
    this.selectedTileTraceId = null;
    this.hoveredTileTraceId = null;
    this.clearTimer();
    this.clearResultAnimation();
    this.ping = -1;
    this.setConnectionStatus('disconnected');
  }

  public logout(): void {
    if (this.wsurl) {
      this.credentials.clearCredentialsForServer(this.wsurl);
      this.credentials.clearLastUrl();
    }
    this.accessToken = null;
    this.username = null;
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
    if (interactive && seconds <= 5) {
      this.platform.sound.playEffect(SOUND_EFFECTS.game.timeoutWarning);
    }
    this.onChange.emit();

    // Count down to a fixed deadline rather than by subtracting a step per
    // tick. Timers fire late under load and are clamped to a second or more in
    // a background tab, so an accumulating counter reads high — showing time
    // the server has already taken back. See src/domain/countdown.ts.
    const deadline = monotonicNow() + seconds * 1000;
    this.actionTimerId = setInterval(() => {
      const previous = this.actionTimeout;
      const remaining = remainingSeconds(deadline, monotonicNow());
      this.actionTimeout = remaining;

      if (remaining <= 0) {
        this.clearTimer();
        if (interactive) {
          this.logger.info(
            'Inquiry timeout reached. Deferring to server default.',
          );
          void this.submitServerDefault();
        }
        return;
      }

      if (interactive && shouldSoundUrgency(previous, remaining)) {
        this.platform.sound.playEffect(SOUND_EFFECTS.game.timeoutWarning);
      }
      if (displayedSecondChanged(previous, remaining)) {
        this.onChange.emit();
      }
    }, 100);
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

  /**
   * On timeout, defer to the server's default instead of computing our own.
   * Sending index = -1 is the server's canonical "use default" sentinel
   * (InquiryResponse.Default), which picks the action the server flagged as
   * default (e.g. tsumo on a winning riichi draw) — avoiding a second, divergent
   * default policy on the client.
   */
  private async submitServerDefault(): Promise<void> {
    if (!this.currentInquiry) return;
    try {
      await this.respondInquiry(
        this.currentInquiry.messageId,
        INQUIRY_DEFAULT_INDEX,
        '',
      );
    } catch (err) {
      this.logger.error('Failed to submit server default response:', err);
    }
  }

  /**
   * Returns the persisted last-server URL and access token, if both are present.
   * Reads through the injected credential store, so it works on any host.
   */
  public loadStoredCredentials(): { url: string; token: string } | null {
    const url = this.credentials.loadLastUrl();
    const token = this.credentials.loadToken();
    if (!url || !token) {
      return null;
    }
    return { url, token };
  }

  /** Restores the persisted login username so it survives reloads. */
  public restoreStoredUsername(): void {
    this.username = this.credentials.loadUsername();
  }

  public getCredentialsForServer(url: string): ServerCredentials | null {
    return this.credentials.loadCredentialsForServer(url);
  }

  public isKnownServer(url: string): boolean {
    return this.credentials.isKnownServer(url);
  }

  public loadServerSettings(): ServerSettings {
    return this.credentials.loadServerSettings();
  }

  public saveServerSettings(settings: ServerSettings): void {
    this.credentials.saveServerSettings(settings);
  }
}

export const rabiriichi = new RabiRiichiClient();

function reportAutoConnectFailure(url: string, error: string): void {
  rabiriichi.autoConnectFailedUrl = url;
  rabiriichi.autoConnectError = error;
  rabiriichi.onChange.emit();
}

async function handleParamAutoConnect(
  serverParam: string,
  joinRoomParam: string | null,
): Promise<void> {
  if (!rabiriichi.isKnownServer(serverParam)) {
    reportAutoConnectFailure(serverParam, 'connect.error.unknownServer');
    rabiriichi.close();
    return;
  }

  const creds = rabiriichi.getCredentialsForServer(serverParam);
  const token = creds?.token;
  if (token) {
    const logger = new Logger('AutoLogin');
    logger.info(
      `Auto-connecting to parameter server: ${serverParam} with saved token`,
    );
    try {
      await rabiriichi.connect(serverParam, token);
      logger.info(`Auto-connection succeeded to ${serverParam}`);

      if (joinRoomParam) {
        const roomId = parseInt(joinRoomParam, 10);
        if (!isNaN(roomId)) {
          if (rabiriichi.room) {
            if (rabiriichi.room.id === roomId) {
              logger.info(
                `Already in target room ${roomId}. Sign in as normal.`,
              );
            } else {
              logger.warn(
                `Already in a different room ${rabiriichi.room.id}. Aborting join.`,
              );
              reportAutoConnectFailure(
                serverParam,
                'connect.error.alreadyInDifferentRoom',
              );
              rabiriichi.close();
            }
          } else {
            logger.info(`Auto-joining room: ${roomId}`);
            await rabiriichi.joinRoom(roomId);
          }
        }
      }
    } catch (err) {
      logger.error(`Auto-connection failed to ${serverParam}`, err);
      reportAutoConnectFailure(serverParam, 'connect.error.autoConnectFailed');
      rabiriichi.close();
    }
  } else {
    const settings = rabiriichi.loadServerSettings();
    settings.lastUrl = serverParam;
    const matchingServer =
      DEFAULT_SERVERS.find((s) => s.url === serverParam) ??
      settings.customServers?.find((s) => s.url === serverParam);
    if (matchingServer) {
      settings.selectedId = matchingServer.id;
    } else {
      settings.selectedId = 'custom';
    }
    rabiriichi.saveServerSettings(settings);
    rabiriichi.close();
  }
}

async function handleStandardAutoReconnect(): Promise<void> {
  const stored = rabiriichi.loadStoredCredentials();
  if (!stored) {
    return;
  }
  const { url, token } = stored;
  const logger = new Logger('AutoReconnect');
  logger.info(`Auto-reconnecting to server: ${url}`);
  try {
    await rabiriichi.connect(url, token);
    logger.info(`Auto-reconnection succeeded! Connected to ${url}`);
  } catch (err) {
    logger.error(`Auto-reconnection failed for URL ${url}`, err);
    reportAutoConnectFailure(url, 'connect.error.autoConnectFailed');
    rabiriichi.close();
  }
}

export async function initRabiRiichi(params?: URLSearchParams): Promise<void> {
  rabiriichi.restoreStoredUsername();
  rabiriichi.autoConnectError = null;
  rabiriichi.autoConnectFailedUrl = null;

  const serverParam = params?.get('server');
  const joinRoomParam = params?.get('joinRoom');

  if (serverParam) {
    await handleParamAutoConnect(serverParam, joinRoomParam ?? null);
  } else {
    await handleStandardAutoReconnect();
  }
}
