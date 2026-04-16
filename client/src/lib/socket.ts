import { io, type Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@shared/constants";
import type {
  ActionAck,
  ClientToServerEvents,
  JoinAck,
  ServerToClientEvents,
  SubmitClueRequest,
  SubmitGuessRequest
} from "@shared/types";

export type GuessWhereSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GuessWhereSocket | null = null;

const getServerUrl = (): string => import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

export const getSocket = (): GuessWhereSocket => {
  if (!socket) {
    socket = io(getServerUrl(), {
      autoConnect: false,
      reconnection: false,
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

const connectSocket = async (): Promise<GuessWhereSocket> => {
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
  eventName: typeof SOCKET_EVENTS.joinGame | typeof SOCKET_EVENTS.createRoom | typeof SOCKET_EVENTS.joinRoom,
  payload: { name: string; code?: string }
): Promise<JoinAck> => {
  const gameSocket = await connectSocket();

  return new Promise((resolve) => {
    if (eventName === SOCKET_EVENTS.joinRoom) {
      gameSocket.emit(eventName, { name: payload.name, code: payload.code ?? "" }, resolve);
      return;
    }

    gameSocket.emit(eventName, { name: payload.name }, resolve);
  });
};

export const joinMatchmaking = async (name: string): Promise<JoinAck> =>
  emitJoinEvent(SOCKET_EVENTS.joinGame, { name });

export const createPrivateRoom = async (name: string): Promise<JoinAck> =>
  emitJoinEvent(SOCKET_EVENTS.createRoom, { name });

export const joinPrivateRoom = async (name: string, code: string): Promise<JoinAck> =>
  emitJoinEvent(SOCKET_EVENTS.joinRoom, { name, code });

const emitAction = async (
  eventName: typeof SOCKET_EVENTS.submitClue | typeof SOCKET_EVENTS.submitGuess,
  payload: SubmitClueRequest | SubmitGuessRequest
): Promise<ActionAck> => {
  const gameSocket = getSocket();

  if (!gameSocket.connected) {
    return {
      ok: false,
      error: "Socket is not connected."
    };
  }

  return new Promise((resolve) => {
    gameSocket.emit(eventName, payload as never, resolve);
  });
};

export const sendClue = async (payload: SubmitClueRequest): Promise<ActionAck> =>
  emitAction(SOCKET_EVENTS.submitClue, payload);

export const sendGuess = async (payload: SubmitGuessRequest): Promise<ActionAck> =>
  emitAction(SOCKET_EVENTS.submitGuess, payload);
