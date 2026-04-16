import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import FullscreenExitRoundedIcon from "@mui/icons-material/FullscreenExitRounded";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import DrawRoundedIcon from "@mui/icons-material/DrawRounded";
import { DRAW_ROUND_MS, GAME_TITLE, WORD_CHOICE_MS } from "@shared/constants";
import type { DrawingTool } from "@shared/types";
import type { GameSessionState } from "../hooks/useGameSession";
import CanvasBoard from "./CanvasBoard";
import ChatBox from "./ChatBox";
import Lobby from "./Lobby";
import PlayerList from "./PlayerList";
import RoundResultModal from "./RoundResultModal";
import ScoreBoard from "./ScoreBoard";
import TimerBar from "./TimerBar";
import ToolBar from "./ToolBar";
import WordChooser from "./WordChooser";

interface GameLayoutProps {
  session: GameSessionState;
}

const playTone = (frequency: number, duration: number, type: OscillatorType = "sine") => {
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = 0.05;
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
  oscillator.onended = () => {
    void context.close();
  };
};

const GameLayout = ({ session }: GameLayoutProps) => {
  const { room, roundResult, nextTurnStartAt, guessFeedback, scorePopups } = session;
  const [tool, setTool] = useState<DrawingTool>("pencil");
  const [color, setColor] = useState("#111827");
  const [size, setSize] = useState(8);
  const [copyState, setCopyState] = useState<"idle" | "done">("idle");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const lastRoundResultId = roundResult?.results[0]?.playerId ?? null;

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (guessFeedback === "correct") {
      playTone(680, 0.14, "triangle");
    }
  }, [guessFeedback]);

  useEffect(() => {
    if (roundResult) {
      playTone(440, 0.12);
      window.setTimeout(() => {
        playTone(560, 0.12);
      }, 120);
    }
  }, [lastRoundResultId, roundResult]);

  const headerTimer = useMemo(() => {
    if (room.phase === "choosing") {
      return {
        endsAt: room.currentRound?.choiceDeadlineAt ?? null,
        duration: WORD_CHOICE_MS,
        label: "Word choice"
      };
    }

    if (room.phase === "drawing") {
      return {
        endsAt: room.currentRound?.endsAt ?? null,
        duration: DRAW_ROUND_MS,
        label: "Round timer"
      };
    }

    if ((room.phase === "results" || room.phase === "finished") && nextTurnStartAt) {
      return {
        endsAt: nextTurnStartAt,
        duration: room.phase === "finished" ? 8_000 : 5_000,
        label: room.phase === "finished" ? "Restart" : "Next turn"
      };
    }

    return null;
  }, [nextTurnStartAt, room]);

  const centerMessage =
    room.phase === "waiting"
      ? "Waiting for the room to fill."
      : room.phase === "choosing"
        ? room.viewer.isDrawer
          ? "Choose the word you want to draw."
          : `${room.currentRound?.drawerName ?? "The drawer"} is choosing a word.`
        : room.phase === "drawing"
          ? room.viewer.isDrawer
            ? `Draw: ${room.viewer.secretWord?.text ?? "your word"}`
            : room.viewer.hasGuessedCorrectly
              ? "You nailed it. Cheer on the rest."
              : room.viewer.isSpectator
                ? "Spectating live."
                : "Guess the word from the sketch."
          : room.phase === "finished"
            ? room.winner
              ? `${room.winner.name} wins this game.`
              : "Game over."
            : roundResult
              ? `The word was ${roundResult.word.text}.`
              : "Round over.";

  const showCanvas =
    room.phase === "drawing" || room.phase === "results" || room.phase === "finished" || !room.viewer.isDrawer;

  return (
    <Box className="app-shell">
      <div ref={shellRef} className="game-shell">
        <Paper className="game-header" elevation={0}>
          <div className="game-header-top">
            <div>
              <Typography variant="h1" sx={{ fontSize: { xs: "1.7rem", sm: "2rem" } }}>
                {GAME_TITLE}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Original party drawing chaos with realtime canvas, live guesses, and a leaderboard that swings fast.
              </Typography>
            </div>

            <div className="game-header-actions">
              <Button
                variant="outlined"
                startIcon={<ContentCopyRoundedIcon />}
                onClick={() => {
                  void navigator.clipboard.writeText(room.code);
                  setCopyState("done");
                  window.setTimeout(() => setCopyState("idle"), 1200);
                }}
              >
                {copyState === "done" ? "Copied" : room.code}
              </Button>
              <Button
                variant="outlined"
                startIcon={isFullscreen ? <FullscreenExitRoundedIcon /> : <FullscreenRoundedIcon />}
                onClick={() => {
                  if (document.fullscreenElement) {
                    void document.exitFullscreen();
                    return;
                  }

                  void shellRef.current?.requestFullscreen();
                }}
              >
                {isFullscreen ? "Exit" : "Fullscreen"}
              </Button>
            </div>
          </div>

          <div className="game-meta-row">
            <Chip icon={room.viewer.isSpectator ? <VisibilityRoundedIcon /> : <DrawRoundedIcon />} label={room.viewer.isSpectator ? "Spectator" : "Player"} color="primary" />
            <Chip label={room.isPrivate ? `Private ${room.code}` : "Matchmaking"} variant="outlined" />
            <Chip label={room.currentRound ? `Round ${room.currentRound.number}/${room.currentRound.totalRounds}` : "Lobby"} variant="outlined" />
            <Chip label={`${room.players.length} players`} variant="outlined" />
            {room.spectators.length > 0 ? <Chip label={`${room.spectators.length} spectators`} variant="outlined" /> : null}
          </div>

          <PlayerList
            players={room.players}
            spectators={room.spectators}
            currentParticipantId={room.viewer.participantId}
          />

          {headerTimer ? (
            <TimerBar endsAt={headerTimer.endsAt} durationMs={headerTimer.duration} label={headerTimer.label} />
          ) : null}

          <Typography className="inline-note" color={session.error ? "error.main" : "text.secondary"}>
            {session.error
              ? session.error
              : session.connectionLost
                ? "Connection lost. We will try to reconnect your room automatically."
                : "\u00A0"}
          </Typography>
        </Paper>

        <div className="game-board-grid">
          <div className="canvas-column">
            {room.phase === "waiting" ? (
              <Lobby room={room} />
            ) : room.phase === "choosing" && room.viewer.isDrawer ? (
              <WordChooser
                choices={room.viewer.wordChoices}
                disabled={Boolean(session.connectionLost)}
                onChoose={(word) => {
                  void session.chooseWord(word);
                }}
              />
            ) : showCanvas ? (
              <CanvasBoard
                strokes={room.currentRound?.strokes ?? []}
                liveStrokes={session.liveStrokes}
                canDraw={room.viewer.canDraw && !session.connectionLost}
                tool={tool}
                color={color}
                size={size}
                wordMask={room.currentRound?.revealedWord?.text ?? room.currentRound?.maskedWord ?? "Waiting"}
                centerMessage={centerMessage}
                highlight={guessFeedback === "correct"}
                onStartStroke={session.startStroke}
                onMoveStroke={session.moveStroke}
                onEndStroke={session.endStroke}
              />
            ) : null}

            <Paper className="panel-card" elevation={0}>
              <Stack className="panel-stack">
                <div className="section-head">
                  <div>
                    <Typography variant="h3">Drawing tools</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {room.viewer.canDraw
                        ? "Brush, erase, undo, and keep the canvas readable."
                        : "Tools wake up automatically when it is your turn to draw."}
                    </Typography>
                  </div>
                </div>

                <ToolBar
                  tool={tool}
                  color={color}
                  size={size}
                  disabled={!room.viewer.canDraw || session.connectionLost}
                  onToolChange={setTool}
                  onColorChange={setColor}
                  onSizeChange={setSize}
                  onUndo={() => {
                    void session.undoLastStroke();
                  }}
                  onClear={() => {
                    void session.clearBoard();
                  }}
                />
              </Stack>
            </Paper>
          </div>

          <div className="side-column">
            <ScoreBoard players={room.players} />
            <ChatBox
              messages={room.chat}
              players={room.players}
              canGuess={room.viewer.canGuess && !session.connectionLost}
              isDrawer={room.viewer.isDrawer}
              isSpectator={room.viewer.isSpectator}
              guessFeedback={guessFeedback}
              onSendGuess={session.submitGuess}
              onTypingChange={session.updateTyping}
              onReact={session.react}
            />
          </div>
        </div>
      </div>

      <RoundResultModal
        open={Boolean(roundResult)}
        result={roundResult}
        onClose={session.dismissRoundResult}
      />

      <div className="floating-scores">
        {scorePopups.map((popup) => (
          <div key={popup.id} className="score-popup">
            {popup.label}
          </div>
        ))}
      </div>
    </Box>
  );
};

export default GameLayout;
