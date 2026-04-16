import type {
  ChatMessage,
  ReactionBurst,
  RoomPhase,
  StrokeSnapshot,
  WordEntry
} from "../../../shared/types.js";

export interface Participant {
  id: string;
  sessionId: string;
  socketId: string | null;
  name: string;
  joinedAt: number;
  lastSeenAt: number;
  lastInteractionAt: number;
  isConnected: boolean;
  isTyping: boolean;
  guessCooldownUntil: number;
  disconnectTimeout: NodeJS.Timeout | null;
}

export interface Player extends Participant {
  score: number;
}

export interface Spectator extends Participant {}

export interface GuessRecord {
  guess: string;
  submittedAt: number;
  scoreAwarded: number;
}

export interface RoundState {
  number: number;
  totalRounds: number;
  drawerId: string;
  drawerName: string;
  phase: Exclude<RoomPhase, "waiting" | "finished">;
  wordChoices: WordEntry[];
  word: WordEntry | null;
  choiceDeadlineAt: number | null;
  startedAt: number | null;
  endsAt: number | null;
  strokes: StrokeSnapshot[];
  activeStrokes: Map<string, StrokeSnapshot>;
  correctGuesses: Map<string, GuessRecord>;
}

export interface RoomTimers {
  startTimeout: NodeJS.Timeout | null;
  choiceTimeout: NodeJS.Timeout | null;
  roundTimeout: NodeJS.Timeout | null;
  nextTurnTimeout: NodeJS.Timeout | null;
  restartTimeout: NodeJS.Timeout | null;
}

export interface Room {
  id: string;
  code: string;
  isPrivate: boolean;
  phase: RoomPhase;
  players: Player[];
  spectators: Spectator[];
  minPlayersToStart: number;
  maxPlayers: number;
  totalRounds: number;
  turnOrder: string[];
  turnIndex: number;
  currentRound: RoundState | null;
  chat: ChatMessage[];
  recentReactions: ReactionBurst[];
  winner: { id: string; name: string; score: number } | null;
  timers: RoomTimers;
}
