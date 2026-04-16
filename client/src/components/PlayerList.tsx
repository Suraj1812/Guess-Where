import { Avatar, Chip, Typography } from "@mui/material";
import type { PlayerSnapshot, SpectatorSnapshot } from "@shared/types";

interface PlayerListProps {
  players: PlayerSnapshot[];
  spectators: SpectatorSnapshot[];
  currentParticipantId: string;
}

const PlayerList = ({ players, spectators, currentParticipantId }: PlayerListProps) => (
  <div className="player-strip">
    {players.map((player) => (
      <div key={player.id} className="player-pill">
        <Avatar sx={{ width: 36, height: 36, bgcolor: player.isDrawer ? "secondary.main" : "primary.main" }}>
          {player.name.slice(0, 1).toUpperCase()}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 700 }}>
            {player.name}
            {player.id === currentParticipantId ? " (You)" : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {player.isDrawer
              ? "Drawing now"
              : player.hasGuessedCorrectly
                ? "Guessed it"
                : player.isConnected
                  ? `${player.score} pts`
                  : "Reconnecting..."}
          </Typography>
        </div>
      </div>
    ))}

    {spectators.map((spectator) => (
      <div key={spectator.id} className="player-pill">
        <Avatar sx={{ width: 36, height: 36, bgcolor: "rgba(148, 163, 184, 0.18)", color: "#e2e8f0" }}>
          {spectator.name.slice(0, 1).toUpperCase()}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 700 }}>
            {spectator.name}
            {spectator.id === currentParticipantId ? " (You)" : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Spectating
          </Typography>
        </div>
        <Chip size="small" label="Spec" variant="outlined" />
      </div>
    ))}
  </div>
);

export default PlayerList;
