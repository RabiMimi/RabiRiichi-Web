import type { IServerMessageDto } from '../proto';
import { RabiEvent } from '../lib';
import { type ClientMessageWrapper } from './messageWrapper';

export class MessageRecord {
  private readonly clientMsg: Record<number, ClientMessageWrapper> = {};
  private readonly serverMsg: Record<number, IServerMessageDto> = {};

  private maxHeartBeatId = 0;
  private maxClientMsgId = 0;
  private lastInvokedMsgId = 0;
  public maxServerMsgId = 0;

  public readonly onMessage = new RabiEvent<IServerMessageDto>();

  private invoke(msg: IServerMessageDto) {
    if (msg.respondTo) {
      const sent = this.clientMsg[msg.respondTo];
      if (sent) {
        sent.resolveResponse(msg);
      }
    }
    this.onMessage.emit(msg);
  }

  public get maxMsgId(): number {
    return this.maxClientMsgId;
  }

  public get nextMsgId(): number {
    return ++this.maxClientMsgId;
  }

  public get nextHeartBeatId(): number {
    return -++this.maxHeartBeatId;
  }

  public getMissingServerMsgIds(maxCount = 16): number[] | undefined {
    const ret: number[] = [];
    for (let i = this.lastInvokedMsgId + 1; i <= this.maxServerMsgId; i++) {
      if (i in this.serverMsg) {
        continue;
      }
      ret.push(i);
      if (ret.length >= maxCount) {
        break;
      }
    }
    return ret.length === 0 ? undefined : ret;
  }

  public onSend(msg: ClientMessageWrapper): void {
    if (msg.msg.id === undefined || msg.msg.id === null) {
      // Assigning id directly to the read-only properties might require casting or we mutate it if allowed.
      // In protobufjs, the properties are usually mutable on the plain object before encoding.
      // Since ClientMessageWrapper.msg is IClientMessageDto, we might need to cast or define it as mutable.
      const mutableMsg = msg.msg as { id?: number | null };
      mutableMsg.id = this.nextMsgId;
    }
    if (msg.msg.id !== undefined && msg.msg.id !== null) {
      this.clientMsg[msg.msg.id] = msg;
    }
  }

  public onReceive(msg: IServerMessageDto): void {
    const id = msg.id ?? 0;
    this.serverMsg[id] = msg;
    if (id <= 0) {
      this.invoke(msg);
    } else if (this.lastInvokedMsgId <= 0) {
      this.lastInvokedMsgId = id;
      this.invoke(msg);
    } else if (id === this.lastInvokedMsgId + 1) {
      let nextMsg = this.serverMsg[this.lastInvokedMsgId + 1];
      while (nextMsg) {
        this.lastInvokedMsgId++;
        this.invoke(nextMsg);
        nextMsg = this.serverMsg[this.lastInvokedMsgId + 1];
      }
    }
  }

  public onClose(): void {
    // Reject all pending client messages
    Object.values(this.clientMsg).forEach((msg) => {
      msg.rejectResponse(new Error('Connection closed'));
    });
  }

  public getClientMsgs(ids: number[]): ClientMessageWrapper[] {
    return ids
      .map((id) => this.clientMsg[id])
      .filter((msg) => msg !== undefined);
  }

  // Helper for testing
  public get lastInvokedId(): number {
    return this.lastInvokedMsgId;
  }
}
