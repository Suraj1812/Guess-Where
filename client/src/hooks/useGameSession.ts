import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { SOCKET_EVENTS } from "@shared/constants";
import type {
  DrawEndPayload,
  DrawMovePayload,
  DrawStartPayload,
  DrawStartRequest,
  EmojiReactionPayload,
  GuessAck,
  RoomSnapshot,
  RoundEndPayload,
  StrokePoint,
  StrokeSnapshot,
  TypingStatePayload
} from "@shared/types";
import {
  chooseWord,
  clearCanvas,
  getSocket,
  persistSession,
  readStoredSession,
  rejoinRoom,
  resetSocket,
  sendDrawEnd,
  sendDrawMove,
  sendDrawStart,
  sendGuess,
  sendHeartbeat,
  sendReaction,
  sendTypingState,
  undoStroke
} from "../lib/socket";

export interface ScorePopup {
  id: string;
  label: string;
}

export interface GameSessionState {
  room: RoomSnapshot;
  roundResult: RoundEndPayload | null;
  nextTurnStartAt: number | null;
  liveStrokes: StrokeSnapshot[];
  scorePopups: ScorePopup[];
  connectionLost: boolean;
  error: string | null;
  guessFeedback: "close" | "correct" | null;
  chooseWord: (word: string) => Promise<string | null>;
  submitGuess: (guess: string) => Promise<GuessAck>;
  updateTyping: (isTyping: boolean) => void;
  react: (emoji: string) => void;
  startStroke: (stroke: Omit<DrawStartRequest, "roomId">) => Promise<string | null>;
  moveStroke: (stroke: { strokeId: string; point: StrokePoint }) => Promise<void>;
  endStroke: (stroke: { strokeId: string; point?: StrokePoint }) => Promise<void>;
  undoLastStroke: () => Promise<void>;
  clearBoard: () => Promise<void>;
  dismissRoundResult: () => void;
  clearError: () => void;
}

