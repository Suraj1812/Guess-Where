import { Typography } from "@mui/material";

interface InlineMessageProps {
  message?: string | null;
  tone?: "error" | "info";
  align?: "left" | "center";
}

const InlineMessage = ({
  message,
  tone = "error",
  align = "left"
}: InlineMessageProps) => (
  <Typography
    aria-live="polite"
    className="inline-message"
    color={tone === "error" ? "error.main" : "text.secondary"}
    role={message && tone === "error" ? "alert" : undefined}
    sx={{ textAlign: align }}
  >
    {message ?? "\u00A0"}
  </Typography>
);

export default InlineMessage;
