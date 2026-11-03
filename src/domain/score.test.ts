import { describe, expect, it } from 'vitest';
import { compareScoresDescending, toScore } from './score';
import {
  ApplyScoreEventMsg,
  GameStateMsg,
  EventMsg,
  SinglePlayerInquiryMsg,
} from '../proto';
import { mapInquiry } from './inquiry';
import { highestPointTenpaiIsYakuman } from './gameVoice';
import { applyEvent, hydrateFromGameState } from './reducer';
import type { RoomModel } from './model';
import { createEmptyTileRegistry } from './tileRegistry';

const maximum = (1n << 128n) + 1n;
const minimum = -maximum;

function room(points = '2000'): RoomModel {
  return hydrateFromGameState(
    {
      id: 1234,
      config: null,
      info: null,
      players: [],
      tileRegistry: createEmptyTileRegistry(),
    },
    GameStateMsg.fromObject({
      config: { playerCount: 2 },
      info: {},
      players: [
        { id: 0, points },
        { id: 1, points },
      ],
    }),
  );
}

function settle(
  state: RoomModel,
  scoreChange: Record<string, unknown>[],
): RoomModel {
  const encoded = ApplyScoreEventMsg.encode(
    ApplyScoreEventMsg.fromObject({ scoreChange }),
  ).finish();
  return applyEvent(state, {
    applyScoreEvent: ApplyScoreEventMsg.decode(encoded),
  });
}

describe('exact scores', () => {
  it('decodes the same beyond-128-bit decimal wire fixture emitted by the backend', () => {
    // ScoreTransferMsg: from=1, points=2^128+1 as a decimal string, reason=Ron.
    const wire = Uint8Array.from([
      0x0a,
      0x2d,
      0x08,
      0x01,
      0x1a,
      0x27,
      ...new TextEncoder().encode('340282366920938463463374607431768211457'),
      0x20,
      0x01,
    ]);
    const decoded = ApplyScoreEventMsg.decode(wire);
    expect(toScore(decoded.scoreChange[0]?.points)).toBe(maximum);
  });

  it('keeps the original 2000 and applies the entire huge payment', () => {
    const state = settle(room(), [
      { from: 1, to: 0, points: maximum.toString() },
    ]);
    const winner = state.roundResult?.players[0]?.gameState;
    const loser = state.roundResult?.players[1]?.gameState;
    expect(winner?.agari?.previousPoints).toBe(2000n);
    expect(loser?.agari?.previousPoints).toBe(2000n);
    expect(winner?.agari?.gainPoints).toBe(maximum);
    expect(winner?.points).toBe(maximum + 2000n);
    expect(loser?.points).toBe(2000n - maximum);
  });

  it('preserves low digits in balances, deductions, and subsequent rounds', () => {
    let state = room('9007199254740993');
    expect(state.players[0]?.gameState?.points).toBe(9007199254740993n);
    state = applyEvent(state, { setRiichiEvent: { playerId: 0 } });
    expect(state.players[0]?.gameState?.points).toBe(9007199254739993n);
    state = settle(state, [{ from: 1, to: 0, points: '1' }]);
    expect(state.players[0]?.gameState?.points).toBe(9007199254739994n);
    state = applyEvent(state, { beginGameEvent: { round: 1 } });
    expect(state.players[0]?.gameState?.points).toBe(9007199254739994n);
    const ended = applyEvent(
      state,
      EventMsg.fromObject({
        stopGameEvent: {
          endGamePoints: [maximum.toString(), minimum.toString()],
        },
      }),
    );
    expect(ended.endGamePoints).toEqual([maximum, minimum]);
  });

  it('accumulates all transfers exactly, regardless of their order', () => {
    const transfers = [
      { from: 1, to: 0, points: maximum.toString() },
      { from: 1, to: 0, points: maximum.toString() },
      { from: 0, to: 1, points: maximum.toString() },
      { from: 0, to: 1, points: maximum.toString() },
    ];
    for (const list of [transfers, [...transfers].reverse()]) {
      const state = settle(room(), list);
      expect(state.players.map((p) => p.gameState?.points)).toEqual([
        2000n,
        2000n,
      ]);
      expect(state.players[0]?.gameState?.agari?.gainPoints).toBe(maximum * 2n);
    }
  });

  it('preserves large wait scores from inquiries and compares adjacent values exactly', () => {
    const inquiry = SinglePlayerInquiryMsg.fromObject({
      actions: [
        {
          playTileAction: {
            candidates: [
              {
                tile: { traceId: 1 },
                tenpaiInfos: [
                  {
                    winningTile: 17,
                    points: (maximum - 1n).toString(),
                    yakuman: 1,
                  },
                  { winningTile: 18, points: maximum.toString(), yakuman: 0 },
                ],
              },
            ],
          },
        },
      ],
    });
    const decoded = SinglePlayerInquiryMsg.decode(
      SinglePlayerInquiryMsg.encode(inquiry).finish(),
    );
    const waits =
      mapInquiry(decoded).playTile?.candidates?.[0]?.tenpaiInfos ?? [];
    expect(waits.map((wait) => wait.points)).toEqual([maximum - 1n, maximum]);
    expect(highestPointTenpaiIsYakuman(waits)).toBe(false);
  });

  it('rejects already-rounded numeric input and preserves signed boundaries', () => {
    expect(() => toScore(Number(maximum))).toThrow(RangeError);
    expect(toScore(null)).toBe(0n);
    expect(toScore(minimum.toString())).toBe(minimum);
    expect(
      [maximum - 1n, maximum, minimum].sort(compareScoresDescending),
    ).toEqual([maximum, maximum - 1n, minimum]);
  });
});
