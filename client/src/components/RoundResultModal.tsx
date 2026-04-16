import { Dialog, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import type { RoundEndPayload } from "@shared/types";

interface RoundResultModalProps {
  open: boolean;
  result: RoundEndPayload | null;
  onClose: () => void;
}

const RoundResultModal = ({ open, result, onClose }: RoundResultModalProps) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>
      {result?.winner ? "Game result" : "Round result"}
    </DialogTitle>
    <DialogContent>
      <Stack spacing={2}>
        {result ? (
          <>
            <Typography variant="body2" color="text.secondary">
              {result.message}
            </Typography>
            <Typography variant="h2" sx={{ fontSize: "1.1rem" }}>
              Word: {result.word.text}
            </Typography>

            <Stack spacing={1.25}>
              {result.results.map((entry, index) => (
                <div key={entry.playerId} className="score-row">
                  <div>
                    <Typography sx={{ fontWeight: 700 }}>
                      {index + 1}. {entry.playerName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {entry.isDrawer
                        ? "Drawer bonus"
                        : entry.isCorrect
                          ? `Guessed in ${Math.max(1, Math.round((entry.guessedAtMs ?? 0) / 1000))}s`
                          : "No solve this round"}
                    </Typography>
                  </div>
                  <Typography sx={{ fontWeight: 700 }}>
                    {entry.scoreDelta > 0 ? `+${entry.scoreDelta}` : "0"} / {entry.totalScore}
                  </Typography>
                </div>
              ))}
            </Stack>

            {result.winner ? (
              <Typography sx={{ fontWeight: 700 }}>
                Winner: {result.winner.name} with {result.winner.score} points
              </Typography>
            ) : null}
          </>
        ) : null}
      </Stack>
    </DialogContent>
  </Dialog>
);

export default RoundResultModal;
