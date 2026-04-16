export const GAME_TITLE = "Guess Where";

export const ROOM_MAX_PLAYERS = 8;
export const PUBLIC_ROOM_MIN_PLAYERS = 4;
export const PRIVATE_ROOM_MIN_PLAYERS = 2;

export const CLUE_MAX_LENGTH = 60;
export const CLUE_ENTRY_MS = 12_000;
export const ROUND_GUESS_MS = 15_000;
export const ROUND_RESULTS_MS = 4_000;
export const ROOM_START_DELAY_MS = 1_200;

export const BASE_POINTS = 100;
export const FAST_BONUS_POINTS = 60;

export const SOCKET_EVENTS = {
  joinGame: "join_game",
  createRoom: "create_room",
  joinRoom: "join_room",
  playerJoined: "player_joined",
  startRound: "start_round",
  submitClue: "submit_clue",
  submitGuess: "submit_guess",
  roundResult: "round_result",
  nextRound: "next_round",
  leaderboardUpdate: "leaderboard_update",
  serverError: "server_error"
} as const;
