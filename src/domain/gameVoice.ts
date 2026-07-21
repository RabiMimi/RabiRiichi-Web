import { DiscardReason, TileSource } from '../proto';
import type { IEventMsg } from '../proto';
import type { MappedTenpaiInfo, RoomModel } from './model';
import { checkIsDora, Tile } from './tile';

const DORA_VOICE_CHANCE = 0.25;
const REPEATED_DISCARD_COUNT = 3;
const OPPONENT_CALL_COUNT = 3;
const LOW_WALL_THRESHOLD = 10;
const LOCAL_REACTION_VOICES = new Set([
  'gameStart',
  'tenpai',
  'noten',
  'wallLow',
  'discardDora',
  'repeatDiscard',
  'opponentCalls',
  'bigTenpai',
]);

export interface GameVoiceState {
  readonly playedGameStart: boolean;
  readonly lastDiscardKind: number | null;
  readonly repeatedDiscardCount: number;
  readonly opponentCallCount: number;
  readonly awaitingOpponentCall: boolean;
  readonly playedBigTenpai: boolean;
}

export interface GameVoiceDecision {
  readonly state: GameVoiceState;
  readonly voiceId: string | null;
}

export interface GameVoiceContext {
  readonly event: IEventMsg;
  readonly before: RoomModel;
  readonly after: RoomModel;
  readonly selfSeat: number | undefined;
  readonly randomValue?: number;
}

export function getGameVoiceSpeakerSeat(
  gameEvent: IEventMsg,
  selfSeat: number | undefined,
  voiceId: string,
): number | undefined {
  if (LOCAL_REACTION_VOICES.has(voiceId)) return selfSeat;

  return (
    gameEvent.discardTileEvent?.playerId ??
    gameEvent.claimTileEvent?.playerId ??
    gameEvent.kanEvent?.playerId ??
    gameEvent.nukiDoraEvent?.playerId ??
    gameEvent.agariEvent?.agariInfos?.[0]?.playerId ??
    selfSeat
  );
}

export function createGameVoiceState(): GameVoiceState {
  return {
    playedGameStart: false,
    lastDiscardKind: null,
    repeatedDiscardCount: 0,
    opponentCallCount: 0,
    awaitingOpponentCall: false,
    playedBigTenpai: false,
  };
}

export function highestPointTenpaiIsYakuman(
  waits: readonly MappedTenpaiInfo[],
): boolean {
  if (waits.length === 0) return false;
  const highestPoints = Math.max(...waits.map((wait) => wait.points));
  return waits.some(
    (wait) => wait.points === highestPoints && wait.yakuman > 0,
  );
}

function localWaits(room: RoomModel, selfSeat: number): MappedTenpaiInfo[] {
  return (
    room.players.find((player) => player.seat === selfSeat)?.gameState
      ?.awaitedTiles ?? []
  );
}

function localDiscardDecision(
  state: GameVoiceState,
  context: GameVoiceContext,
): GameVoiceDecision {
  const discarded = context.event.discardTileEvent?.discarded;
  if (!discarded || context.selfSeat === undefined) {
    return { state, voiceId: null };
  }

  const tileKind = (discarded.tile ?? 0) & 0x7f;
  const repeatedDiscardCount =
    tileKind > 0 && tileKind === state.lastDiscardKind
      ? state.repeatedDiscardCount + 1
      : 1;
  const nextState: GameVoiceState = {
    ...state,
    lastDiscardKind: tileKind,
    repeatedDiscardCount,
    opponentCallCount: state.awaitingOpponentCall ? 0 : state.opponentCallCount,
    awaitingOpponentCall: true,
  };

  const waits = localWaits(context.after, context.selfSeat);
  if (!state.playedBigTenpai && highestPointTenpaiIsYakuman(waits)) {
    return {
      state: { ...nextState, playedBigTenpai: true },
      voiceId: 'bigTenpai',
    };
  }

  if (repeatedDiscardCount === REPEATED_DISCARD_COUNT) {
    return { state: nextState, voiceId: 'repeatDiscard' };
  }

  const indicators = (context.before.info?.doras ?? [])
    .map((indicator) => indicator.tile ?? 0)
    .filter((tile) => tile > 0)
    .map((tile) => Tile.fromByte(tile));
  const isDora =
    tileKind > 0 && checkIsDora(Tile.fromByte(discarded.tile ?? 0), indicators);
  if (isDora && (context.randomValue ?? 1) < DORA_VOICE_CHANCE) {
    return { state: nextState, voiceId: 'discardDora' };
  }

  return { state: nextState, voiceId: null };
}

