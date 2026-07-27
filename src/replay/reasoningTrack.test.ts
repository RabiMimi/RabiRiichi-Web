import { describe, it, expect } from 'vitest';
import {
  toHttpBase,
  reasoningTrackUrl,
  groupByEventIndex,
  parseReasoningTrack,
  fetchReasoningTrack,
  type FetchLike,
  type ReasoningTrackEntry,
} from './reasoningTrack';

const entry = (
  eventIndex: number,
  seat: number,
  rationale = 'because',
): ReasoningTrackEntry => ({
  eventIndex,
  seat,
  displayName: `Model ${seat}`,
  rationale,
  valid: true,
});

describe('toHttpBase', () => {
  it('maps ws schemes to their http equivalents', () => {
    expect(toHttpBase('ws://localhost:5000')).toBe('http://localhost:5000');
    expect(toHttpBase('wss://arena.example.com')).toBe(
      'https://arena.example.com',
    );
  });

  it('passes http(s) through and defaults a bare host to http', () => {
    expect(toHttpBase('http://localhost:5000')).toBe('http://localhost:5000');
    expect(toHttpBase('https://a.example.com')).toBe('https://a.example.com');
    expect(toHttpBase('localhost:5000')).toBe('http://localhost:5000');
  });

  it('returns empty for empty input', () => {
    expect(toHttpBase('  ')).toBe('');
  });
});

describe('reasoningTrackUrl', () => {
  it('builds the endpoint on the server origin', () => {
    expect(reasoningTrackUrl('ws://localhost:5000', 'game-1')).toBe(
      'http://localhost:5000/api/arena/matches/game-1/reasoning-track',
    );
  });

  it('escapes the game id and rejects unusable inputs', () => {
    expect(reasoningTrackUrl('ws://h', 'a/b')).toBe(
      'http://h/api/arena/matches/a%2Fb/reasoning-track',
    );
    expect(reasoningTrackUrl('', 'game-1')).toBeNull();
    expect(reasoningTrackUrl('ws://h', '')).toBeNull();
  });
});

describe('groupByEventIndex', () => {
  it('buckets entries by anchor, keeping served order', () => {
    const track = groupByEventIndex([
      entry(10, 0, 'first'),
      entry(10, 2, 'second'),
      entry(42, 1),
    ]);
    expect(track.size).toBe(2);
    expect(track.get(10)?.map((e) => e.rationale)).toEqual(['first', 'second']);
    expect(track.get(42)?.[0]?.seat).toBe(1);
    expect(track.get(11)).toBeUndefined();
  });
});

describe('parseReasoningTrack', () => {
  it('reads a served payload', () => {
    const track = parseReasoningTrack({
      gameId: 'g',
      entries: [
        {
          eventIndex: 3,
          seat: 1,
          displayName: 'M',
          rationale: 'r',
          valid: true,
        },
      ],
    });
    expect(track.get(3)).toEqual([
      { eventIndex: 3, seat: 1, displayName: 'M', rationale: 'r', valid: true },
    ]);
  });

  it('drops malformed entries instead of throwing', () => {
    const track = parseReasoningTrack({
      entries: [
        null,
        'nope',
        { seat: 1, rationale: 'no anchor' },
        { eventIndex: -1, seat: 1, rationale: 'negative' },
        { eventIndex: 1.5, seat: 1, rationale: 'fractional' },
        { eventIndex: 2, seat: 1, rationale: '   ' },
        { eventIndex: 4, seat: 0, rationale: 'kept' },
      ],
    });
    expect([...track.keys()]).toEqual([4]);
    // Defaults fill in for absent optional fields.
    expect(track.get(4)?.[0]?.displayName).toBe('');
    expect(track.get(4)?.[0]?.valid).toBe(true);
  });

  it('is empty for anything that is not a track', () => {
    expect(parseReasoningTrack(null).size).toBe(0);
    expect(parseReasoningTrack('x').size).toBe(0);
    expect(parseReasoningTrack({}).size).toBe(0);
    expect(parseReasoningTrack({ entries: 'x' }).size).toBe(0);
  });
});

describe('fetchReasoningTrack', () => {
  const okFetch =
    (payload: unknown): FetchLike =>
    () =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });

  it('fetches and indexes the track', async () => {
    const track = await fetchReasoningTrack(
      'ws://localhost:5000',
      'g1',
      okFetch({ entries: [{ eventIndex: 7, seat: 2, rationale: 'push' }] }),
    );
    expect(track.get(7)?.[0]?.rationale).toBe('push');
  });

  it('yields an empty track when the server has no such endpoint', async () => {
    const notFound: FetchLike = () =>
      Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
    const track = await fetchReasoningTrack('ws://h', 'g1', notFound);
    expect(track.size).toBe(0);
  });

  it('never rejects on a network or parse failure', async () => {
    const boom: FetchLike = () => Promise.reject(new Error('offline'));
    await expect(fetchReasoningTrack('ws://h', 'g1', boom)).resolves.toEqual(
      new Map(),
    );

    const badJson: FetchLike = () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.reject(new Error('not json')),
      });
    await expect(fetchReasoningTrack('ws://h', 'g1', badJson)).resolves.toEqual(
      new Map(),
    );
  });

  it('does not call fetch without a usable url', async () => {
    let called = false;
    const spy: FetchLike = () => {
      called = true;
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    };
    await fetchReasoningTrack('', 'g1', spy);
    expect(called).toBe(false);
  });
});
