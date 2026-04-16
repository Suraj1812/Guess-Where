import { Button, Chip, Paper, Stack, Typography } from "@mui/material";
import type { WordEntry } from "@shared/types";

interface WordChooserProps {
  choices: WordEntry[];
  onChoose: (word: string) => void;
  disabled: boolean;
}

const WordChooser = ({ choices, onChoose, disabled }: WordChooserProps) => (
  <Paper className="panel-card" elevation={0}>
    <Stack className="panel-stack">
      <div className="section-head">
        <div>
          <Typography variant="h3">Pick your word</Typography>
          <Typography variant="body2" color="text.secondary">
            Choose quickly, then start sketching.
          </Typography>
        </div>
        <Chip label="Drawer only" color="secondary" />
      </div>

      <div className="chooser-grid">
        {choices.map((choice) => (
          <Button
            key={choice.text}
            className="chooser-card"
            variant="outlined"
            fullWidth
            disabled={disabled}
            onClick={() => onChoose(choice.text)}
          >
            <Stack alignItems="flex-start" spacing={0.5}>
              <Typography sx={{ fontWeight: 700 }}>{choice.text}</Typography>
              <Typography variant="body2" color="text.secondary">
                {choice.category}
              </Typography>
            </Stack>
          </Button>
        ))}
      </div>
    </Stack>
  </Paper>
);

export default WordChooser;
