import type { Country } from "./countries.js";

export type JoinMode = "matchmake" | "create" | "join";
export type RoomPhase = "waiting" | "clue" | "guessing" | "results";

export interface PlayerSnapshot {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
}

export interface RoundSnapshot {
  number: number;
  hostId: string | null;
  hostName: string | null;
  clue: string;
  phase: RoomPhase;
  answer: Country | null;
  options: Country[];
  clueDeadlineAt: number | null;
  guessDeadlineAt: number | null;
  submittedGuessIds: string[];
}

export interface RoomSnapshot {
  id: string;
  code: string;
  isPrivate: boolean;
  phase: RoomPhase;
  players: PlayerSnapshot[];
  minPlayersToStart: number;
  maxPlayers: number;
  canStart: boolean;
  currentRound: RoundSnapshot | null;
}

export interface RoundResultEntry {
  playerId: string;
  playerName: string;
  guess: Country | null;
  isCorrect: boolean;
  pointsEarned: number;
  answerTimeMs: number | null;
}

export interface JoinRequest {
  name: string;
}

export interface JoinPrivateRoomRequest extends JoinRequest {
  code: string;
}

export interface SubmitClueRequest {
  roomId: string;
  clue: string;
  countryCode: string;
}

export interface SubmitGuessRequest {
  roomId: string;
  countryCode: string;
}

export interface ActionAck {
  ok: boolean;
  error?: string;
}

export interface JoinAck extends ActionAck {
  playerId?: string;
  room?: RoomSnapshot;
}

export interface RoomPayload {
  room: RoomSnapshot;
}

export interface RoundResultPayload extends RoomPayload {
  correctCountry: Country | null;
  results: RoundResultEntry[];
  message?: string;
}

export interface NextRoundPayload extends RoomPayload {
  startsAt: number;
}

export interface ServerErrorPayload {
  message: string;
}

export interface ServerToClientEvents {
  player_joined: (payload: RoomPayload) => void;
  start_round: (payload: RoomPayload) => void;
  round_result: (payload: RoundResultPayload) => void;
  next_round: (payload: NextRoundPayload) => void;
  leaderboard_update: (payload: RoomPayload) => void;
  server_error: (payload: ServerErrorPayload) => void;
}

export interface ClientToServerEvents {
  join_game: (payload: JoinRequest, ack: (response: JoinAck) => void) => void;
  create_room: (payload: JoinRequest, ack: (response: JoinAck) => void) => void;
  join_room: (payload: JoinPrivateRoomRequest, ack: (response: JoinAck) => void) => void;
  submit_clue: (payload: SubmitClueRequest, ack?: (response: ActionAck) => void) => void;
  submit_guess: (payload: SubmitGuessRequest, ack?: (response: ActionAck) => void) => void;
}
