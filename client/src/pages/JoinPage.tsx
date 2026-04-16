import { useEffect, useState } from "react";
import { Box } from "@mui/material";
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
    <Box className="page-shell page-shell--centered">
      <Box className="screen-frame">
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
      </Box>
    </Box>
  );
};

export default JoinPage;
