import { DiscardReason, TileSource } from '../proto';
import type { IEventMsg } from '../proto';
import { totalYakuman } from './model';
import type { MappedTenpaiInfo, RoomModel } from './model';
import { checkIsDora, Tile } from './tile';

const REPEATED_DISCARD_COUNT = 3;
const OPPONENT_CALL_COUNT = 3;
const LOW_WALL_THRESHOLD = 10;
const LOCAL_REACTION_VOICES = new Set([
  'gameStart',
  'tenpai',
  'noten',
  'wallLow',
  'bigTenpai',
]);

export interface PlayerVoiceState {
  readonly lastDiscardKind: number | null;
  readonly repeatedDiscardCount: number;
  readonly opponentCallCount: number;
  readonly awaitingOpponentCall: boolean;
  /** Whether this player already voiced a dora discard this round. */
  readonly playedDiscardDora: boolean;
}

export interface GameVoiceState {
  readonly playedGameStart: boolean;
  readonly playedBigTenpai: boolean;
  readonly players: Readonly<Record<number, PlayerVoiceState>>;
}

export interface GameVoiceDecision {
  readonly state: GameVoiceState;
  readonly voiceId: string | null;
  /** Seat whose character voices the line; undefined = no specific seat. */
  readonly speakerSeat?: number | undefined;
}

