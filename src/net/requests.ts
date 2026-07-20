import type {
  IClientMessageDto,
  IUserInfoResponse,
  IServerResponse,
  IServerRoomStateResponse,
  IGameConfigMsg,
  IGetInfoResponse,
  AiType,
  ILlmAiConfig,
  IGameLogMsg,
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
  username: string,
  nickname: string,
  passwordHash: string,
): Promise<IUserInfoResponse> {
  return throwIfRespondError(
    ws,
    {
      clientRequest: {
        createUser: {
          username,
          userData: {
            nickname,
          },
          passwordHash,
        },
      },
    },
    (resp) => resp.userInfo,
  );
}

export function loginUser(
  ws: RabiSocket,
  username: string,
  passwordHash: string,
): Promise<IUserInfoResponse> {
  return throwIfRespondError(
    ws,
    {
      clientRequest: {
        loginUser: {
          username,
          passwordHash,
        },
      },
    },
    (resp) => resp.userInfo,
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

export function addAi(
  ws: RabiSocket,
  type: AiType,
  llmConfig?: ILlmAiConfig,
): Promise<IServerRoomStateResponse> {
  return throwIfRespondError(
    ws,
    {
      clientRequest: {
        addAi: {
          type,
          llmConfig: llmConfig ?? null,
        },
      },
    },
    (resp) => resp.roomState,
  );
}

export function removeRoomPlayer(
  ws: RabiSocket,
  id: number,
): Promise<IServerRoomStateResponse> {
  return throwIfRespondError(
    ws,
    {
      clientRequest: {
        removeRoomPlayer: {
          id,
        },
      },
    },
    (resp) => resp.roomState,
  );
}

export function getReplay(
  ws: RabiSocket,
  gameId: string,
): Promise<IGameLogMsg> {
  return throwIfRespondError(
    ws,
    {
      clientRequest: {
        getReplay: {
          gameId,
        },
      },
    },
    (resp) => resp.replay,
  );
}
