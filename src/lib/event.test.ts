import { describe, it, expect, vi } from 'vitest';
import { RabiEvent } from './event';

describe('RabiEvent', () => {
  it('should subscribe and emit events', () => {
    const event = new RabiEvent<number>();
    const callback = vi.fn();

    event.subscribe(callback);
    event.emit(42);

    expect(callback).toHaveBeenCalledWith(42);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe from events', () => {
    const event = new RabiEvent<number>();
    const callback = vi.fn();

    event.subscribe(callback);
    event.unsubscribe(callback);
    event.emit(42);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle once subscription', () => {
    const event = new RabiEvent<number>();
    const callback = vi.fn();

    event.once(callback);
    event.emit(42);
    event.emit(43);

    expect(callback).toHaveBeenCalledWith(42);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should clear all listeners', () => {
    const event = new RabiEvent<number>();
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    event.subscribe(callback1);
    event.subscribe(callback2);
    event.clear();
    event.emit(42);

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });
});
