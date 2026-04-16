import { Avatar, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import type { PlayerSnapshot } from "@shared/types";

interface PlayerListProps {
  players: PlayerSnapshot[];
}

const PlayerList = ({ players }: PlayerListProps) => (
  <Paper className="surface-panel game-section" elevation={0}>
    <Stack spacing={1.5}>
      <div className="section-heading">
        <div>
          <Typography variant="h3">Players</Typography>
          <Typography variant="body2" color="text.secondary">
            {players.length} in the room
          </Typography>
        </div>
        <Chip label={`${players.length} online`} variant="outlined" />
      </div>

      <Stack divider={<Divider flexItem sx={{ borderColor: "rgba(203, 213, 225, 0.08)" }} />}>
        {players.map((player, index) => (
          <div key={player.id} className="player-row">
            <div className="player-main">
              <Avatar sx={{ width: 38, height: 38, bgcolor: index === 0 ? "primary.main" : "secondary.main" }}>
                {player.name.slice(0, 1).toUpperCase()}
              </Avatar>
              <div className="player-copy">
                <Typography noWrap sx={{ fontWeight: 600 }}>
                  {player.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {player.isHost ? "Current host" : index === 0 ? "Leading the room" : `Rank #${index + 1}`}
                </Typography>
              </div>
            </div>

            <Stack direction="row" spacing={1} alignItems="center">
              {player.isHost ? <Chip size="small" color="primary" label="Host" /> : null}
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {player.score} pts
              </Typography>
            </Stack>
          </div>
        ))}
      </Stack>
    </Stack>
  </Paper>
);

export default PlayerList;
