import { io, type Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@shared/constants";
import type {
  ActionAck,
  ChooseWordRequest,
  ClientToServerEvents,
  DrawEndRequest,
  DrawMoveRequest,
  DrawStartRequest,
  EmojiReactionRequest,
  GuessAck,
  GuessRequest,
  HeartbeatRequest,
  JoinAck,
  JoinRequest,
  JoinPrivateRoomRequest,
  RejoinRoomRequest,
  RoomActionRequest,
  ServerToClientEvents,
  TypingStateRequest
} from "@shared/types";

export type DrawClashSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface StoredSession {
  roomId: string;
  participantId: string;
  sessionId: string;
  name: string;
}

const STORAGE_KEY = "draw-clash-session";

let socket: DrawClashSocket | null = null;

const getServerUrl = (): string => import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

export const getSocket = (): DrawClashSocket => {
  if (!socket) {
    socket = io(getServerUrl(), {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 8,
      transports: ["websocket", "polling"]
    });
  }

  return socket;
};

export const resetSocket = (): void => {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};

export const readStoredSession = (): StoredSession | null => {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const persistSession = (session: StoredSession): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const clearStoredSession = (): void => {
  window.localStorage.removeItem(STORAGE_KEY);
};

const connectSocket = async (): Promise<DrawClashSocket> => {
  const gameSocket = getSocket();

  if (gameSocket.connected) {
    return gameSocket;
  }

  return new Promise((resolve, reject) => {
    const handleConnect = () => {
      gameSocket.off("connect", handleConnect);
      gameSocket.off("connect_error", handleError);
      resolve(gameSocket);
    };

    const handleError = (error: Error) => {
      gameSocket.off("connect", handleConnect);
      gameSocket.off("connect_error", handleError);
      reject(error);
    };

    gameSocket.once("connect", handleConnect);
    gameSocket.once("connect_error", handleError);
    gameSocket.connect();
  });
};

const emitJoinEvent = async (
  eventName:
    | typeof SOCKET_EVENTS.joinGame
    | typeof SOCKET_EVENTS.createRoom
    | typeof SOCKET_EVENTS.joinRoom
    | typeof SOCKET_EVENTS.rejoinRoom,
  payload: JoinRequest | JoinPrivateRoomRequest | RejoinRoomRequest
): Promise<JoinAck> => {
  const gameSocket = await connectSocket();

  return new Promise((resolve) => {
    gameSocket.emit(eventName, payload as never, resolve);
  });
};

export const joinMatchmaking = async (name: string): Promise<JoinAck> =>
  emitJoinEvent(SOCKET_EVENTS.joinGame, { name });

export const createPrivateRoom = async (name: string): Promise<JoinAck> =>
  emitJoinEvent(SOCKET_EVENTS.createRoom, { name });

export const joinPrivateRoom = async (name: string, code: string): Promise<JoinAck> =>
  emitJoinEvent(SOCKET_EVENTS.joinRoom, { name, code });

export const rejoinRoom = async (
  roomId: string,
  sessionId: string,
  name?: string
): Promise<JoinAck> =>
  emitJoinEvent(SOCKET_EVENTS.rejoinRoom, {
    roomId,
    sessionId,
    name
  });

const emitAckAction = async <TRequest extends object, TAck extends ActionAck | GuessAck>(
  eventName: string,
  payload: TRequest
): Promise<TAck> => {
  const gameSocket = getSocket();

  if (!gameSocket.connected) {
    return {
      ok: false,
      error: "Socket is not connected."
    } as TAck;
  }

  return new Promise((resolve) => {
    (gameSocket.emit as (...args: unknown[]) => void)(eventName, payload, resolve);
  });
};

export const chooseWord = (payload: ChooseWordRequest): Promise<ActionAck> =>
  emitAckAction<ChooseWordRequest, ActionAck>(SOCKET_EVENTS.chooseWord, payload);

export const sendDrawStart = (payload: DrawStartRequest): Promise<ActionAck> =>
  emitAckAction<DrawStartRequest, ActionAck>(SOCKET_EVENTS.drawStart, payload);

export const sendDrawMove = (payload: DrawMoveRequest): Promise<ActionAck> =>
  emitAckAction<DrawMoveRequest, ActionAck>(SOCKET_EVENTS.drawMove, payload);

export const sendDrawEnd = (payload: DrawEndRequest): Promise<ActionAck> =>
  emitAckAction<DrawEndRequest, ActionAck>(SOCKET_EVENTS.drawEnd, payload);

export const undoStroke = (payload: RoomActionRequest): Promise<ActionAck> =>
  emitAckAction<RoomActionRequest, ActionAck>(SOCKET_EVENTS.undoStroke, payload);

export const clearCanvas = (payload: RoomActionRequest): Promise<ActionAck> =>
  emitAckAction<RoomActionRequest, ActionAck>(SOCKET_EVENTS.clearCanvas, payload);

export const sendGuess = (payload: GuessRequest): Promise<GuessAck> =>
  emitAckAction<GuessRequest, GuessAck>(SOCKET_EVENTS.sendGuess, payload);

export const sendTypingState = (payload: TypingStateRequest): void => {
  const gameSocket = getSocket();

  if (gameSocket.connected) {
    gameSocket.emit(SOCKET_EVENTS.typingState, payload);
  }
};

export const sendReaction = (payload: EmojiReactionRequest): void => {
  const gameSocket = getSocket();

  if (gameSocket.connected) {
    gameSocket.emit(SOCKET_EVENTS.emojiReaction, payload);
  }
};

export const sendHeartbeat = (payload: HeartbeatRequest): void => {
  const gameSocket = getSocket();

  if (gameSocket.connected) {
    gameSocket.emit(SOCKET_EVENTS.heartbeat, payload);
  }
};
