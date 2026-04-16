import {
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
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
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: "calc(100% - 32px)", maxWidth: 420, m: 2 } }}
    >
      <DialogTitle>Leaderboard</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Live standings update after every round.
        </Typography>

        <Stack divider={<Divider flexItem sx={{ borderColor: "rgba(203, 213, 225, 0.08)" }} />}>
          {room.players.map((player, index) => {
            const roundPoints = pointsByPlayerId.get(player.id) ?? 0;

            return (
              <div key={player.id} className="result-row">
                <div>
                  <Typography sx={{ fontWeight: 600 }}>{index + 1}. {player.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {player.isHost ? "Current host" : roundPoints > 0 ? `+${roundPoints} this round` : "Still in it"}
                  </Typography>
                </div>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {player.score} pts
                </Typography>
              </div>
            );
          })}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default LeaderboardModal;
