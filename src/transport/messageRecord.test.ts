import { describe, it, expect, vi } from 'vitest';
import { MessageRecord } from './messageRecord';
import { ClientMessageWrapper } from './messageWrapper';
import type { IServerMessageDto, IClientMessageDto } from '../proto';

describe('MessageRecord', () => {
  it('should assign monotonic IDs to sent messages', () => {
    const record = new MessageRecord();
    const msg1: IClientMessageDto = { clientMsg: { heartBeatMsg: {} } };
    const msg2: IClientMessageDto = { clientMsg: { heartBeatMsg: {} } };

    const wrapper1 = new ClientMessageWrapper(msg1);
    const wrapper2 = new ClientMessageWrapper(msg2);

    record.onSend(wrapper1);
    record.onSend(wrapper2);

    expect(wrapper1.msg.id).toBe(1);
    expect(wrapper2.msg.id).toBe(2);
    expect(record.maxMsgId).toBe(2);
  });

  it('should resolve response when respondTo matches sent message ID', async () => {
    const record = new MessageRecord();
    const msg: IClientMessageDto = {};
    const wrapper = new ClientMessageWrapper(msg);

    record.onSend(wrapper);
    const responsePromise = wrapper.waitResponse(100);

    const response: IServerMessageDto = {
      id: 1,
      respondTo: wrapper.msg.id ?? null,
    };

    record.onReceive(response);

    const resolvedResponse = await responsePromise;
    expect(resolvedResponse).toEqual(response);
  });

  it('should invoke message immediately if ID is <= 0', () => {
    const record = new MessageRecord();
    const callback = vi.fn();
    record.onMessage.subscribe(callback);

    const msg: IServerMessageDto = { id: -1 };
    record.onReceive(msg);

    expect(callback).toHaveBeenCalledWith(msg);
  });

  it('should buffer and order out-of-order messages', () => {
    const record = new MessageRecord();
    const callback = vi.fn();
    record.onMessage.subscribe(callback);

    const msg1: IServerMessageDto = { id: 1 };
    const msg2: IServerMessageDto = { id: 2 };
    const msg3: IServerMessageDto = { id: 3 };

    // Receive 2 first (should not invoke yet because lastInvoked is 0, but wait,
    // if lastInvoked <= 0, and we receive msg, we set lastInvoked = msg.id and invoke it.
    // Wait, let's look at the logic in Cocos:
    // } else if (this.lastInvokedMsgId <= 0) {
    //   this.lastInvokedMsgId = msg.id;
    //   this.invoke(msg);
    //
    // So if we receive 2 first, and lastInvoked is 0:
    // lastInvoked becomes 2, and we invoke 2.
    // That means we missed 1?
    // Wait, if it is the VERY FIRST message, does it set lastInvoked?
    // Yes, because lastInvokedMsgId is initialized to 0.
    // If the server starts sending from 1, and we receive 2 first, it might think 2 is the first one?
    // Usually we start from 1. If we receive 1 first, lastInvoked becomes 1.
    // Let's test with 1 received first, then 3, then 2.
    record.onReceive(msg1); // lastInvoked becomes 1, invokes 1
    expect(callback).toHaveBeenLastCalledWith(msg1);
    expect(record.lastInvokedId).toBe(1);

    record.onReceive(msg3); // id 3 !== lastInvoked + 1 (2), so it buffers, doesn't invoke
    expect(callback).toHaveBeenCalledTimes(1); // Still only msg1 invoked

    record.onReceive(msg2); // id 2 === lastInvoked + 1, invokes 2, then triggers 3 because it is buffered
    expect(callback).toHaveBeenCalledTimes(3);
    expect(record.lastInvokedId).toBe(3);
    expect(callback).toHaveBeenLastCalledWith(msg3);
  });

  it('should detect missing server messages', () => {
    const record = new MessageRecord();
    record.maxServerMsgId = 5;

    // Suppose we last invoked 1.
    // We have received 2 and 4. 3 is missing.
    const msg1: IServerMessageDto = { id: 1 };
    const msg2: IServerMessageDto = { id: 2 };
    const msg4: IServerMessageDto = { id: 4 };

    record.onReceive(msg1);
    record.onReceive(msg2);
    record.onReceive(msg4); // maxServerMsgId would be updated by heartbeat usually, but we set it manually here.

    // serverMsg has 1, 2, 4. lastInvoked is 2 (since 4 is out of order and 3 is missing).
    // maxServerMsgId is 5.
    // Missing should be 3 and 5 (since 5 is not in serverMsg and <= maxServerMsgId).
    const missing = record.getMissingServerMsgIds();
    expect(missing).toEqual([3, 5]);
  });

  it('should reject pending client messages on close', async () => {
    const record = new MessageRecord();
    const msg: IClientMessageDto = {};
    const wrapper = new ClientMessageWrapper(msg);

    record.onSend(wrapper);
    const promise = wrapper.waitResponse(100);

    record.onClose();

    await expect(promise).rejects.toThrow('Connection closed');
  });
});
