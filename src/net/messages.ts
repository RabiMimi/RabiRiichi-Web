import type { UserStatus } from '../proto';
import { type RabiSocket } from '../transport/rabiSocket';

export function updateRoom(ws: RabiSocket, userStatus: UserStatus): void {
  ws.send({
    clientMsg: {
      roomUpdateMsg: {
        status: userStatus,
      },
    },
  });
}

export function respondInquiry(
  ws: RabiSocket,
  respondTo: number,
  index: number,
  response: string,
): void {
  ws.send({
    respondTo,
    clientMsg: {
      inquiryMsg: {
        index,
        response,
      },
    },
  });
}