export interface GameVoiceContext {
  readonly event: IEventMsg;
  readonly before: RoomModel;
  readonly after: RoomModel;
  readonly selfSeat: number | undefined;
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

function createPlayerVoiceState(): PlayerVoiceState {
  return {
    lastDiscardKind: null,
    repeatedDiscardCount: 0,
    opponentCallCount: 0,
    awaitingOpponentCall: false,
    playedDiscardDora: false,
  };
}

export function createGameVoiceState(): GameVoiceState {
  return {
    playedGameStart: false,
    playedBigTenpai: false,
    players: {
      0: createPlayerVoiceState(),
      1: createPlayerVoiceState(),
      2: createPlayerVoiceState(),
      3: createPlayerVoiceState(),
    },
  };
}

export function highestPointTenpaiIsYakuman(
  waits: readonly MappedTenpaiInfo[],
): boolean {
  if (waits.length === 0) return false;
  const highestPoints = Math.max(...waits.map((wait) => wait.points));
  return waits.some(
    (wait) => wait.points === highestPoints && totalYakuman(wait) > 0,
  );
}

function localWaits(room: RoomModel, selfSeat: number): MappedTenpaiInfo[] {
  return (
    room.players.find((player) => player.seat === selfSeat)?.gameState
      ?.awaitedTiles ?? []
  );
}

function discardDecision(
  state: GameVoiceState,
  context: GameVoiceContext,
  discarderSeat: number,
): GameVoiceDecision {
  const discarded = context.event.discardTileEvent?.discarded;
  if (!discarded) {
    return { state, voiceId: null };
  }

  const pState = state.players[discarderSeat] ?? createPlayerVoiceState();
  const tileKind = (discarded.tile ?? 0) & 0x7f;
  const repeatedDiscardCount =
    tileKind > 0 && tileKind === pState.lastDiscardKind
      ? pState.repeatedDiscardCount + 1
      : 1;

  const updatedPlayerState: PlayerVoiceState = {
    ...pState,
    lastDiscardKind: tileKind,
    repeatedDiscardCount,
    opponentCallCount: pState.awaitingOpponentCall
      ? 0
      : pState.opponentCallCount,
    awaitingOpponentCall: true,
  };

  const nextPlayers = {
    ...state.players,
    [discarderSeat]: updatedPlayerState,
  };

  const nextState: GameVoiceState = {
    ...state,
    players: nextPlayers,
  };

  if (discarderSeat === context.selfSeat) {
    const waits = localWaits(context.after, context.selfSeat);
    if (!state.playedBigTenpai && highestPointTenpaiIsYakuman(waits)) {
      return {
        state: { ...nextState, playedBigTenpai: true },
        voiceId: 'bigTenpai',
        speakerSeat: discarderSeat,
      };
    }
  }

  if (repeatedDiscardCount === REPEATED_DISCARD_COUNT) {
    return {
      state: nextState,
      voiceId: 'repeatDiscard',
      speakerSeat: discarderSeat,
    };
  }

  const indicators = (context.before.info?.doras ?? [])
    .map((indicator) => indicator.tile ?? 0)
    .filter((tile) => tile > 0)
    .map((tile) => Tile.fromByte(tile));
  const isDora =
    tileKind > 0 && checkIsDora(Tile.fromByte(discarded.tile ?? 0), indicators);
  // Play at most once per player per round, on their first dora (incl. akadora)
  // discard. Nukidora is a separate event and never reaches here.
  if (isDora && !pState.playedDiscardDora) {
    return {
      state: {
        ...nextState,
        players: {
          ...nextPlayers,
          [discarderSeat]: { ...updatedPlayerState, playedDiscardDora: true },
        },
      },
      voiceId: 'discardDora',
      speakerSeat: discarderSeat,
    };
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

  const claimerSeat = claim.playerId;
  if (claimerSeat === undefined || claimerSeat === null) {
    return { state, voiceId: null };
  }

  const discardedFromSeat = claim.tile?.discardInfo?.from;

  let nextState = state;

  if (
    discardedFromSeat !== undefined &&
    discardedFromSeat !== null &&
    claimerSeat !== discardedFromSeat
  ) {
    const discarderState = state.players[discardedFromSeat];
    if (discarderState?.awaitingOpponentCall) {
      const opponentCallCount = discarderState.opponentCallCount + 1;
      const updatedDiscarderState: PlayerVoiceState = {
        ...discarderState,
        opponentCallCount,
        awaitingOpponentCall: false,
      };

      nextState = {
        ...state,
        players: {
          ...state.players,
          [discardedFromSeat]: updatedDiscarderState,
        },
      };

      if (opponentCallCount === OPPONENT_CALL_COUNT) {
        return {
          state: nextState,
          voiceId: 'opponentCalls',
          speakerSeat: discardedFromSeat,
        };
      }
    }
  }
  if (claim.reason === DiscardReason.DISCARD_REASON_CHII) {
    return { state: nextState, voiceId: 'chii', speakerSeat: claimerSeat };
  }
  if (claim.reason === DiscardReason.DISCARD_REASON_PON) {
    return { state: nextState, voiceId: 'pon', speakerSeat: claimerSeat };
  }
  if ((claim.group?.tiles?.length ?? 0) === 4) {
    return { state: nextState, voiceId: 'kan', speakerSeat: claimerSeat };
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

function directEventVoice(context: GameVoiceContext): {
  voiceId: string | null;
  speakerSeat: number | undefined;
} {
  const { event: gameEvent, before, after, selfSeat } = context;

  if (
    gameEvent.kanEvent &&
    gameEvent.kanEvent.kanSource !== TileSource.TILE_SOURCE_DAIMINKAN
  ) {
    return {
      voiceId: 'kan',
      speakerSeat: gameEvent.kanEvent.playerId ?? undefined,
    };
  }
  if (gameEvent.nukiDoraEvent) {
    return {
      voiceId: 'nuki',
      speakerSeat: gameEvent.nukiDoraEvent.playerId ?? undefined,
    };
  }

  if ((gameEvent.agariEvent?.agariInfos?.length ?? 0) > 0) {
    const winnerId = gameEvent.agariEvent?.agariInfos?.[0]?.playerId;
    return {
      voiceId: gameEvent.agariEvent?.isTsumo ? 'tsumo' : 'ron',
      speakerSeat: winnerId ?? undefined,
    };
  }

  const draw = gameEvent.ryuukyokuEvent;
  if (draw?.midGameRyuukyoku?.name === 'kyuushu_kyuuhai') {
    const speaker = before.info?.currentPlayer;
    return { voiceId: 'kyuushuKyuuhai', speakerSeat: speaker ?? undefined };
  }
  if (draw?.endGameRyuukyoku && selfSeat !== undefined) {
    const isTenpai = draw.endGameRyuukyoku.tenpaiPlayers?.includes(selfSeat);
    return {
      voiceId: isTenpai ? 'tenpai' : 'noten',
      speakerSeat: selfSeat,
    };
  }

  const crossedLowWall =
    (before.info?.remainingTiles ?? 0) > LOW_WALL_THRESHOLD &&
    (after.info?.remainingTiles ?? 0) <= LOW_WALL_THRESHOLD;
  if (gameEvent.drawTileEvent && crossedLowWall) {
    return { voiceId: 'wallLow', speakerSeat: selfSeat };
  }

  return { voiceId: null, speakerSeat: undefined };
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
      speakerSeat: context.selfSeat,
    };
  }

  const discard = context.event.discardTileEvent;
  if (discard?.playerId != null) {
    const decision = discardDecision(state, context, discard.playerId);
    return discard.isRiichi
      ? {
          state: decision.state,
          voiceId: riichiVoice(context.before, discard.playerId),
          speakerSeat: discard.playerId,
        }
      : decision;
  }
  if (context.event.claimTileEvent) {
    return claimDecision(state, context);
  }

  const direct = directEventVoice(context);
  return {
    state,
    voiceId: direct.voiceId,
    speakerSeat: direct.speakerSeat,
  };
}
