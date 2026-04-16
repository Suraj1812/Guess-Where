import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Fade,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import type { RoomSnapshot, RoundResultPayload } from "@shared/types";
import {
  CLUE_ENTRY_MS,
  GAME_TITLE,
  ROUND_GUESS_MS
} from "@shared/constants";
import ClueInput from "./ClueInput";
import GuessOptions from "./GuessOptions";
import InlineMessage from "./InlineMessage";
import LeaderboardModal from "./LeaderboardModal";
import PlayerList from "./PlayerList";
import TimerBar from "./TimerBar";

interface GameLayoutProps {
  room: RoomSnapshot;
  currentPlayerId: string;
  latestResult: RoundResultPayload | null;
  nextRoundStartAt: number | null;
  submittedGuessCode: string | null;
  error: string | null;
  connectionLost: boolean;
  onSubmitClue: (clue: string, countryCode: string) => Promise<string | null>;
  onSubmitGuess: (countryCode: string) => Promise<string | null>;
}

const GameLayout = ({
  room,
  currentPlayerId,
  latestResult,
  nextRoundStartAt,
  submittedGuessCode,
  error,
  connectionLost,
  onSubmitClue,
  onSubmitGuess
}: GameLayoutProps) => {
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  const currentRound = room.currentRound;
  const isHost = currentRound?.hostId === currentPlayerId;
  const hasGuessed = currentRound?.submittedGuessIds.includes(currentPlayerId) ?? false;
  const waitingFor = Math.max(0, room.minPlayersToStart - room.players.length);
  const headerMessage = connectionLost
    ? "Connection lost. Go back and rejoin if the room stops updating."
    : error;
  const guessCount = Math.max(0, room.players.length - 1);
  const guessSummary = currentRound ? `${currentRound.submittedGuessIds.length}/${guessCount}` : "0/0";
  const stageKey = `${room.phase}-${currentRound?.number ?? 0}`;
  const statusCopy =
    room.phase === "waiting"
      ? room.isPrivate
        ? `Waiting for ${waitingFor} more ${waitingFor === 1 ? "player" : "players"} to join this room.`
        : `Waiting for ${waitingFor} more ${waitingFor === 1 ? "player" : "players"} to start.`
      : room.phase === "clue"
        ? isHost
          ? "Write a clue for the next round."
          : `${currentRound?.hostName} is writing the clue.`
        : room.phase === "guessing"
          ? isHost
            ? "Everyone else is guessing your clue."
            : hasGuessed
              ? "Your answer is locked in."
              : "Choose the country before the timer hits zero."
          : latestResult?.message ?? "Scores are in. Next round is loading.";

  return (
    <Box className="page-shell">
      <Box className="screen-frame">
        <Paper className="surface-panel game-screen" elevation={0}>
          <Box className="game-header">
            <Box className="game-header-top">
              <Box>
                <Typography variant="h2">{GAME_TITLE}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  {statusCopy}
                </Typography>
              </Box>

              <Button variant="outlined" onClick={() => setLeaderboardOpen(true)}>
                Leaderboard
              </Button>
            </Box>

            <Box className="game-header-meta">
              <Chip
                icon={room.isPrivate ? <HubRoundedIcon /> : <PublicRoundedIcon />}
                label={room.isPrivate ? `Code ${room.code}` : "Play with anyone"}
                color="primary"
              />
              <Chip label={currentRound ? `Round ${currentRound.number}` : "Lobby"} variant="outlined" />
              <Chip label={`${room.players.length}/${room.maxPlayers} players`} variant="outlined" />
            </Box>

            <InlineMessage message={headerMessage} />
          </Box>

          <Box className="game-scroll">
            <PlayerList players={room.players} />

            <Fade in timeout={180} key={`stage-${stageKey}`}>
              <Paper className="surface-panel game-section" elevation={0}>
                <div className="section-heading">
                  <div>
                    <Typography variant="h3">
                      {room.phase === "waiting"
                        ? "Room status"
                        : room.phase === "clue"
                          ? "Round setup"
                          : room.phase === "guessing"
                            ? "Guess the country"
                            : "Round result"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {room.phase === "waiting"
                        ? room.isPrivate
                          ? "Share the code and the round will start automatically."
                          : "Public rooms start automatically as soon as enough players join."
                        : room.phase === "clue"
                          ? isHost
                            ? "You are hosting this round."
                            : `${currentRound?.hostName} is setting the clue.`
                          : room.phase === "guessing"
                            ? isHost
                              ? "Watch the guesses come in."
                              : "Read the clue and make your pick."
                            : "Here is how everyone did."}
                    </Typography>
                  </div>
                </div>

                {room.phase === "waiting" ? (
                  <Stack spacing={1.5}>
                    <div className="detail-row">
                      <Typography variant="body2" color="text.secondary">
                        Room type
                      </Typography>
                      <Typography className="detail-value">
                        {room.isPrivate ? "Private room" : "Public room"}
                      </Typography>
                    </div>
                    <div className="detail-row">
                      <Typography variant="body2" color="text.secondary">
                        Starts with
                      </Typography>
                      <Typography className="detail-value">{room.minPlayersToStart} players</Typography>
                    </div>
                    <div className="detail-row">
                      <Typography variant="body2" color="text.secondary">
                        Room code
                      </Typography>
                      <Typography className="detail-value">{room.code}</Typography>
                    </div>
                  </Stack>
                ) : null}

                {room.phase === "clue" && currentRound ? (
                  <Stack spacing={1.5}>
                    <TimerBar endsAt={currentRound.clueDeadlineAt} durationMs={CLUE_ENTRY_MS} label="Clue timer" />
                    <Typography variant="body1">
                      {isHost
                        ? "Keep the clue short and natural so the choices feel fair."
                        : `${currentRound.hostName} is almost ready. Guessing begins as soon as the clue is set.`}
                    </Typography>
                  </Stack>
                ) : null}

                {room.phase === "guessing" && currentRound ? (
                  <Stack spacing={1.5}>
                    <TimerBar
                      endsAt={currentRound.guessDeadlineAt}
                      durationMs={ROUND_GUESS_MS}
                      label="Guess timer"
                      color="secondary"
                    />
                    <Typography variant="h2" className="clue-callout" sx={{ fontSize: "1.35rem" }}>
                      {currentRound.clue}
                    </Typography>
                  </Stack>
                ) : null}

                {room.phase === "results" && currentRound ? (
                  <Stack spacing={1.5}>
                    <Typography variant="h2" sx={{ fontSize: "1.35rem" }}>
                      {latestResult?.correctCountry
                        ? `${latestResult.correctCountry.flag} ${latestResult.correctCountry.name}`
                        : "Round skipped"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {latestResult?.message ?? "Correct answers earn points, and faster answers earn more."}
                    </Typography>
                    {nextRoundStartAt ? (
                      <TimerBar endsAt={nextRoundStartAt} durationMs={4_000} label="Next round" color="success" />
                    ) : null}
                  </Stack>
                ) : null}
              </Paper>
            </Fade>

            <Fade in timeout={180} key={`action-${stageKey}`}>
              <Paper className="surface-panel game-section" elevation={0}>
                <div className="section-heading">
                  <div>
                    <Typography variant="h3">
                      {room.phase === "waiting"
                        ? "What happens next"
                        : room.phase === "clue"
                          ? isHost
                            ? "Write your clue"
                            : "Get ready"
                          : room.phase === "guessing"
                            ? isHost
                              ? "Live guesses"
                              : "Pick one answer"
                            : "Scores this round"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {room.phase === "waiting"
                        ? "Nothing to tap yet. The room starts automatically."
                        : room.phase === "clue"
                          ? isHost
                            ? "Choose the country that matches your clue."
                            : "The answer options will appear here in a moment."
                          : room.phase === "guessing"
                            ? isHost
                              ? "You can see how many players have answered."
                              : "You only get one guess each round."
                            : "Points from the current round are shown below."}
                    </Typography>
                  </div>
                </div>

                {room.phase === "waiting" ? (
                  <Typography className="scroll-hint">
                    {room.isPrivate
                      ? `Waiting for ${waitingFor} more ${waitingFor === 1 ? "player" : "players"} to join room ${room.code}.`
                      : `Waiting for ${waitingFor} more ${waitingFor === 1 ? "player" : "players"} to join the public room.`}
                  </Typography>
                ) : null}

                {room.phase === "clue" && currentRound ? (
                  isHost ? (
                    <ClueInput
                      roundNumber={currentRound.number}
                      disabled={connectionLost}
                      onSubmit={onSubmitClue}
                    />
                  ) : (
                    <Typography className="scroll-hint">
                      Hold on for a second. As soon as {currentRound.hostName} submits the clue, the answer buttons will appear here.
                    </Typography>
                  )
                ) : null}

                {room.phase === "guessing" && currentRound ? (
                  isHost ? (
                    <Stack spacing={1.5}>
                      <div className="detail-row">
                        <Typography variant="body2" color="text.secondary">
                          Answer
                        </Typography>
                        <Typography className="detail-value">
                          {currentRound.answer?.flag} {currentRound.answer?.name}
                        </Typography>
                      </div>
                      <div className="detail-row">
                        <Typography variant="body2" color="text.secondary">
                          Guesses in
                        </Typography>
                        <Typography className="detail-value">{guessSummary}</Typography>
                      </div>
                      <Typography className="scroll-hint">
                        Players score more when they answer correctly and quickly.
                      </Typography>
                    </Stack>
                  ) : (
                    <Stack spacing={1.5}>
                      <GuessOptions
                        options={currentRound.options}
                        selectedCode={submittedGuessCode}
                        disabled={hasGuessed || connectionLost}
                        onSelect={(countryCode) => {
                          void onSubmitGuess(countryCode);
                        }}
                      />
                      <InlineMessage
                        message={hasGuessed ? "Your guess is locked in." : null}
                        tone="info"
                      />
                    </Stack>
                  )
                ) : null}

                {room.phase === "results" ? (
                  <Stack spacing={0}>
                    {latestResult?.results.slice(0, 4).map((entry) => (
                      <div key={entry.playerId} className="result-row">
                        <div>
                          <Typography sx={{ fontWeight: 600 }}>{entry.playerName}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {entry.isCorrect
                              ? `Correct in ${Math.max(1, Math.round((entry.answerTimeMs ?? 0) / 1000))}s`
                              : entry.guess
                                ? `Picked ${entry.guess.flag} ${entry.guess.name}`
                                : "No answer"}
                          </Typography>
                        </div>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {entry.pointsEarned > 0 ? `+${entry.pointsEarned}` : "0"}
                        </Typography>
                      </div>
                    ))}
                  </Stack>
                ) : null}
              </Paper>
            </Fade>
          </Box>
        </Paper>
      </Box>

      <LeaderboardModal
        open={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        room={room}
        latestResult={latestResult}
      />
    </Box>
  );
};

export default GameLayout;
