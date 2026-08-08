/**
 * Self-contained replay controller for the CLI.
 *
 * The shared `replayDriver` is hardwired to the web singleton client, so the
 * CLI drives replay itself: it reuses the framework-free parse helpers
 * (`getEventsFromReplay`, `createInitialRoomFromReplay`) and steps events into
 * whichever `RabiRiichiClient` instance the CLI created, via the client's
 * `replay.*` backdoor. Playback is manual (step forward/back) so it works well
 * with keyboard control and needs no timers.
 */
import type { RabiRiichiClient } from '../net/client';
import type { IEventMsg } from '../proto';
import { UserStatus, AiType } from '../proto';
import {
  getEventsFromReplay,
  createInitialRoomFromReplay,
} from '../replay/replay';
import { applyEvent } from '../domain/reducer';
import type { RoomModel } from '../domain/model';

export class ReplayController {
  private readonly client: RabiRiichiClient;
  private events: IEventMsg[] = [];
  private initialRoom: RoomModel | null = null;
  private index = 0;

  public constructor(client: RabiRiichiClient) {
    this.client = client;
  }

  public get total(): number {
    return this.events.length;
  }

  public get progress(): number {
    return this.index;
  }

  /** Loads a replay (parsed GameLog JSON) and renders the initial room. */
  public load(replayData: unknown, perspectiveSeat = 0): void {
    this.events = getEventsFromReplay(replayData, perspectiveSeat);
    this.initialRoom = createInitialRoomFromReplay(replayData);
    this.index = 0;

    const self = this.initialRoom.players.find(
      (p) => p.seat === perspectiveSeat,
    );
    this.client.replay.setIsReplay(true);
    this.client.replay.setConnectionStatus('connected');
    this.client.replay.setSelf({
      id: self?.id ?? -1 - perspectiveSeat,
      nickname: self?.nickname ?? `Player ${perspectiveSeat}`,
      status: UserStatus.USER_STATUS_PLAYING,
      gameState: null,
      aiType: self?.aiType ?? AiType.AI_TYPE_NONE,
    });
    this.client.replay.setRoom(this.initialRoom);
    this.client.replay.setReplayTotal(this.events.length);
    this.client.replay.setReplayProgress(0);
  }

  /** Advances one event; no-op at the end. Returns whether it advanced. */
  public stepForward(): boolean {
    if (this.index >= this.events.length) return false;
    const ev = this.events[this.index];
    this.index++;
    if (ev) void this.client.replay.handleGameEvent(ev, true);
    this.client.replay.setReplayProgress(this.index);
    return true;
  }

  /**
   * Steps backward by rebuilding state from the initial room up to index-1.
   * Reducers are pure, so replaying the prefix is the simplest correct rewind.
   */
  public stepBack(): boolean {
    if (this.index <= 0 || !this.initialRoom) return false;
    this.index--;
    let room = this.initialRoom;
    for (let i = 0; i < this.index; i++) {
      const ev = this.events[i];
      if (ev) room = applyEvent(room, ev);
    }
    this.client.replay.setRoom(room);
    this.client.replay.setReplayProgress(this.index);
    return true;
  }

  /** Plays all remaining events at once (jump to end). */
  public playToEnd(): void {
    while (this.stepForward()) {
      // advance until exhausted
    }
  }

  public stop(): void {
    this.client.replay.setIsReplay(false);
    this.client.replay.setRoom(null);
  }
}
