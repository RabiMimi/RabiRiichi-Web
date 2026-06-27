import type {
  IServerMessageDto,
  IServerRoomStateMsg,
  IEventMsg,
  ISinglePlayerInquiryMsg,
} from '../proto';
import { type RabiSocket } from '../transport/rabiSocket';
import { Logger } from '../lib';

export type RoomStateHandler = (
  msg: IServerRoomStateMsg,
) => void | Promise<void>;
export type GameEventHandler = (event: IEventMsg) => void | Promise<void>;
export type InquiryHandler = (
  inquiry: ISinglePlayerInquiryMsg,
  respondTo: number,
) => void | Promise<void>;

export class MessagePump {
  private readonly logger = new Logger('MessagePump');
  private readonly queue: IServerMessageDto[] = [];
  private isProcessing = false;
  private socket: RabiSocket | null = null;

  private readonly roomStateHandlers = new Set<RoomStateHandler>();
  private readonly gameEventHandlers = new Set<GameEventHandler>();
  private readonly inquiryHandlers = new Set<InquiryHandler>();

  public attach(socket: RabiSocket): void {
    if (this.socket) {
      this.detach();
    }
    this.socket = socket;
    socket.onMessage.subscribe(this.handleMessage);
  }

  public detach(): void {
    if (this.socket) {
      this.socket.onMessage.unsubscribe(this.handleMessage);
      this.socket = null;
    }
    this.queue.length = 0; // Clear queue on detach
  }

  public subscribeRoomState(handler: RoomStateHandler): () => void {
    this.roomStateHandlers.add(handler);
    return () => this.roomStateHandlers.delete(handler);
  }

  public subscribeGameEvent(handler: GameEventHandler): () => void {
    this.gameEventHandlers.add(handler);
    return () => this.gameEventHandlers.delete(handler);
  }

  public subscribeInquiry(handler: InquiryHandler): () => void {
    this.inquiryHandlers.add(handler);
    return () => this.inquiryHandlers.delete(handler);
  }

  private handleMessage = (msg: IServerMessageDto): void => {
    this.queue.push(msg);
    void this.processQueue();
  };

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;

    try {
      let msg = this.queue.shift();
      while (msg !== undefined) {
        await this.dispatchMessage(msg);
        msg = this.queue.shift();
      }
    } catch (e) {
      this.logger.error('Error processing message queue', e);
    } finally {
      this.isProcessing = false;
    }
  }

  private async dispatchMessage(msg: IServerMessageDto): Promise<void> {
    this.logger.debug('Dispatching message', msg);

    // 1. Room State
    if (msg.serverMsg?.roomStateMsg) {
      for (const handler of this.roomStateHandlers) {
        try {
          await handler(msg.serverMsg.roomStateMsg);
        } catch (e) {
          this.logger.error('Error in room state handler', e);
        }
      }
    }

    // 2. Game Event
    if (msg.event) {
      for (const handler of this.gameEventHandlers) {
        try {
          await handler(msg.event);
        } catch (e) {
          this.logger.error('Error in game event handler', e);
        }
      }
    }

    // 3. Inquiry
    const inquiryMsg = msg.serverMsg?.inquiry;
    if (inquiryMsg?.inquiry && msg.id !== undefined && msg.id !== null) {
      for (const handler of this.inquiryHandlers) {
        try {
          await handler(inquiryMsg.inquiry, msg.id);
        } catch (e) {
          this.logger.error('Error in inquiry handler', e);
        }
      }
    }
  }

  // Helper for testing
  public get queueLength(): number {
    return this.queue.length;
  }
}
