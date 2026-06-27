import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MessagePump } from './messagePump';
import { RabiSocket } from '../transport/rabiSocket';
import { MockWebSocket } from '../transport/mockWebSocket';
import type { IServerMessageDto } from '../proto';

describe('MessagePump', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    MockWebSocket.instances = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should dispatch room state messages', async () => {
    const socket = new RabiSocket('ws://localhost:1234');
    const pump = new MessagePump();
    pump.attach(socket);

    const handler = vi.fn();
    pump.subscribeRoomState(handler);

    const msg: IServerMessageDto = {
      id: 1,
      serverMsg: {
        roomStateMsg: { id: 1234, config: { playerCount: 2 } },
      },
    };

    socket.onMessage.emit(msg);

    // Wait for microtasks
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(msg.serverMsg?.roomStateMsg);
  });

  it('should dispatch game events', async () => {
    const socket = new RabiSocket('ws://localhost:1234');
    const pump = new MessagePump();
    pump.attach(socket);

    const handler = vi.fn();
    pump.subscribeGameEvent(handler);

    const msg: IServerMessageDto = {
      id: 1,
      event: {
        beginGameEvent: { round: 1 },
      },
    };

    socket.onMessage.emit(msg);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(msg.event);
  });

  it('should dispatch inquiries', async () => {
    const socket = new RabiSocket('ws://localhost:1234');
    const pump = new MessagePump();
    pump.attach(socket);

    const handler = vi.fn();
    pump.subscribeInquiry(handler);

    const msg: IServerMessageDto = {
      id: 42,
      serverMsg: {
        inquiry: {
          inquiry: {
            actions: [{ playTileAction: {} }], // PlayTile
          },
        },
      },
    };

    socket.onMessage.emit(msg);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      msg.serverMsg?.inquiry?.inquiry,
      42, // respondTo
    );
  });

  it('should process messages in order and wait for async handlers', async () => {
    const socket = new RabiSocket('ws://localhost:1234');
    const pump = new MessagePump();
    pump.attach(socket);

    const order: string[] = [];
    let resolveHandler1: (() => void) | undefined;
    const p1 = new Promise<void>((resolve) => {
      resolveHandler1 = resolve;
    });

    pump.subscribeGameEvent(async (ev) => {
      if (ev.beginGameEvent?.round === 1) {
        order.push('start-1');
        await p1;
        order.push('end-1');
      } else if (ev.beginGameEvent?.round === 2) {
        order.push('processed-2');
      }
    });

    socket.onMessage.emit({
      id: 1,
      event: { beginGameEvent: { round: 1 } },
    });
    socket.onMessage.emit({
      id: 2,
      event: { beginGameEvent: { round: 2 } },
    });

    // Let the first handler start
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(order).toEqual(['start-1']);

    // Resolve the first handler
    resolveHandler1?.();
    // Wait for queue to continue
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(order).toEqual(['start-1', 'end-1', 'processed-2']);
  });
});
