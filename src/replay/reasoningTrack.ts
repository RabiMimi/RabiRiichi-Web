/**
 * Reasoning track: the per-decision rationales an Arena server records for a
 * match, anchored to the replay's event stream.
 *
 * The replay itself cannot carry them — `GameLogMsg` holds only events and
 * inquiries — so the Arena serves them beside it, each entry tagged with the
 * index of the event its decision produced. That index is the same one the
 * replay driver walks, so showing a line is a map lookup, not a heuristic.
 *
 * This is Arena-only and strictly additive: a plain game server has no such
 * endpoint, the fetch fails, and replays behave exactly as before.
 */

export interface ReasoningTrackEntry {
  /** Index into the replay's event-only stream. */
  readonly eventIndex: number;
  readonly seat: number;
  readonly displayName: string;
  readonly rationale: string;
  /** False when the model failed and the safe default was played. */
  readonly valid: boolean;
}

/** Entries keyed by the event index they are anchored to. */
export type ReasoningTrack = ReadonlyMap<
  number,
  readonly ReasoningTrackEntry[]
>;

export const EMPTY_REASONING_TRACK: ReasoningTrack = new Map();

/** Minimal shape of `fetch`, so tests can inject one. */
export type FetchLike = (url: string) => Promise<{
  ok: boolean;
  json: () => Promise<unknown>;
}>;

/**
 * The http(s) origin serving the Arena's REST API, derived from the ws(s) base
 * the replay socket used. Mirrors `wsUrl.ts`: a bare host defaults to insecure.
 */
export function toHttpBase(serverBase: string): string {
  const base = serverBase.trim();
  if (!base) return '';
  if (base.startsWith('ws://')) return `http://${base.slice('ws://'.length)}`;
  if (base.startsWith('wss://'))
    return `https://${base.slice('wss://'.length)}`;
  if (base.startsWith('http://') || base.startsWith('https://')) return base;
  return `http://${base}`;
}

/** Endpoint for a match's reasoning track, or null if the inputs are unusable. */
export function reasoningTrackUrl(
  serverBase: string,
  gameId: string,
): string | null {
  const httpBase = toHttpBase(serverBase);
  if (!httpBase || !gameId) return null;
  try {
    return new URL(
      `/api/arena/matches/${encodeURIComponent(gameId)}/reasoning-track`,
      httpBase,
    ).href;
  } catch {
    return null;
  }
}

/** Groups entries by anchor, preserving their served order within each anchor. */
export function groupByEventIndex(
  entries: readonly ReasoningTrackEntry[],
): ReasoningTrack {
  const byEvent = new Map<number, ReasoningTrackEntry[]>();
  for (const entry of entries) {
    const bucket = byEvent.get(entry.eventIndex);
    if (bucket) {
      bucket.push(entry);
    } else {
      byEvent.set(entry.eventIndex, [entry]);
    }
  }
  return byEvent;
}

function asEntry(value: unknown): ReasoningTrackEntry | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const eventIndex = raw.eventIndex;
  const seat = raw.seat;
  const rationale = raw.rationale;
  if (
    typeof eventIndex !== 'number' ||
    !Number.isInteger(eventIndex) ||
    eventIndex < 0 ||
    typeof seat !== 'number' ||
    typeof rationale !== 'string' ||
    !rationale.trim()
  ) {
    return null;
  }
  return {
    eventIndex,
    seat,
    displayName: typeof raw.displayName === 'string' ? raw.displayName : '',
    rationale,
    valid: raw.valid !== false,
  };
}

/** Reads a served payload defensively; anything malformed is simply dropped. */
export function parseReasoningTrack(payload: unknown): ReasoningTrack {
  if (typeof payload !== 'object' || payload === null) {
    return EMPTY_REASONING_TRACK;
  }
  const entries = (payload as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) return EMPTY_REASONING_TRACK;
  const parsed = entries
    .map(asEntry)
    .filter((entry): entry is ReasoningTrackEntry => entry !== null);
  return groupByEventIndex(parsed);
}

/**
 * Fetches the track for a replay. Never throws and never rejects: a server
 * without the endpoint (any plain game server) just yields an empty track, and
 * the replay plays without rationales.
 */
export async function fetchReasoningTrack(
  serverBase: string,
  gameId: string,
  fetchImpl?: FetchLike,
): Promise<ReasoningTrack> {
  const url = reasoningTrackUrl(serverBase, gameId);
  const doFetch =
    fetchImpl ??
    (typeof globalThis.fetch === 'function'
      ? (target: string) => globalThis.fetch(target)
      : null);
  if (!url || !doFetch) return EMPTY_REASONING_TRACK;
  try {
    const response = await doFetch(url);
    if (!response.ok) return EMPTY_REASONING_TRACK;
    return parseReasoningTrack(await response.json());
  } catch {
    return EMPTY_REASONING_TRACK;
  }
}
