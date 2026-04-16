import { useState } from "react";
import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { JoinAck, RoomSnapshot } from "@shared/types";
import JoinForm from "../components/JoinForm";
import {
  clearStoredSession,
  createPrivateRoom,
  joinMatchmaking,
  joinPrivateRoom,
  persistSession,
  resetSocket
} from "../lib/socket";

interface NavigationState {
  room: RoomSnapshot;
}

const JoinPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loadingAction, setLoadingAction] = useState<"matchmake" | "create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const completeJoin = (response: JoinAck) => {
    if (!response.ok || !response.room || !response.sessionId) {
      throw new Error(response.error ?? "Could not enter the room.");
    }

    persistSession({
      roomId: response.room.id,
      participantId: response.room.viewer.participantId,
      sessionId: response.sessionId,
      name: name.trim()
    });

    navigate(`/game/${response.room.id}`, {
      state: {
        room: response.room
      } satisfies NavigationState
    });
  };

  const runJoin = async (
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
      clearStoredSession();
      resetSocket();
      const response = await callback();
      completeJoin(response);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Something went wrong while joining.");
      resetSocket();
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Box className="app-shell join-shell">
      <JoinForm
        name={name}
        roomCode={roomCode}
        loadingAction={loadingAction}
        error={error}
        onNameChange={setName}
        onRoomCodeChange={(value) => setRoomCode(value.replace(/[^A-Z0-9]/g, ""))}
        onPlayNow={() => {
          void runJoin("matchmake", () => joinMatchmaking(name.trim()));
        }}
        onCreatePrivateRoom={() => {
          void runJoin("create", () => createPrivateRoom(name.trim()));
        }}
        onJoinRoom={() => {
          void runJoin("join", () => joinPrivateRoom(name.trim(), roomCode.trim()));
        }}
      />
    </Box>
  );
};

export default JoinPage;
