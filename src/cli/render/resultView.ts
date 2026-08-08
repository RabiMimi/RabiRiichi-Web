/**
 * Pure view-model for the round/game result summary. Determines whether a
 * result should be shown and computes each player's point delta, mirroring the
 * web ResultPanel's conditions. Kept Ink-free and unit-testable.
 */
import type { RoomModel, PlayerModel } from '../../domain/model';
import type { MappedInquiry } from '../../domain/inquiry';

export interface ResultRow {
  id: number;
  name: string;
  delta: number;
  points: number;
}

export type ResultKind = 'agari' | 'draw';

export interface ResultView {
  kind: ResultKind;
  rows: ResultRow[];
}

/** True when the pending inquiry offers the "next round" (confirm) action. */
export function hasNextRound(inquiry: MappedInquiry | undefined): boolean {
  return inquiry?.buttons.some((b) => b.type === 'next-round') ?? false;
}

/**
 * Whether a result screen should be shown: a player has an agari/tenpai result,
 * or the game is waiting for the player to confirm the next round.
 */
export function shouldShowResult(
  room: RoomModel | null,
  inquiry: MappedInquiry | undefined,
  isWaitingForProceed: boolean,
): boolean {
  if (!room) return false;
  const anyResult = room.players.some(
    (p) =>
      p.gameState?.agari?.scores != null ||
      p.gameState?.agari?.isTenpai === true ||
      p.gameState?.agari?.isNagashi === true,
  );
  return anyResult || hasNextRound(inquiry) || isWaitingForProceed;
}

/** Builds the result rows (name, point delta, resulting points) for a room. */
export function buildResultView(
  room: RoomModel,
  displayName: (player: PlayerModel) => string,
): ResultView {
  const hasWinner = room.players.some(
    (p) => p.gameState?.agari?.scores != null && !p.gameState.agari.isNagashi,
  );
  const rows: ResultRow[] = room.players.map((p) => {
    const agari = p.gameState?.agari;
    const delta = (agari?.gainPoints ?? 0) - (agari?.losePoints ?? 0);
    return {
      id: p.id,
      name: displayName(p),
      delta,
      points: p.gameState?.points ?? 0,
    };
  });
  return { kind: hasWinner ? 'agari' : 'draw', rows };
}
