import { useEffect, useState } from "react";
import { LinearProgress, Stack, Typography } from "@mui/material";

interface TimerBarProps {
  endsAt: number | null;
  durationMs: number;
  label: string;
}

const TimerBar = ({ endsAt, durationMs, label }: TimerBarProps) => {
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
    const intervalId = window.setInterval(update, 150);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [endsAt]);

  if (!endsAt) {
    return null;
  }

  const progress = Math.max(0, Math.min(100, (remainingMs / durationMs) * 100));
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const pulseClassName = remainingSeconds <= 10 ? "countdown-pulse" : undefined;

  return (
    <Stack spacing={0.75} className={pulseClassName}>
      <Stack direction="row" justifyContent="space-between" gap={1}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {remainingSeconds}s
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 9,
          borderRadius: 999,
          backgroundColor: "rgba(15, 23, 42, 0.44)"
        }}
      />
    </Stack>
  );
};

export default TimerBar;
