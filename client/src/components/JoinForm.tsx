import { Button, Paper, Stack, TextField, Typography } from "@mui/material";

interface JoinFormProps {
  name: string;
  roomCode: string;
  loadingAction: "matchmake" | "create" | "join" | null;
  error: string | null;
  onNameChange: (value: string) => void;
  onRoomCodeChange: (value: string) => void;
  onPlayNow: () => void;
  onCreatePrivateRoom: () => void;
  onJoinRoom: () => void;
}

const JoinForm = ({
  name,
  roomCode,
  loadingAction,
  error,
  onNameChange,
  onRoomCodeChange,
  onPlayNow,
  onCreatePrivateRoom,
  onJoinRoom
}: JoinFormProps) => (
  <Paper className="join-card" elevation={0}>
    <Stack className="join-stack">
      <div className="join-logo">
        <Typography variant="h1">Draw Clash</Typography>
        <Typography color="text.secondary">
          Fast rooms, live drawing, loud guesses, and just enough chaos to make you queue again.
        </Typography>
      </div>

      <TextField
        label="Display name"
        placeholder="Your drawing alias"
        value={name}
        autoComplete="nickname"
        inputProps={{ maxLength: 18 }}
        onChange={(event) => onNameChange(event.target.value)}
      />

      <Button fullWidth variant="contained" size="large" disabled={!name.trim() || loadingAction !== null} onClick={onPlayNow}>
        {loadingAction === "matchmake" ? "Finding room..." : "Play Now"}
      </Button>

      <Button
        fullWidth
        variant="outlined"
        size="large"
        disabled={!name.trim() || loadingAction !== null}
        onClick={onCreatePrivateRoom}
      >
        {loadingAction === "create" ? "Creating room..." : "Private Room"}
      </Button>

      <div className="join-room-row">
        <TextField
          label="Join code"
          placeholder="ABCDE"
          value={roomCode}
          inputProps={{ maxLength: 5 }}
          onChange={(event) => onRoomCodeChange(event.target.value.toUpperCase())}
        />
        <Button
          fullWidth
          variant="outlined"
          size="large"
          disabled={!name.trim() || roomCode.trim().length < 5 || loadingAction !== null}
          onClick={onJoinRoom}
        >
          {loadingAction === "join" ? "Joining..." : "Join Room"}
        </Button>
      </div>

      <Typography className="inline-note" color="error.main">
        {error ?? "\u00A0"}
      </Typography>
    </Stack>
  </Paper>
);

export default JoinForm;
