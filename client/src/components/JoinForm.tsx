import { Alert, Box, Button, Divider, Paper, Stack, TextField, Typography } from "@mui/material";

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
  <Paper className="surface-panel join-panel" elevation={0}>
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: "0.25em" }}>
          Realtime Multiplayer
        </Typography>
        <Typography variant="h1" sx={{ mb: 1.5, fontSize: { xs: "2.6rem", md: "3.4rem" } }}>
          Guess Where
        </Typography>
        <Typography color="text.secondary">
          One player drops a clue. Everyone else races to lock the right country before time runs out.
        </Typography>
      </Box>

      <TextField
        label="Display Name"
        placeholder="Type a nickname"
        value={name}
        autoComplete="nickname"
        inputProps={{ maxLength: 18 }}
        onChange={(event) => onNameChange(event.target.value)}
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button
          fullWidth
          size="large"
          variant="contained"
          disabled={!name.trim() || loadingAction !== null}
          onClick={onPlayNow}
        >
          {loadingAction === "matchmake" ? "Matching..." : "Play Now"}
        </Button>
        <Button
          fullWidth
          size="large"
          variant="outlined"
          disabled={!name.trim() || loadingAction !== null}
          onClick={onCreatePrivateRoom}
        >
          {loadingAction === "create" ? "Creating..." : "Create Private Room"}
        </Button>
      </Stack>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          fullWidth
          label="Room Code"
          placeholder="ABCDE"
          value={roomCode}
          inputProps={{ maxLength: 5 }}
          onChange={(event) => onRoomCodeChange(event.target.value.toUpperCase())}
        />
        <Button
          variant="text"
          size="large"
          disabled={!name.trim() || roomCode.trim().length < 5 || loadingAction !== null}
          onClick={onJoinRoom}
        >
          {loadingAction === "join" ? "Joining..." : "Join Room"}
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  </Paper>
);

export default JoinForm;
