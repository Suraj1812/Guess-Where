import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import SportsScoreRoundedIcon from "@mui/icons-material/SportsScoreRounded";
import type { RoomSnapshot, RoundResultPayload } from "@shared/types";
import {
  CLUE_ENTRY_MS,
  GAME_TITLE,
  ROUND_GUESS_MS
} from "@shared/constants";
import ClueInput from "./ClueInput";
import GuessOptions from "./GuessOptions";
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
  const statusCopy =
    room.phase === "waiting"
      ? room.isPrivate
        ? `Invite ${waitingFor} more ${waitingFor === 1 ? "player" : "players"} with code ${room.code}.`
        : `Waiting for ${waitingFor} more ${waitingFor === 1 ? "player" : "players"} to launch the public room.`
      : room.phase === "clue"
        ? isHost
          ? "Write a clue and choose the country."
          : `${currentRound?.hostName} is writing the clue.`
        : room.phase === "guessing"
          ? isHost
            ? "Players are racing through your clue."
            : hasGuessed
              ? "Guess locked in. Hang tight for the reveal."
              : "Choose the country before the timer hits zero."
          : latestResult?.message ?? "Scores are in. Next round is loading.";

  return (
    <Box className="page-shell">
      <Box className="ambient-orb ambient-orb-one" />
      <Box className="ambient-orb ambient-orb-two" />

      <Box sx={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1180, mx: "auto" }}>
        <Stack spacing={3}>
          <Paper className="surface-panel" elevation={0}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
            >
              <Box>
                <Chip
                  icon={room.isPrivate ? <HubRoundedIcon /> : <PublicRoundedIcon />}
                  label={room.isPrivate ? `Private Room ${room.code}` : "Public Matchmaking"}
                  color="primary"
                  sx={{ mb: 2 }}
                />
                <Typography variant="h2" sx={{ fontSize: { xs: "2rem", md: "2.6rem" } }}>
                  {GAME_TITLE}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {statusCopy}
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                <Chip
                  icon={<SportsScoreRoundedIcon />}
                  label={
                    currentRound ? `Round ${currentRound.number}` : `${room.players.length}/${room.maxPlayers} players`
                  }
                  variant="outlined"
                />
                <Button variant="outlined" onClick={() => setLeaderboardOpen(true)}>
                  Leaderboard
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {connectionLost ? (
            <Alert severity="warning">Connection was lost. Return to the home screen to start a fresh session.</Alert>
          ) : null}

          <Box
            sx={{
              display: "grid",
              gap: 3,
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.8fr) minmax(320px, 0.9fr)" }
            }}
          >
            <Paper className="surface-panel" elevation={0}>
              <Stack spacing={3}>
                {room.phase === "waiting" ? (
                  <>
                    <Box>
                      <Typography variant="h4" sx={{ mb: 1 }}>
                        Lobby warming up
                      </Typography>
                      <Typography color="text.secondary">
                        {room.isPrivate
                          ? "Share your room code and the match will start automatically as soon as two players are inside."
                          : "Public matchmaking launches automatically when four players land in the same room."}
                      </Typography>
                    </Box>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} useFlexGap flexWrap="wrap">
                      <Chip label={`Room code: ${room.code}`} color={room.isPrivate ? "secondary" : "default"} />
                      <Chip label={`Starts at ${room.minPlayersToStart} players`} />
                      <Chip label={`Capacity ${room.maxPlayers}`} />
                    </Stack>
                  </>
                ) : null}

                {room.phase === "clue" && currentRound ? (
                  <>
                    <TimerBar endsAt={currentRound.clueDeadlineAt} durationMs={CLUE_ENTRY_MS} label="Clue timer" />
                    {isHost ? (
                      <ClueInput
                        roundNumber={currentRound.number}
                        disabled={connectionLost}
                        onSubmit={onSubmitClue}
                      />
                    ) : (
                      <Box>
                        <Typography variant="h4" sx={{ mb: 1 }}>
                          {currentRound.hostName} is up
                        </Typography>
                        <Typography color="text.secondary">
                          The next clue is being prepared now. Stay sharp, because guessing starts instantly.
                        </Typography>
                      </Box>
                    )}
                  </>
                ) : null}

                {room.phase === "guessing" && currentRound ? (
                  <>
                    <Box>
                      <Typography variant="h4" sx={{ mb: 1 }}>
                        {currentRound.clue}
                      </Typography>
                      <Typography color="text.secondary">
                        {isHost
                          ? "Your clue is live. Watch the room race to the answer."
                          : "Pick the country that best matches the clue."}
                      </Typography>
                    </Box>

                    <TimerBar endsAt={currentRound.guessDeadlineAt} durationMs={ROUND_GUESS_MS} label="Guess timer" color="secondary" />

                    {isHost ? (
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <Chip
                          color="secondary"
                          label={`Answer: ${currentRound.answer?.flag ?? ""} ${currentRound.answer?.name ?? "Hidden"}`}
                        />
                        <Chip label={`${currentRound.submittedGuessIds.length}/${Math.max(0, room.players.length - 1)} guesses in`} />
                      </Stack>
                    ) : (
                      <GuessOptions
                        options={currentRound.options}
                        selectedCode={submittedGuessCode}
                        disabled={hasGuessed || connectionLost}
                        onSelect={(countryCode) => {
                          void onSubmitGuess(countryCode);
                        }}
                      />
                    )}
                  </>
                ) : null}

                {room.phase === "results" && currentRound ? (
                  <>
                    <Box>
                      <Typography variant="h4" sx={{ mb: 1 }}>
                        {latestResult?.correctCountry
                          ? `${latestResult.correctCountry.flag} ${latestResult.correctCountry.name}`
                          : "Round skipped"}
                      </Typography>
                      <Typography color="text.secondary">
                        {latestResult?.message ?? "Fast answers picked up the biggest bonus."}
                      </Typography>
                    </Box>

                    {nextRoundStartAt ? (
                      <TimerBar endsAt={nextRoundStartAt} durationMs={4_000} label="Next round" color="success" />
                    ) : null}

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} useFlexGap flexWrap="wrap">
                      {latestResult?.results.slice(0, 4).map((entry) => (
                        <Chip
                          key={entry.playerId}
                          color={entry.pointsEarned > 0 ? "success" : "default"}
                          label={
                            entry.pointsEarned > 0
                              ? `${entry.playerName} +${entry.pointsEarned}`
                              : `${entry.playerName} ${entry.guess ? `guessed ${entry.guess.flag} ${entry.guess.name}` : "no score"}`
                          }
                        />
                      ))}
                    </Stack>
                  </>
                ) : null}
              </Stack>
            </Paper>

            <PlayerList players={room.players} />
          </Box>
        </Stack>
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