function claimDecision(
  state: GameVoiceState,
  context: GameVoiceContext,
): GameVoiceDecision {
  const claim = context.event.claimTileEvent;
  if (!claim) {
    return { state, voiceId: null };
  }

  let nextState = state;
  let opponentCallVoice: string | null = null;
  if (
    context.selfSeat !== undefined &&
    claim.playerId !== context.selfSeat &&
    claim.tile?.discardInfo?.from === context.selfSeat &&
    state.awaitingOpponentCall
  ) {
    const opponentCallCount = state.opponentCallCount + 1;
    nextState = {
      ...state,
      opponentCallCount,
      awaitingOpponentCall: false,
    };
    opponentCallVoice =
      opponentCallCount === OPPONENT_CALL_COUNT ? 'opponentCalls' : null;
  }

  if (opponentCallVoice) {
    return { state: nextState, voiceId: opponentCallVoice };
  }
  if (claim.reason === DiscardReason.DISCARD_REASON_CHII) {
    return { state: nextState, voiceId: 'chii' };
  }
  if (claim.reason === DiscardReason.DISCARD_REASON_PON) {
    return { state: nextState, voiceId: 'pon' };
  }
  if ((claim.group?.tiles?.length ?? 0) === 4) {
    return { state: nextState, voiceId: 'kan' };
  }
  return { state: nextState, voiceId: null };
}

function isFirstJun(room: RoomModel): boolean {
  return room.players.every(
    (player) =>
      (player.gameState?.jun ?? 0) <= 1 &&
      (player.gameState?.hand.called.length ?? 0) === 0,
  );
}

function riichiVoice(room: RoomModel, playerId: number): string {
  if (isFirstJun(room)) return 'doubleRiichi';
  const opponentAlreadyRiichi = room.players.some(
    (player) =>
      player.seat !== playerId && (player.gameState?.riichiTileId ?? 0) !== 0,
  );
  return opponentAlreadyRiichi ? 'okkakeRiichi' : 'riichi';
}

function directEventVoice(context: GameVoiceContext): string | null {
  const { event: gameEvent, before, after, selfSeat } = context;

  if (
    gameEvent.kanEvent &&
    gameEvent.kanEvent.kanSource !== TileSource.TILE_SOURCE_DAIMINKAN
  ) {
    return 'kan';
  }
  if (gameEvent.nukiDoraEvent) return 'nuki';

  if ((gameEvent.agariEvent?.agariInfos?.length ?? 0) > 0) {
    return gameEvent.agariEvent?.isTsumo ? 'tsumo' : 'ron';
  }

  const draw = gameEvent.ryuukyokuEvent;
  if (draw?.midGameRyuukyoku?.name === 'kyuushu_kyuuhai') {
    return 'kyuushuKyuuhai';
  }
  if (draw?.endGameRyuukyoku && selfSeat !== undefined) {
    return draw.endGameRyuukyoku.tenpaiPlayers?.includes(selfSeat)
      ? 'tenpai'
      : 'noten';
  }

  const crossedLowWall =
    (before.info?.remainingTiles ?? 0) > LOW_WALL_THRESHOLD &&
    (after.info?.remainingTiles ?? 0) <= LOW_WALL_THRESHOLD;
  if (gameEvent.drawTileEvent && crossedLowWall) return 'wallLow';

  return null;
}

export function reduceGameVoice(
  state: GameVoiceState,
  context: GameVoiceContext,
): GameVoiceDecision {
  if (context.event.beginGameEvent) {
    const nextState = {
      ...createGameVoiceState(),
      playedGameStart: true,
    };
    return {
      state: nextState,
      voiceId: state.playedGameStart ? null : 'gameStart',
    };
  }

  const discard = context.event.discardTileEvent;
  if (discard && discard.playerId === context.selfSeat) {
    const decision = localDiscardDecision(state, context);
    return discard.isRiichi
      ? {
          state: decision.state,
          voiceId: riichiVoice(context.before, discard.playerId ?? 0),
        }
      : decision;
  }
  if (discard?.isRiichi) {
    return {
      state,
      voiceId: riichiVoice(context.before, discard.playerId ?? 0),
    };
  }
  if (context.event.claimTileEvent) {
    return claimDecision(state, context);
  }

  return { state, voiceId: directEventVoice(context) };
}
