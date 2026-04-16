import { useEffect, useState } from "react";
import { LinearProgress, Stack, Typography } from "@mui/material";

interface TimerBarProps {
  endsAt: number | null;
  durationMs: number;
  label: string;
  color?: "primary" | "secondary" | "success";
}

const TimerBar = ({ endsAt, durationMs, label, color = "primary" }: TimerBarProps) => {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!endsAt) {
      setRemainingMs(0);
      return;
    }

    const update = () => {
      setRemainingMs(Math.max(0, endsAt - Date.now()));
    };

    update();
    const intervalId = window.setInterval(update, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [endsAt]);

  if (!endsAt) {
    return null;
  }

  const progress = Math.max(0, Math.min(100, (remainingMs / durationMs) * 100));

  return (
    <Stack spacing={1}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {(remainingMs / 1000).toFixed(1)}s
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progress}
        color={color}
        sx={{
          height: 10,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.08)"
        }}
      />
    </Stack>
  );
};

export default TimerBar;
