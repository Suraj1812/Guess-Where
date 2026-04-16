import {
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography
} from "@mui/material";
import type { RoomSnapshot, RoundResultPayload } from "@shared/types";

interface LeaderboardModalProps {
  open: boolean;
  onClose: () => void;
  room: RoomSnapshot;
  latestResult: RoundResultPayload | null;
}

const LeaderboardModal = ({ open, onClose, room, latestResult }: LeaderboardModalProps) => {
  const pointsByPlayerId = new Map(
    latestResult?.results.map((entry) => [entry.playerId, entry.pointsEarned]) ?? []
  );

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <DialogTitle>Leaderboard</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Live standings update after every round.
        </Typography>

        <List disablePadding>
          {room.players.map((player, index) => {
            const roundPoints = pointsByPlayerId.get(player.id) ?? 0;

            return (
              <ListItem
                key={player.id}
                disableGutters
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    {roundPoints > 0 ? <Chip size="small" color="success" label={`+${roundPoints}`} /> : null}
                    <Chip size="small" label={`${player.score} pts`} />
                  </Stack>
                }
                sx={{
                  py: 1.25,
                  borderBottom:
                    index === room.players.length - 1 ? "none" : "1px solid rgba(255,255,255,0.08)"
                }}
              >
                <ListItemText
                  primary={`${index + 1}. ${player.name}`}
                  secondary={player.isHost ? "Current host" : "Ready for the next turn"}
                />
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
    </Dialog>
  );
};

export default LeaderboardModal;
