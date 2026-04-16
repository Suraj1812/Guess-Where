export const GAME_TITLE = "Draw Clash";

export const ROOM_MAX_PLAYERS = 8;
export const PUBLIC_ROOM_MIN_PLAYERS = 3;
export const PRIVATE_ROOM_MIN_PLAYERS = 2;

export const TURNS_PER_PLAYER = 2;
export const WORD_CHOICES_PER_TURN = 3;
export const WORD_CHOICE_MS = 10_000;
export const DRAW_ROUND_MS = 75_000;
export const ROUND_RESULTS_MS = 5_000;
export const ROOM_START_DELAY_MS = 1_500;
export const FINISHED_RESTART_MS = 8_000;
export const RECONNECT_GRACE_MS = 45_000;

export const CHAT_MAX_LENGTH = 48;
export const MAX_CHAT_MESSAGES = 60;
export const MAX_REACTIONS = 10;
export const SPAM_GUESS_COOLDOWN_MS = 700;
export const CLOSE_GUESS_DISTANCE = 2;
export const AFK_KICK_MS = 120_000;

export const GUESS_BASE_POINTS = 80;
export const GUESS_SPEED_POINTS = 120;
export const FIRST_GUESS_BONUS = 40;
export const DRAWER_POINTS_PER_GUESSER = 45;

export const DEFAULT_CANVAS_BACKGROUND = "#ffffff";

export const DRAWING_COLORS = [
  "#111827",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#38bdf8",
  "#6366f1",
  "#a855f7",
  "#ec4899"
] as const;

export const DRAWING_SIZES = [4, 8, 14, 20] as const;

export const REACTION_OPTIONS = ["🔥", "👏", "😂", "😮", "🎯", "⚡"] as const;

export const SOCKET_EVENTS = {
  joinGame: "join_game",
  createRoom: "create_room",
  joinRoom: "join_room",
  rejoinRoom: "rejoin_room",
  playerJoined: "player_joined",
  roomUpdated: "room_updated",
  startGame: "start_game",
  startRound: "start_round",
  chooseWord: "choose_word",
  drawStart: "draw_start",
  drawMove: "draw_move",
  drawEnd: "draw_end",
  undoStroke: "undo_stroke",
  clearCanvas: "clear_canvas",
  sendGuess: "send_guess",
  chatMessage: "chat_message",
  correctGuess: "correct_guess",
  roundEnd: "round_end",
  leaderboard: "leaderboard",
  nextTurn: "next_turn",
  typingState: "typing_state",
  emojiReaction: "emoji_reaction",
  heartbeat: "heartbeat",
  playerKicked: "player_kicked",
  serverError: "server_error"
} as const;
