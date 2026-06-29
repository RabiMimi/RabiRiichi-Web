import type {
  IClientMessageDto,
  ICreateUserResponse,
  IUserInfoResponse,
  IServerResponse,
  IServerRoomStateResponse,
  IGameConfigMsg,
  IGetInfoResponse,
} from '../proto';
import { RabiError, ServerError } from '../lib';
import { type RabiSocket } from '../transport/rabiSocket';

async function throwIfRespondError<T>(
  ws: RabiSocket,
  msg: IClientMessageDto,
  accessor: (resp: IServerResponse) => T | null | undefined,
): Promise<T> {
  const resp = await ws.send(msg).waitResponse();
  if (!resp.serverResp) {
    throw new ServerError('Server returned no response envelope');
  }
  if (resp.serverResp.serverError) {
    throw RabiError.fromProto(resp.serverResp.serverError);
  }
  const ret = accessor(resp.serverResp);
  if (ret === undefined || ret === null) {
    throw new ServerError('Server returned empty response payload');
  }
  return ret;
}

export function createUser(
  ws: RabiSocket,
  nickname: string,
): Promise<ICreateUserResponse> {
  return throwIfRespondError(
    ws,
    {
      clientRequest: {
        createUser: {
          nickname,
        },
      },
    },
    (resp) => resp.createUser,
  );
}

export function createRoom(
  ws: RabiSocket,
  config?: IGameConfigMsg,
): Promise<IServerRoomStateResponse> {
  return throwIfRespondError(
    ws,
    {
      clientRequest: {
        createRoom: {
          config: config ?? null,
        },
      },
    },
    (resp) => resp.roomState,
  );
}

export function joinRoom(
  ws: RabiSocket,
  room: number,
): Promise<IServerRoomStateResponse> {
  return throwIfRespondError(
    ws,
    {
      clientRequest: {
        joinRoom: {
          roomId: room,
        },
      },
    },
    (resp) => resp.roomState,
  );
}

export function getUserInfo(ws: RabiSocket): Promise<IUserInfoResponse> {
  return throwIfRespondError(
    ws,
    {
      clientRequest: {
        getMyInfo: {},
      },
    },
    (resp) => resp.userInfo,
  );
}

export function getInfo(ws: RabiSocket): Promise<IGetInfoResponse> {
  return throwIfRespondError(
    ws,
    {
      clientRequest: {
        getInfo: {},
      },
    },
    (resp) => resp.getInfo,
  );
}
