import { Chip, Paper, Stack, Typography } from "@mui/material";
import type { RoomSnapshot } from "@shared/types";

interface LobbyProps {
  room: RoomSnapshot;
}

const Lobby = ({ room }: LobbyProps) => {
  const waitingFor = Math.max(0, room.minPlayersToStart - room.players.length);

  return (
    <Paper className="panel-card" elevation={0}>
      <Stack className="panel-stack">
        <div className="section-head">
          <div>
            <Typography variant="h3">
              {room.phase === "finished" ? "Game finished" : "Lobby"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {room.phase === "finished"
                ? "A fresh match will restart automatically if enough players stay."
                : waitingFor > 0
                  ? `Waiting for ${waitingFor} more ${waitingFor === 1 ? "player" : "players"}.`
                  : "Enough players are here. The game starts automatically."}
            </Typography>
          </div>
          <Chip label={room.isPrivate ? `Code ${room.code}` : "Public room"} color="primary" />
        </div>

        <div className="lobby-grid">
          <Typography variant="body2" color="text.secondary">
            Players draw twice each game. Extra people can still hop in as spectators and cheer from the chat.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Round flow: choose a word, draw it live, race to guess it, then watch the board shake up.
          </Typography>
          {room.winner ? (
            <Typography sx={{ fontWeight: 700 }}>
              Winner: {room.winner.name} with {room.winner.score} points
            </Typography>
          ) : null}
        </div>
      </Stack>
    </Paper>
  );
};

export default Lobby;
