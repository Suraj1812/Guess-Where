import { useEffect, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";
import FlashOnRoundedIcon from "@mui/icons-material/FlashOnRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import { useNavigate } from "react-router-dom";
import type { JoinAck } from "@shared/types";
import JoinForm from "../components/JoinForm";
import { createPrivateRoom, joinMatchmaking, joinPrivateRoom, resetSocket } from "../lib/socket";

interface NavigationState {
  room: NonNullable<JoinAck["room"]>;
  playerId: string;
}

const JoinPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loadingAction, setLoadingAction] = useState<"matchmake" | "create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(window.localStorage.getItem("guess-where-name") ?? "");
  }, []);

  const completeJoin = (response: JoinAck) => {
    if (!response.ok || !response.room || !response.playerId) {
      throw new Error(response.error ?? "Unable to enter the game right now.");
    }

    navigate(`/game/${response.room.id}`, {
      state: {
        room: response.room,
        playerId: response.playerId
      } satisfies NavigationState
    });
  };

  const runJoinFlow = async (
    action: "matchmake" | "create" | "join",
    callback: () => Promise<JoinAck>
  ) => {
    if (!name.trim()) {
      setError("Enter a display name first.");
      return;
    }

    try {
      setLoadingAction(action);
      setError(null);
      resetSocket();
      window.localStorage.setItem("guess-where-name", name.trim());

      const response = await callback();
      completeJoin(response);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Something went wrong while joining the game.");
      resetSocket();
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Box className="page-shell">
      <Box className="ambient-orb ambient-orb-one" />
      <Box className="ambient-orb ambient-orb-two" />

      <Box sx={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1180, mx: "auto" }}>
        <Box className="hero-grid">
          <JoinForm
            name={name}
            roomCode={roomCode}
            loadingAction={loadingAction}
            error={error}
            onNameChange={setName}
            onRoomCodeChange={(value) => setRoomCode(value.replace(/[^A-Z0-9]/g, ""))}
            onPlayNow={() => {
              void runJoinFlow("matchmake", () => joinMatchmaking(name.trim()));
            }}
            onCreatePrivateRoom={() => {
              void runJoinFlow("create", () => createPrivateRoom(name.trim()));
            }}
            onJoinRoom={() => {
              void runJoinFlow("join", () => joinPrivateRoom(name.trim(), roomCode.trim()));
            }}
          />

          <Stack spacing={2.5}>
            <Box className="feature-card">
              <PublicRoundedIcon color="primary" />
              <Typography variant="h5">Instant rooms</Typography>
              <Typography color="text.secondary">
                Jump into a live public lobby or spin up a private code for your own group.
              </Typography>
            </Box>

            <Box className="feature-card">
              <ExploreRoundedIcon color="primary" />
              <Typography variant="h5">Global clues</Typography>
              <Typography color="text.secondary">
                Hosts drop a short clue, then everyone else battles over the right country.
              </Typography>
            </Box>

            <Box className="feature-card">
              <FlashOnRoundedIcon color="primary" />
              <Typography variant="h5">Speed scoring</Typography>
              <Typography color="text.secondary">
                Fast, correct guesses stack bonus points, so hesitation can cost the round.
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default JoinPage;
