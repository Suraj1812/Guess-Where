import { startTransition, useEffect, useState } from "react";
import { SOCKET_EVENTS } from "@shared/constants";
import type { RoomSnapshot, RoundResultPayload } from "@shared/types";
import { getSocket, resetSocket, sendClue, sendGuess } from "../lib/socket";

export interface GameSessionState {
  room: RoomSnapshot;
  latestResult: RoundResultPayload | null;
  nextRoundStartAt: number | null;
  submittedGuessCode: string | null;
  error: string | null;
  connectionLost: boolean;
  submitClue: (clue: string, countryCode: string) => Promise<string | null>;
  submitGuess: (countryCode: string) => Promise<string | null>;
}

export const useGameSession = (initialRoom: RoomSnapshot, playerId: string): GameSessionState => {
  const [room, setRoom] = useState<RoomSnapshot>(initialRoom);
  const [latestResult, setLatestResult] = useState<RoundResultPayload | null>(null);
  const [nextRoundStartAt, setNextRoundStartAt] = useState<number | null>(null);
  const [submittedGuessCode, setSubmittedGuessCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionLost, setConnectionLost] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const handleRoomUpdate = (nextRoom: RoomSnapshot) => {
      startTransition(() => {
        setRoom(nextRoom);
      });
    };

    const handlePlayerJoined = ({ room: nextRoom }: { room: RoomSnapshot }) => {
      handleRoomUpdate(nextRoom);
      if (nextRoom.phase === "waiting") {
        setNextRoundStartAt(null);
      }
    };

    const handleRoundStart = ({ room: nextRoom }: { room: RoomSnapshot }) => {
      handleRoomUpdate(nextRoom);

      if (nextRoom.phase === "clue") {
        setLatestResult(null);
        setNextRoundStartAt(null);
        setSubmittedGuessCode(null);
      }
    };

    const handleRoundResult = (payload: RoundResultPayload) => {
      handleRoomUpdate(payload.room);
      setLatestResult(payload);
      setSubmittedGuessCode(null);
    };

    const handleNextRound = ({ room: nextRoom, startsAt }: { room: RoomSnapshot; startsAt: number }) => {
      handleRoomUpdate(nextRoom);
      setNextRoundStartAt(startsAt);
    };

    const handleLeaderboard = ({ room: nextRoom }: { room: RoomSnapshot }) => {
      handleRoomUpdate(nextRoom);
    };

    const handleServerError = ({ message }: { message: string }) => {
      setError(message);
    };

    const handleDisconnect = () => {
      setConnectionLost(true);
    };

    const handleConnect = () => {
      setConnectionLost(false);
    };

    socket.on(SOCKET_EVENTS.playerJoined, handlePlayerJoined);
    socket.on(SOCKET_EVENTS.startRound, handleRoundStart);
    socket.on(SOCKET_EVENTS.roundResult, handleRoundResult);
    socket.on(SOCKET_EVENTS.nextRound, handleNextRound);
    socket.on(SOCKET_EVENTS.leaderboardUpdate, handleLeaderboard);
    socket.on(SOCKET_EVENTS.serverError, handleServerError);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect", handleConnect);

    return () => {
      socket.off(SOCKET_EVENTS.playerJoined, handlePlayerJoined);
      socket.off(SOCKET_EVENTS.startRound, handleRoundStart);
      socket.off(SOCKET_EVENTS.roundResult, handleRoundResult);
      socket.off(SOCKET_EVENTS.nextRound, handleNextRound);
      socket.off(SOCKET_EVENTS.leaderboardUpdate, handleLeaderboard);
      socket.off(SOCKET_EVENTS.serverError, handleServerError);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect", handleConnect);
      resetSocket();
    };
  }, []);

  const submitClue = async (clue: string, countryCode: string): Promise<string | null> => {
    const response = await sendClue({
      roomId: room.id,
      clue,
      countryCode
    });

    if (!response.ok) {
      const message = response.error ?? "Unable to submit the clue.";
      setError(message);
      return message;
    }

    setError(null);
    return null;
  };

  const submitGuess = async (countryCode: string): Promise<string | null> => {
    const response = await sendGuess({
      roomId: room.id,
      countryCode
    });

    if (!response.ok) {
      const message = response.error ?? "Unable to submit the guess.";
      setError(message);
      return message;
    }

    setSubmittedGuessCode(countryCode);
    setError(null);
    return null;
  };

  useEffect(() => {
    if (!room.currentRound || room.currentRound.phase !== "guessing") {
      setSubmittedGuessCode(null);
      return;
    }

    if (!room.currentRound.submittedGuessIds.includes(playerId)) {
      setSubmittedGuessCode(null);
    }
  }, [playerId, room.currentRound]);

  return {
    room,
    latestResult,
    nextRoundStartAt,
    submittedGuessCode,
    error,
    connectionLost,
    submitClue,
    submitGuess
  };
};
