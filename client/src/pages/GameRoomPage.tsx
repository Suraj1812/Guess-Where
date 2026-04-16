import { Navigate, useLocation } from "react-router-dom";
import type { RoomSnapshot } from "@shared/types";
import GameLayout from "../components/GameLayout";
import { useGameSession } from "../hooks/useGameSession";

interface GameRouteState {
  room: RoomSnapshot;
  playerId: string;
}

const GameRoomView = ({ room, playerId }: GameRouteState) => {
  const session = useGameSession(room, playerId);

  return (
    <GameLayout
      room={session.room}
      currentPlayerId={playerId}
      latestResult={session.latestResult}
      nextRoundStartAt={session.nextRoundStartAt}
      submittedGuessCode={session.submittedGuessCode}
      error={session.error}
      connectionLost={session.connectionLost}
      onSubmitClue={session.submitClue}
      onSubmitGuess={session.submitGuess}
    />
  );
};

const GameRoomPage = () => {
  const location = useLocation();
  const state = location.state as GameRouteState | null;

  if (!state?.room || !state.playerId) {
    return <Navigate to="/" replace />;
  }

  return <GameRoomView room={state.room} playerId={state.playerId} />;
};

export default GameRoomPage;
