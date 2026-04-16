import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { CHAT_MAX_LENGTH, REACTION_OPTIONS } from "@shared/constants";
import type { ChatMessage, GuessAck, PlayerSnapshot } from "@shared/types";

interface ChatBoxProps {
  messages: ChatMessage[];
  players: PlayerSnapshot[];
  canGuess: boolean;
  isDrawer: boolean;
  isSpectator: boolean;
  guessFeedback: "close" | "correct" | null;
  onSendGuess: (guess: string) => Promise<GuessAck>;
  onTypingChange: (isTyping: boolean) => void;
  onReact: (emoji: string) => void;
}

const ChatBox = ({
  messages,
  players,
  canGuess,
  isDrawer,
  isSpectator,
  guessFeedback,
  onSendGuess,
  onTypingChange,
  onReact
}: ChatBoxProps) => {
  const [guess, setGuess] = useState("");
  const feedRef = useRef<HTMLDivElement | null>(null);

  const typingNames = useMemo(
    () => players.filter((player) => player.isTyping).map((player) => player.name),
    [players]
  );

  useEffect(() => {
    feedRef.current?.scrollTo({
      top: feedRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages]);

  const sendMessage = async () => {
    const trimmedGuess = guess.trim();

    if (!trimmedGuess || !canGuess) {
      return;
    }

    const response = await onSendGuess(trimmedGuess);

    if (response.ok) {
      setGuess("");
      onTypingChange(false);
    }
  };

  return (
    <Paper className="panel-card" elevation={0}>
      <Stack className="chat-shell">
        <div className="section-head">
          <div>
            <Typography variant="h3">Live guesses</Typography>
            <Typography variant="body2" color="text.secondary">
              {isDrawer
                ? "Watch the chat and reactions roll in."
                : isSpectator
                  ? "Spectators can react, but only players can guess."
                  : "Type fast and hit enter to send."}
            </Typography>
          </div>
        </div>

        <div ref={feedRef} className="chat-feed">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-line ${
                message.kind === "system"
                  ? "chat-line--system"
                  : message.kind === "success"
                    ? "chat-line--success"
                    : ""
              }`}
            >
              <Typography sx={{ fontWeight: 700 }}>{message.playerName}</Typography>
              <Typography variant="body2" color={message.kind === "guess" ? "text.primary" : "text.secondary"}>
                {message.text}
              </Typography>
            </div>
          ))}
        </div>

        <div className="reaction-row">
          {REACTION_OPTIONS.map((emoji) => (
            <Button key={emoji} variant="outlined" size="small" onClick={() => onReact(emoji)}>
              {emoji}
            </Button>
          ))}
        </div>

        <Typography className="typing-row">
          {guessFeedback === "close"
            ? "Close guess. You are almost there."
            : guessFeedback === "correct"
              ? "Correct. Sit back and watch the rest."
              : typingNames.length > 0
                ? `${typingNames.join(", ")} ${typingNames.length === 1 ? "is" : "are"} typing...`
                : "\u00A0"}
        </Typography>

        <div className="chat-form">
          <TextField
            value={guess}
            placeholder={
              isDrawer
                ? "You are drawing this round"
                : isSpectator
                  ? "Spectating this game"
                  : "Type your guess"
            }
            disabled={!canGuess}
            inputProps={{ maxLength: CHAT_MAX_LENGTH }}
            onChange={(event) => {
              const value = event.target.value;
              setGuess(value);
              onTypingChange(Boolean(value.trim()));
            }}
            onBlur={() => onTypingChange(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void sendMessage();
              }
            }}
          />
          <Button fullWidth variant="contained" disabled={!canGuess || !guess.trim()} onClick={() => void sendMessage()}>
            Send Guess
          </Button>
        </div>
      </Stack>
    </Paper>
  );
};

export default ChatBox;
