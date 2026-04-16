export type JoinMode = "matchmake" | "create" | "join" | "rejoin";
export type RoomPhase = "waiting" | "choosing" | "drawing" | "results" | "finished";
export type ChatMessageKind = "guess" | "system" | "success";
export type DrawingTool = "pencil" | "eraser";

export interface WordEntry {
  text: string;
  category: string;
}

export interface StrokePoint {
  x: number;
  y: number;
}

export interface StrokeSnapshot {
  id: string;
  color: string;
  size: number;
  tool: DrawingTool;
  points: StrokePoint[];
}

export interface PlayerSnapshot {
  id: string;
  name: string;
  score: number;
  isDrawer: boolean;
  hasGuessedCorrectly: boolean;
  isConnected: boolean;
  isTyping: boolean;
}

export interface SpectatorSnapshot {
  id: string;
  name: string;
  isConnected: boolean;
}

export interface ViewerSnapshot {
  participantId: string;
  sessionId: string;
  isSpectator: boolean;
  isDrawer: boolean;
  hasGuessedCorrectly: boolean;
  canDraw: boolean;
  canGuess: boolean;
  secretWord: WordEntry | null;
  wordChoices: WordEntry[];
}

export interface ChatMessage {
  id: string;
  kind: ChatMessageKind;
  playerId: string | null;
  playerName: string;
  text: string;
  createdAt: number;
}

export interface ReactionBurst {
  id: string;
  playerId: string;
  playerName: string;
  emoji: string;
  createdAt: number;
}

export interface RoundSnapshot {
  number: number;
  totalRounds: number;
  drawerId: string | null;
  drawerName: string | null;
  phase: Exclude<RoomPhase, "waiting" | "finished">;
  maskedWord: string;
  revealedWord: WordEntry | null;
  wordLength: number;
  choiceDeadlineAt: number | null;
  endsAt: number | null;
  strokes: StrokeSnapshot[];
  guessedPlayerIds: string[];
  correctGuessCount: number;
}

export interface WinnerSnapshot {
  id: string;
  name: string;
  score: number;
}

export interface RoomSnapshot {
  id: string;
  code: string;
  isPrivate: boolean;
  phase: RoomPhase;
  minPlayersToStart: number;
  maxPlayers: number;
  totalRounds: number;
  canStart: boolean;
  players: PlayerSnapshot[];
  spectators: SpectatorSnapshot[];
  chat: ChatMessage[];
  recentReactions: ReactionBurst[];
  currentRound: RoundSnapshot | null;
  winner: WinnerSnapshot | null;
  viewer: ViewerSnapshot;
}

export interface RoundResultEntry {
  playerId: string;
  playerName: string;
  isDrawer: boolean;
  isCorrect: boolean;
  guessedAtMs: number | null;
  scoreDelta: number;
  totalScore: number;
}

export interface JoinRequest {
  name: string;
  sessionId?: string;
}

export interface JoinPrivateRoomRequest extends JoinRequest {
  code: string;
}

export interface RejoinRoomRequest {
  roomId: string;
  sessionId: string;
  name?: string;
}

export interface ChooseWordRequest {
  roomId: string;
  word: string;
}

export interface DrawStartRequest {
  roomId: string;
  strokeId: string;
  point: StrokePoint;
  color: string;
  size: number;
  tool: DrawingTool;
}

export interface DrawMoveRequest {
  roomId: string;
  strokeId: string;
  point: StrokePoint;
}

export interface DrawEndRequest {
  roomId: string;
  strokeId: string;
  point?: StrokePoint;
}

export interface RoomActionRequest {
  roomId: string;
}

export interface GuessRequest {
  roomId: string;
  guess: string;
}

export interface TypingStateRequest {
  roomId: string;
  isTyping: boolean;
}

export interface EmojiReactionRequest {
  roomId: string;
  emoji: string;
}

export interface HeartbeatRequest {
  roomId: string;
}

export interface ActionAck {
  ok: boolean;
  error?: string;
}

export interface GuessAck extends ActionAck {
  closeGuess?: boolean;
  correct?: boolean;
}

export interface JoinAck extends ActionAck {
  playerId?: string;
  sessionId?: string;
  room?: RoomSnapshot;
}

