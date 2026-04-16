import { Chip, Paper, Stack, Typography } from "@mui/material";
import type { PlayerSnapshot } from "@shared/types";

interface ScoreBoardProps {
  players: PlayerSnapshot[];
}

const ScoreBoard = ({ players }: ScoreBoardProps) => (
  <Paper className="panel-card" elevation={0}>
    <Stack className="panel-stack">
      <div className="section-head">
        <div>
          <Typography variant="h3">Leaderboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Fast guesses pay the most
          </Typography>
        </div>
        <Chip label={`${players.length} players`} variant="outlined" />
      </div>

      <div className="score-list">
        {players.map((player, index) => (
          <div key={player.id} className="score-row">
            <div>
              <Typography sx={{ fontWeight: 700 }}>
                {index + 1}. {player.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {player.isDrawer ? "Drawer" : player.hasGuessedCorrectly ? "Already guessed" : "Still guessing"}
              </Typography>
            </div>
            <Typography sx={{ fontWeight: 700 }}>{player.score}</Typography>
          </div>
        ))}
      </div>
    </Stack>
  </Paper>
);

export default ScoreBoard;
