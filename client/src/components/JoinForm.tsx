import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import InlineMessage from "./InlineMessage";

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
  <Paper className="surface-panel join-screen" elevation={0}>
    <Stack className="section-stack">
      <Box>
        <Typography variant="h1" sx={{ mb: 1.5 }}>
          Guess Where
        </Typography>
        <Typography color="text.secondary">
          Play with anyone, guess the country, and answer fast to score more.
        </Typography>
      </Box>

      <Stack className="form-actions">
        <TextField
          label="Display name"
          placeholder="Your name"
          value={name}
          autoComplete="nickname"
          inputProps={{ maxLength: 18 }}
          onChange={(event) => onNameChange(event.target.value)}
        />

        <Button
          fullWidth
          size="large"
          variant="contained"
          disabled={!name.trim() || loadingAction !== null}
          onClick={onPlayNow}
        >
          {loadingAction === "matchmake" ? "Finding a room..." : "Play Now"}
        </Button>

        <Button
          fullWidth
          size="large"
          variant="outlined"
          disabled={!name.trim() || loadingAction !== null}
          onClick={onCreatePrivateRoom}
        >
          {loadingAction === "create" ? "Creating room..." : "Create Private Room"}
        </Button>

        <Box className="join-code-group">
          <Typography className="join-code-label">Join with a room code</Typography>
          <TextField
            fullWidth
            label="Room code"
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
            {loadingAction === "join" ? "Joining room..." : "Join Room"}
          </Button>
        </Box>

        <InlineMessage message={error} />
      </Stack>
    </Stack>
  </Paper>
);

export default JoinForm;