export interface RoomPayload {
  room: RoomSnapshot;
}

export interface ChatMessagePayload extends RoomPayload {
  message: ChatMessage;
}

export interface CorrectGuessPayload extends RoomPayload {
  playerId: string;
  scoreAwarded: number;
  totalCorrect: number;
}

export interface DrawEventPayload {
  roomId: string;
  playerId: string;
}

export interface DrawStartPayload extends DrawEventPayload {
  strokeId: string;
  point: StrokePoint;
  color: string;
  size: number;
  tool: DrawingTool;
}

export interface DrawMovePayload extends DrawEventPayload {
  strokeId: string;
  point: StrokePoint;
}

export interface DrawEndPayload extends DrawEventPayload {
  stroke: StrokeSnapshot;
}

export interface UndoStrokePayload extends DrawEventPayload {
  strokeId: string | null;
}

export interface ClearCanvasPayload extends DrawEventPayload {
  clearedAt: number;
}

export interface RoundEndPayload extends RoomPayload {
  results: RoundResultEntry[];
  word: WordEntry;
  winner: WinnerSnapshot | null;
  message: string;
}

export interface LeaderboardPayload extends RoomPayload {
  results: RoundResultEntry[];
  winner: WinnerSnapshot | null;
}

export interface NextTurnPayload extends RoomPayload {
  startsAt: number;
}

export interface TypingStatePayload {
  roomId: string;
  playerId: string;
  playerName: string;
  isTyping: boolean;
}

export interface EmojiReactionPayload {
  roomId: string;
  reaction: ReactionBurst;
}

export interface PlayerKickedPayload extends RoomPayload {
  playerId: string;
  reason: string;
}

export interface ServerErrorPayload {
  message: string;
}

export interface ServerToClientEvents {
  player_joined: (payload: RoomPayload) => void;
  room_updated: (payload: RoomPayload) => void;
  start_game: (payload: RoomPayload) => void;
  start_round: (payload: RoomPayload) => void;
  chat_message: (payload: ChatMessagePayload) => void;
  draw_start: (payload: DrawStartPayload) => void;
  draw_move: (payload: DrawMovePayload) => void;
  draw_end: (payload: DrawEndPayload) => void;
  undo_stroke: (payload: UndoStrokePayload) => void;
  clear_canvas: (payload: ClearCanvasPayload) => void;
  correct_guess: (payload: CorrectGuessPayload) => void;
  round_end: (payload: RoundEndPayload) => void;
  leaderboard: (payload: LeaderboardPayload) => void;
  next_turn: (payload: NextTurnPayload) => void;
  typing_state: (payload: TypingStatePayload) => void;
  emoji_reaction: (payload: EmojiReactionPayload) => void;
  player_kicked: (payload: PlayerKickedPayload) => void;
  server_error: (payload: ServerErrorPayload) => void;
}

export interface ClientToServerEvents {
  join_game: (payload: JoinRequest, ack: (response: JoinAck) => void) => void;
  create_room: (payload: JoinRequest, ack: (response: JoinAck) => void) => void;
  join_room: (payload: JoinPrivateRoomRequest, ack: (response: JoinAck) => void) => void;
  rejoin_room: (payload: RejoinRoomRequest, ack: (response: JoinAck) => void) => void;
  choose_word: (payload: ChooseWordRequest, ack?: (response: ActionAck) => void) => void;
  draw_start: (payload: DrawStartRequest, ack?: (response: ActionAck) => void) => void;
  draw_move: (payload: DrawMoveRequest, ack?: (response: ActionAck) => void) => void;
  draw_end: (payload: DrawEndRequest, ack?: (response: ActionAck) => void) => void;
  undo_stroke: (payload: RoomActionRequest, ack?: (response: ActionAck) => void) => void;
  clear_canvas: (payload: RoomActionRequest, ack?: (response: ActionAck) => void) => void;
  send_guess: (payload: GuessRequest, ack?: (response: GuessAck) => void) => void;
  typing_state: (payload: TypingStateRequest) => void;
  emoji_reaction: (payload: EmojiReactionRequest) => void;
  heartbeat: (payload: HeartbeatRequest) => void;
}