export const useGameSession = (initialRoom: RoomSnapshot): GameSessionState => {
  const [room, setRoom] = useState<RoomSnapshot>(initialRoom);
  const [roundResult, setRoundResult] = useState<RoundEndPayload | null>(null);
  const [nextTurnStartAt, setNextTurnStartAt] = useState<number | null>(null);
  const [liveStrokeMap, setLiveStrokeMap] = useState<Record<string, StrokeSnapshot>>({});
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const [connectionLost, setConnectionLost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guessFeedback, setGuessFeedback] = useState<"close" | "correct" | null>(null);
  const reconnectPendingRef = useRef(false);

  const participantId = room.viewer.participantId;
  const liveStrokes = useMemo(() => Object.values(liveStrokeMap), [liveStrokeMap]);

  useEffect(() => {
    const currentPlayer =
      room.players.find((player) => player.id === room.viewer.participantId)?.name ??
      room.spectators.find((spectator) => spectator.id === room.viewer.participantId)?.name ??
      "Player";

    persistSession({
      roomId: room.id,
      participantId: room.viewer.participantId,
      sessionId: room.viewer.sessionId,
      name: currentPlayer
    });
  }, [room]);

  useEffect(() => {
    const socket = getSocket();

    const replaceRoom = (nextRoom: RoomSnapshot) => {
      startTransition(() => {
        setRoom(nextRoom);
      });
    };

    const handleRoomPayload = ({ room: nextRoom }: { room: RoomSnapshot }) => {
      replaceRoom(nextRoom);
    };

    const handleTypingState = ({ playerId, isTyping }: TypingStatePayload) => {
      setRoom((currentRoom) => ({
        ...currentRoom,
        players: currentRoom.players.map((player) =>
          player.id === playerId ? { ...player, isTyping } : player
        )
      }));
    };

    const handleEmojiReaction = ({ reaction }: EmojiReactionPayload) => {
      setRoom((currentRoom) => ({
        ...currentRoom,
        recentReactions: [...currentRoom.recentReactions, reaction].slice(-10)
      }));
    };

    const handleDrawStart = (payload: DrawStartPayload) => {
      setLiveStrokeMap((currentMap) => ({
        ...currentMap,
        [payload.strokeId]: {
          id: payload.strokeId,
          color: payload.color,
          size: payload.size,
          tool: payload.tool,
          points: [payload.point]
        }
      }));
    };

    const handleDrawMove = (payload: DrawMovePayload) => {
      setLiveStrokeMap((currentMap) => {
        const stroke = currentMap[payload.strokeId];

        if (!stroke) {
          return currentMap;
        }

        return {
          ...currentMap,
          [payload.strokeId]: {
            ...stroke,
            points: [...stroke.points, payload.point]
          }
        };
      });
    };

    const handleDrawEnd = ({ stroke }: DrawEndPayload) => {
      setLiveStrokeMap((currentMap) => {
        const nextMap = { ...currentMap };
        delete nextMap[stroke.id];
        return nextMap;
      });

      setRoom((currentRoom) => {
        if (!currentRoom.currentRound) {
          return currentRoom;
        }

        return {
          ...currentRoom,
          currentRound: {
            ...currentRoom.currentRound,
            strokes: [...currentRoom.currentRound.strokes, stroke]
          }
        };
      });
    };

    const handleUndo = ({ strokeId }: { strokeId: string | null }) => {
      setLiveStrokeMap({});
      setRoom((currentRoom) => {
        if (!currentRoom.currentRound) {
          return currentRoom;
        }

        return {
          ...currentRoom,
          currentRound: {
            ...currentRoom.currentRound,
            strokes: strokeId
              ? currentRoom.currentRound.strokes.filter((stroke) => stroke.id !== strokeId)
              : currentRoom.currentRound.strokes.slice(0, -1)
          }
        };
      });
    };

    const handleClearCanvas = () => {
      setLiveStrokeMap({});
      setRoom((currentRoom) => {
        if (!currentRoom.currentRound) {
          return currentRoom;
        }

        return {
          ...currentRoom,
          currentRound: {
            ...currentRoom.currentRound,
            strokes: []
          }
        };
      });
    };

    const handleCorrectGuess = (payload: { room: RoomSnapshot; playerId: string; scoreAwarded: number }) => {
      replaceRoom(payload.room);

      if (payload.playerId === participantId) {
        setGuessFeedback("correct");
        const popupId = `${Date.now()}-${payload.scoreAwarded}`;
        setScorePopups((current) => [...current, { id: popupId, label: `+${payload.scoreAwarded}` }]);
      }
    };

    const handleRoundEnd = (payload: RoundEndPayload) => {
      replaceRoom(payload.room);
      setRoundResult(payload);
      setNextTurnStartAt(null);
      setLiveStrokeMap({});
      setGuessFeedback(null);

      const ownEntry = payload.results.find((entry) => entry.playerId === participantId);
      if (ownEntry && ownEntry.scoreDelta > 0) {
        const popupId = `${Date.now()}-${ownEntry.scoreDelta}`;
        setScorePopups((current) => [...current, { id: popupId, label: `+${ownEntry.scoreDelta}` }]);
      }
    };

    const handleNextTurn = ({ room: nextRoom, startsAt }: { room: RoomSnapshot; startsAt: number }) => {
      replaceRoom(nextRoom);
      setNextTurnStartAt(startsAt);
      if (nextRoom.phase === "choosing" || nextRoom.phase === "drawing") {
        setRoundResult(null);
      }
    };

    const handlePlayerKicked = ({
      room: nextRoom,
      playerId,
      reason
    }: {
      room: RoomSnapshot;
      playerId: string;
      reason: string;
    }) => {
      replaceRoom(nextRoom);
      if (playerId === participantId) {
        setError(reason);
      }
    };

    const handleServerError = ({ message }: { message: string }) => {
      setError(message);
    };

    const handleDisconnect = () => {
      reconnectPendingRef.current = true;
      setConnectionLost(true);
    };

    const handleConnect = () => {
      setConnectionLost(false);

      if (!reconnectPendingRef.current) {
        return;
      }

      reconnectPendingRef.current = false;
      const storedSession = readStoredSession();

      if (!storedSession || storedSession.roomId !== room.id) {
        return;
      }

      void rejoinRoom(room.id, storedSession.sessionId, storedSession.name).then((response) => {
        if (!response.ok || !response.room) {
          setError(response.error ?? "Could not reconnect to the room.");
          return;
        }

        setRoom(response.room);
        setError(null);
      });
    };

    socket.on(SOCKET_EVENTS.playerJoined, handleRoomPayload);
    socket.on(SOCKET_EVENTS.roomUpdated, handleRoomPayload);
    socket.on(SOCKET_EVENTS.startGame, handleRoomPayload);
    socket.on(SOCKET_EVENTS.startRound, handleRoomPayload);
    socket.on(SOCKET_EVENTS.chatMessage, handleRoomPayload);
    socket.on(SOCKET_EVENTS.drawStart, handleDrawStart);
    socket.on(SOCKET_EVENTS.drawMove, handleDrawMove);
    socket.on(SOCKET_EVENTS.drawEnd, handleDrawEnd);
    socket.on(SOCKET_EVENTS.undoStroke, handleUndo);
    socket.on(SOCKET_EVENTS.clearCanvas, handleClearCanvas);
    socket.on(SOCKET_EVENTS.correctGuess, handleCorrectGuess);
    socket.on(SOCKET_EVENTS.roundEnd, handleRoundEnd);
    socket.on(SOCKET_EVENTS.leaderboard, handleRoomPayload);
    socket.on(SOCKET_EVENTS.nextTurn, handleNextTurn);
    socket.on(SOCKET_EVENTS.typingState, handleTypingState);
    socket.on(SOCKET_EVENTS.emojiReaction, handleEmojiReaction);
    socket.on(SOCKET_EVENTS.playerKicked, handlePlayerKicked);
    socket.on(SOCKET_EVENTS.serverError, handleServerError);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect", handleConnect);

    return () => {
      socket.off(SOCKET_EVENTS.playerJoined, handleRoomPayload);
      socket.off(SOCKET_EVENTS.roomUpdated, handleRoomPayload);
      socket.off(SOCKET_EVENTS.startGame, handleRoomPayload);
      socket.off(SOCKET_EVENTS.startRound, handleRoomPayload);
      socket.off(SOCKET_EVENTS.chatMessage, handleRoomPayload);
      socket.off(SOCKET_EVENTS.drawStart, handleDrawStart);
      socket.off(SOCKET_EVENTS.drawMove, handleDrawMove);
      socket.off(SOCKET_EVENTS.drawEnd, handleDrawEnd);
      socket.off(SOCKET_EVENTS.undoStroke, handleUndo);
      socket.off(SOCKET_EVENTS.clearCanvas, handleClearCanvas);
      socket.off(SOCKET_EVENTS.correctGuess, handleCorrectGuess);
      socket.off(SOCKET_EVENTS.roundEnd, handleRoundEnd);
      socket.off(SOCKET_EVENTS.leaderboard, handleRoomPayload);
      socket.off(SOCKET_EVENTS.nextTurn, handleNextTurn);
      socket.off(SOCKET_EVENTS.typingState, handleTypingState);
      socket.off(SOCKET_EVENTS.emojiReaction, handleEmojiReaction);
      socket.off(SOCKET_EVENTS.playerKicked, handlePlayerKicked);
      socket.off(SOCKET_EVENTS.serverError, handleServerError);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect", handleConnect);
      resetSocket();
    };
  }, [participantId, room.id]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      sendHeartbeat({ roomId: room.id });
    }, 15_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [room.id]);

  useEffect(() => {
    if (!guessFeedback) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setGuessFeedback(null);
    }, 2_400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [guessFeedback]);

  useEffect(() => {
    if (scorePopups.length === 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setScorePopups((current) => current.slice(1));
    }, 1_800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [scorePopups]);

  const chooseWordAction = async (word: string): Promise<string | null> => {
    const response = await chooseWord({ roomId: room.id, word });

    if (!response.ok) {
      const message = response.error ?? "Could not lock in that word.";
      setError(message);
      return message;
    }

    setError(null);
    return null;
  };

  const submitGuessAction = async (guess: string): Promise<GuessAck> => {
    const response = await sendGuess({ roomId: room.id, guess });

    if (!response.ok) {
      setError(response.error ?? "Guess failed.");
      return response;
    }

    setError(null);

    if (response.closeGuess) {
      setGuessFeedback("close");
    } else if (!response.correct) {
      setGuessFeedback(null);
    }

    return response;
  };

  const startStrokeAction = async (stroke: Omit<DrawStartRequest, "roomId">): Promise<string | null> => {
    const response = await sendDrawStart({
      roomId: room.id,
      strokeId: stroke.strokeId,
      point: stroke.point,
      color: stroke.color,
      size: stroke.size,
      tool: stroke.tool
    });

    if (!response.ok) {
      const message = response.error ?? "Could not start drawing.";
      setError(message);
      return message;
    }

    setError(null);
    return null;
  };

  const moveStrokeAction = async (stroke: { strokeId: string; point: StrokePoint }): Promise<void> => {
    await sendDrawMove({
      roomId: room.id,
      strokeId: stroke.strokeId,
      point: stroke.point
    });
  };

  const endStrokeAction = async (stroke: { strokeId: string; point?: { x: number; y: number } }): Promise<void> => {
    await sendDrawEnd({
      roomId: room.id,
      strokeId: stroke.strokeId,
      point: stroke.point
    });
  };

  const undoLastStrokeAction = async (): Promise<void> => {
    await undoStroke({ roomId: room.id });
  };

  const clearBoardAction = async (): Promise<void> => {
    await clearCanvas({ roomId: room.id });
  };

  return {
    room,
    roundResult,
    nextTurnStartAt,
    liveStrokes,
    scorePopups,
    connectionLost,
    error,
    guessFeedback,
    chooseWord: chooseWordAction,
    submitGuess: submitGuessAction,
    updateTyping: (isTyping) => {
      sendTypingState({ roomId: room.id, isTyping });
    },
    react: (emoji) => {
      sendReaction({ roomId: room.id, emoji });
    },
    startStroke: startStrokeAction,
    moveStroke: moveStrokeAction,
    endStroke: endStrokeAction,
    undoLastStroke: undoLastStrokeAction,
    clearBoard: clearBoardAction,
    dismissRoundResult: () => {
      setRoundResult(null);
    },
    clearError: () => {
      setError(null);
    }
  };
};
