import { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import type { RoomSnapshot } from "@shared/types";
import GameLayout from "../components/GameLayout";
import { useGameSession } from "../hooks/useGameSession";
import { readStoredSession, rejoinRoom } from "../lib/socket";

interface GameRouteState {
  room: RoomSnapshot;
}

const GameRoomView = ({ room }: { room: RoomSnapshot }) => {
  const session = useGameSession(room);

  return <GameLayout session={session} />;
};

const GameRoomPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const state = location.state as GameRouteState | null;
  const [room, setRoom] = useState<RoomSnapshot | null>(state?.room ?? null);
  const [loading, setLoading] = useState(!state?.room);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state?.room || !roomId) {
      return;
    }

    const storedSession = readStoredSession();

    if (!storedSession || storedSession.roomId !== roomId) {
      setLoading(false);
      setError("No saved session was found for this room.");
      return;
    }

    void rejoinRoom(roomId, storedSession.sessionId, storedSession.name).then((response) => {
      if (!response.ok || !response.room) {
        setError(response.error ?? "Could not restore the room.");
        setLoading(false);
        return;
      }

      setRoom(response.room);
      setLoading(false);
    });
  }, [roomId, state?.room]);

  if (room) {
    return <GameRoomView room={room} />;
  }

  if (loading) {
    return (
      <Box className="app-shell join-shell">
        <Stack spacing={2} alignItems="center">
          <CircularProgress color="primary" />
          <Typography color="text.secondary">Rejoining your room...</Typography>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="app-shell join-shell">
        <Stack spacing={2} alignItems="center">
          <Typography variant="h2">Room unavailable</Typography>
          <Typography color="text.secondary" textAlign="center">
            {error}
          </Typography>
          <Button variant="contained" onClick={() => navigate("/", { replace: true })}>
            Back to home
          </Button>
        </Stack>
      </Box>
    );
  }

  return <Navigate to="/" replace />;
};

export default GameRoomPage;
