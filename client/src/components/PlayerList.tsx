import { Avatar, Chip, List, ListItem, ListItemAvatar, ListItemText, Paper, Stack, Typography } from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import type { PlayerSnapshot } from "@shared/types";

interface PlayerListProps {
  players: PlayerSnapshot[];
}

const PlayerList = ({ players }: PlayerListProps) => (
  <Paper className="surface-panel" elevation={0}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
      <Typography variant="h5">Players</Typography>
      <Chip icon={<EmojiEventsRoundedIcon />} label={`${players.length} online`} variant="outlined" />
    </Stack>

    <List disablePadding>
      {players.map((player, index) => (
        <ListItem
          key={player.id}
          disableGutters
          secondaryAction={
            <Stack direction="row" spacing={1} alignItems="center">
              {player.isHost ? <Chip size="small" color="primary" label="Host" /> : null}
              <Chip size="small" label={`${player.score} pts`} />
            </Stack>
          }
          sx={{
            py: 1.2,
            px: 0,
            borderBottom: index === players.length - 1 ? "none" : "1px solid rgba(255,255,255,0.06)"
          }}
        >
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: index === 0 ? "primary.main" : "rgba(255,255,255,0.12)", color: "#06151f" }}>
              {player.name.slice(0, 1).toUpperCase()}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={player.name}
            secondary={index === 0 ? "Leading the room" : `Rank #${index + 1}`}
            secondaryTypographyProps={{ color: "text.secondary" }}
          />
        </ListItem>
      ))}
    </List>
  </Paper>
);

export default PlayerList;
