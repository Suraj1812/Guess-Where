import type { Country } from "../../../shared/countries.js";
import type { RoomPhase } from "../../../shared/types.js";

export interface Player {
  id: string;
  socketId: string;
  name: string;
  score: number;
  joinedAt: number;
}

export interface GuessRecord {
  countryCode: string;
  submittedAt: number;
}

export interface RoundState {
  number: number;
  hostId: string;
  hostName: string;
  clue: string;
  answer: Country | null;
  options: Country[];
  phase: Exclude<RoomPhase, "waiting">;
  clueDeadlineAt: number | null;
  guessStartedAt: number | null;
  guessDeadlineAt: number | null;
  guesses: Map<string, GuessRecord>;
}

export interface RoomTimers {
  startTimeout: NodeJS.Timeout | null;
  clueTimeout: NodeJS.Timeout | null;
  guessTimeout: NodeJS.Timeout | null;
  nextRoundTimeout: NodeJS.Timeout | null;
}

export interface Room {
  id: string;
  code: string;
  isPrivate: boolean;
  phase: RoomPhase;
  players: Player[];
  minPlayersToStart: number;
  maxPlayers: number;
  currentRound: RoundState | null;
  lastHostId: string | null;
  timers: RoomTimers;
}
