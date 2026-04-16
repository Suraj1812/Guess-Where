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
    const intervalId = window.setInterval(update, 200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [endsAt]);

  if (!endsAt) {
    return null;
  }

  const progress = Math.max(0, Math.min(100, (remainingMs / durationMs) * 100));
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {remainingSeconds}s
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progress}
        color={color}
        sx={{
          height: 8,
          borderRadius: 999,
          backgroundColor: "rgba(203, 213, 225, 0.12)"
        }}
      />
    </Stack>
  );
};

export default TimerBar;
