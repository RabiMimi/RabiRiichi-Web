import { vi } from 'vitest';

const readyStateMap = new WeakMap<object, number>();

export class MockWebSocket {
  public static readonly CONNECTING = 0;
  public static readonly OPEN = 1;
  public static readonly CLOSING = 2;
  public static readonly CLOSED = 3;

  public binaryType = 'blob';
  private readonly listeners: Record<
    string,
    Set<EventListenerOrEventListenerObject>
  > = {};

  public static instances: MockWebSocket[] = [];

  public url: string;

  constructor(url: string) {
    this.url = url;
    readyStateMap.set(this, 0);
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      this.triggerOpen();
    }, 10);
  }

  public get readyState(): number {
    return readyStateMap.get(this) ?? 0;
  }

  public set readyState(val: number) {
    readyStateMap.set(this, val);
  }

  public addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
  ) {
    if (!listener) {
      return;
    }
    this.listeners[type] ??= new Set();
    this.listeners[type].add(listener);
  }

  public removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
  ) {
    if (!listener) {
      return;
    }
    if (this.listeners[type]) {
      this.listeners[type].delete(listener);
    }
  }

  public send = vi.fn<(data: ArrayBuffer | SharedArrayBuffer) => void>();
  public close = vi.fn<() => void>(() => {
    readyStateMap.set(this, 3);
    this.trigger('close', {});
  });

  public trigger(type: string, event: unknown) {
    if (this.listeners[type]) {
      this.listeners[type].forEach((l) => {
        if (typeof l === 'function') {
          l(event as Event);
        } else if (typeof l.handleEvent === 'function') {
          l.handleEvent(event as Event);
        }
      });
    }
  }

  public triggerOpen() {
    readyStateMap.set(this, 1);
    this.trigger('open', {});
  }

  public triggerMessage(data: ArrayBuffer | SharedArrayBuffer) {
    this.trigger('message', { data });
  }

  public triggerClose() {
    readyStateMap.set(this, 3);
    this.trigger('close', {});
  }
}
