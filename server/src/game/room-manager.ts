import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";
import {
  AFK_KICK_MS,
  CHAT_MAX_LENGTH,
  DRAW_ROUND_MS,
  FINISHED_RESTART_MS,
  MAX_CHAT_MESSAGES,
  MAX_REACTIONS,
  PRIVATE_ROOM_MIN_PLAYERS,
  PUBLIC_ROOM_MIN_PLAYERS,
  REACTION_OPTIONS,
  RECONNECT_GRACE_MS,
  ROOM_MAX_PLAYERS,
  ROOM_START_DELAY_MS,
  ROUND_RESULTS_MS,
  SOCKET_EVENTS,
  SPAM_GUESS_COOLDOWN_MS,
  TURNS_PER_PLAYER,
  WORD_CHOICE_MS
} from "../../../shared/constants.js";
import type {
  ActionAck,
  ChatMessage,
  ChatMessagePayload,
  ClearCanvasPayload,
  ClientToServerEvents,
  CorrectGuessPayload,
  DrawEndPayload,
  DrawEndRequest,
  DrawMovePayload,
  DrawMoveRequest,
  DrawStartPayload,
  DrawStartRequest,
  EmojiReactionPayload,
  EmojiReactionRequest,
  GuessAck,
  GuessRequest,
  JoinAck,
  JoinPrivateRoomRequest,
  JoinRequest,
  LeaderboardPayload,
  NextTurnPayload,
  PlayerKickedPayload,
  ReactionBurst,
  RejoinRoomRequest,
  RoomPayload,
  RoomSnapshot,
  RoundEndPayload,
  RoundResultEntry,
  ServerToClientEvents,
  SpectatorSnapshot,
  StrokeSnapshot,
  TypingStatePayload,
  TypingStateRequest,
  UndoStrokePayload,
  ViewerSnapshot,
  WinnerSnapshot,
  WordEntry
} from "../../../shared/types.js";
import { Persistence } from "../persistence.js";
import { getRandomWordChoices, isCloseGuess, maskWord, normalizeGuess } from "./options.js";
import { calculateDrawerBonus, calculateGuessScore } from "./scoring.js";
import type { Participant, Player, Room, RoundState, Spectator } from "./types.js";

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly roomIdByCode = new Map<string, string>();
  private readonly roomIdBySocketId = new Map<string, string>();
  private readonly participantIdBySocketId = new Map<string, string>();

  constructor(
    private readonly io: Server<ClientToServerEvents, ServerToClientEvents>,
    private readonly persistence: Persistence
  ) {}

  joinMatchmaking(socket: GameSocket, payload: JoinRequest, ack: (response: JoinAck) => void): void {
    const name = this.sanitizeName(payload.name);

    if (!name) {
      ack({ ok: false, error: "Enter a display name to jump in." });
      return;
    }

    const room = this.findOpenPublicRoom() ?? this.createRoom(false);
    ack(this.joinRoomInternal(room, socket, name, payload.sessionId));
  }

  createPrivateRoom(
    socket: GameSocket,
    payload: JoinRequest,
    ack: (response: JoinAck) => void
  ): void {
    const name = this.sanitizeName(payload.name);

    if (!name) {
      ack({ ok: false, error: "Enter a display name to create a room." });
      return;
    }

    const room = this.createRoom(true);
    ack(this.joinRoomInternal(room, socket, name, payload.sessionId));
  }

  joinPrivateRoom(
    socket: GameSocket,
    payload: JoinPrivateRoomRequest,
    ack: (response: JoinAck) => void
  ): void {
    const name = this.sanitizeName(payload.name);
    const code = payload.code.trim().toUpperCase();
    const roomId = this.roomIdByCode.get(code);
    const room = roomId ? this.rooms.get(roomId) : undefined;

    if (!name) {
      ack({ ok: false, error: "Enter a display name to join the room." });
      return;
    }

    if (!room || !room.isPrivate) {
      ack({ ok: false, error: "That room code does not exist." });
      return;
    }

    ack(this.joinRoomInternal(room, socket, name, payload.sessionId));
  }

  rejoinRoom(
    socket: GameSocket,
    payload: RejoinRoomRequest,
    ack: (response: JoinAck) => void
  ): void {
    const room = this.rooms.get(payload.roomId);

    if (!room) {
      ack({ ok: false, error: "That room is no longer active." });
      return;
    }

    const participant = this.findParticipantBySession(room, payload.sessionId);

    if (!participant) {
      ack({ ok: false, error: "Your last session could not be restored." });
      return;
    }

    const refreshedName = this.sanitizeName(payload.name ?? participant.name);
    participant.name = refreshedName || participant.name;
    this.attachParticipantToSocket(room, participant, socket);

    ack({
      ok: true,
      playerId: participant.id,
      sessionId: participant.sessionId,
      room: this.serializeRoom(room, participant)
    });

    this.broadcastRoomUpdate(room);
    if (room.phase === "waiting") {
      this.maybeScheduleGameStart(room);
    }
  }

  chooseWord(
    socket: GameSocket,
    payload: { roomId: string; word: string },
    ack?: (response: ActionAck) => void
  ): void {
    const room = this.rooms.get(payload.roomId);
    const playerId = this.participantIdBySocketId.get(socket.id);
    const player = room && playerId ? this.findPlayer(room, playerId) : undefined;
    const round = room?.currentRound;

    if (!room || !round || room.phase !== "choosing" || !player) {
      ack?.({ ok: false, error: "A word cannot be chosen right now." });
      return;
    }

    if (round.drawerId !== player.id) {
      ack?.({ ok: false, error: "Only the drawer can choose the word." });
      return;
    }

    const choice = round.wordChoices.find(
      (entry) => normalizeGuess(entry.text) === normalizeGuess(payload.word)
    );

    if (!choice) {
      ack?.({ ok: false, error: "Choose one of the available words." });
      return;
    }

    this.markActivity(player, true);
    this.beginDrawing(room, choice);
    ack?.({ ok: true });
  }

  drawStart(
    socket: GameSocket,
    payload: DrawStartRequest,
    ack?: (response: ActionAck) => void
  ): void {
    const context = this.getDrawingContext(socket.id, payload.roomId);

    if (!context) {
      ack?.({ ok: false, error: "Drawing is locked right now." });
      return;
    }

    const { room, round, player } = context;
    const stroke: StrokeSnapshot = {
      id: payload.strokeId,
      color: this.sanitizeColor(payload.color),
      size: Math.max(2, Math.min(28, payload.size)),
      tool: payload.tool === "eraser" ? "eraser" : "pencil",
      points: [payload.point]
    };

    round.activeStrokes.set(payload.strokeId, stroke);
    this.markActivity(player, true);

    socket.to(room.id).emit(SOCKET_EVENTS.drawStart, {
      roomId: room.id,
      playerId: player.id,
      strokeId: stroke.id,
      point: payload.point,
      color: stroke.color,
      size: stroke.size,
      tool: stroke.tool
    } satisfies DrawStartPayload);

    ack?.({ ok: true });
  }

  drawMove(socket: GameSocket, payload: DrawMoveRequest, ack?: (response: ActionAck) => void): void {
    const context = this.getDrawingContext(socket.id, payload.roomId);

    if (!context) {
      ack?.({ ok: false, error: "Drawing is locked right now." });
      return;
    }

    const { room, round, player } = context;
    const stroke = round.activeStrokes.get(payload.strokeId);

    if (!stroke) {
      ack?.({ ok: false, error: "That stroke is no longer active." });
      return;
    }

    stroke.points.push(payload.point);
    this.markActivity(player, true);

    socket.to(room.id).emit(SOCKET_EVENTS.drawMove, {
      roomId: room.id,
      playerId: player.id,
      strokeId: stroke.id,
      point: payload.point
    } satisfies DrawMovePayload);

    ack?.({ ok: true });
  }

  drawEnd(socket: GameSocket, payload: DrawEndRequest, ack?: (response: ActionAck) => void): void {
    const context = this.getDrawingContext(socket.id, payload.roomId);

    if (!context) {
      ack?.({ ok: false, error: "Drawing is locked right now." });
      return;
    }

    const { room, round, player } = context;
    const stroke = round.activeStrokes.get(payload.strokeId);

    if (!stroke) {
      ack?.({ ok: false, error: "That stroke is no longer active." });
      return;
    }

    if (payload.point) {
      stroke.points.push(payload.point);
    }

    round.activeStrokes.delete(payload.strokeId);
    round.strokes.push(stroke);
    this.markActivity(player, true);

    this.io.to(room.id).emit(SOCKET_EVENTS.drawEnd, {
      roomId: room.id,
      playerId: player.id,
      stroke
    } satisfies DrawEndPayload);

    ack?.({ ok: true });
  }

  undoStroke(
    socket: GameSocket,
    payload: { roomId: string },
    ack?: (response: ActionAck) => void
  ): void {
    const context = this.getDrawingContext(socket.id, payload.roomId);

    if (!context) {
      ack?.({ ok: false, error: "Undo is only available to the active drawer." });
      return;
    }

    const { room, round, player } = context;
    const removedStroke = round.strokes.pop() ?? null;
    this.markActivity(player, true);

    this.io.to(room.id).emit(SOCKET_EVENTS.undoStroke, {
      roomId: room.id,
      playerId: player.id,
      strokeId: removedStroke?.id ?? null
    } satisfies UndoStrokePayload);

    ack?.({ ok: true });
  }

  clearCanvas(
    socket: GameSocket,
    payload: { roomId: string },
    ack?: (response: ActionAck) => void
  ): void {
    const context = this.getDrawingContext(socket.id, payload.roomId);

    if (!context) {
      ack?.({ ok: false, error: "Only the drawer can clear the canvas." });
      return;
    }

    const { room, round, player } = context;
    round.strokes = [];
    round.activeStrokes.clear();
    this.markActivity(player, true);

    this.io.to(room.id).emit(SOCKET_EVENTS.clearCanvas, {
      roomId: room.id,
      playerId: player.id,
      clearedAt: Date.now()
    } satisfies ClearCanvasPayload);

    ack?.({ ok: true });
  }

  sendGuess(socket: GameSocket, payload: GuessRequest, ack?: (response: GuessAck) => void): void {
    const room = this.rooms.get(payload.roomId);
    const participantId = this.participantIdBySocketId.get(socket.id);
    const player = room && participantId ? this.findPlayer(room, participantId) : undefined;
    const round = room?.currentRound;

    if (!room || !round || room.phase !== "drawing" || !player || !round.word) {
      ack?.({ ok: false, error: "Guessing is closed right now." });
      return;
    }

    if (round.drawerId === player.id) {
      ack?.({ ok: false, error: "The drawer cannot submit guesses." });
      return;
    }

    if (round.correctGuesses.has(player.id)) {
      ack?.({ ok: false, error: "You already guessed the word." });
      return;
    }

    const guess = payload.guess.replace(/\s+/g, " ").trim().slice(0, CHAT_MAX_LENGTH);

    if (!guess) {
      ack?.({ ok: false, error: "Type a guess before sending." });
      return;
    }

    const now = Date.now();

    if (now < player.guessCooldownUntil) {
      ack?.({ ok: false, error: "Slow down a little and try again." });
      return;
    }

    player.guessCooldownUntil = now + SPAM_GUESS_COOLDOWN_MS;
    player.isTyping = false;
    this.emitTypingState(room, player, false);
    this.markActivity(player, true);

    if (normalizeGuess(guess) === normalizeGuess(round.word.text)) {
      const correctOrder = round.correctGuesses.size;
      const elapsedMs = round.startedAt ? now - round.startedAt : DRAW_ROUND_MS;
      const scoreAwarded = calculateGuessScore(elapsedMs, correctOrder);

      player.score += scoreAwarded;
      round.correctGuesses.set(player.id, {
        guess,
        submittedAt: now,
        scoreAwarded
      });

      const systemMessage = this.createChatMessage(null, "Draw Clash", "Someone guessed it!", "system");
      this.appendChatMessage(room, systemMessage);
      this.broadcastChatMessage(room, systemMessage);
      this.broadcastCorrectGuess(room, player.id, scoreAwarded);

      if (this.haveAllGuessersFinished(room)) {
        void this.finishRound(room, "Everybody found the word.");
      }

      ack?.({ ok: true, correct: true });
      return;
    }

    if (isCloseGuess(guess, round.word.text)) {
      ack?.({ ok: true, closeGuess: true });
      return;
    }

    const message = this.createChatMessage(player.id, player.name, guess, "guess");
    this.appendChatMessage(room, message);
    this.broadcastChatMessage(room, message);
    ack?.({ ok: true });
  }

  handleTypingState(socket: GameSocket, payload: TypingStateRequest): void {
    const room = this.rooms.get(payload.roomId);
    const participantId = this.participantIdBySocketId.get(socket.id);
    const player = room && participantId ? this.findPlayer(room, participantId) : undefined;
    const round = room?.currentRound;

    if (!room || !player || !round || room.phase !== "drawing" || round.drawerId === player.id) {
      return;
    }

    if (round.correctGuesses.has(player.id)) {
      return;
    }

    player.isTyping = payload.isTyping;
    this.markActivity(player, false);
    this.emitTypingState(room, player, payload.isTyping);
  }

  sendReaction(socket: GameSocket, payload: EmojiReactionRequest): void {
    const room = this.rooms.get(payload.roomId);
    const participantId = this.participantIdBySocketId.get(socket.id);
    const participant = room && participantId ? this.findParticipant(room, participantId) : undefined;

    if (!room || !participant || !REACTION_OPTIONS.includes(payload.emoji as (typeof REACTION_OPTIONS)[number])) {
      return;
    }

    this.markActivity(participant, true);

    const reaction: ReactionBurst = {
      id: this.createId(),
      playerId: participant.id,
      playerName: participant.name,
      emoji: payload.emoji,
      createdAt: Date.now()
    };

    room.recentReactions = [...room.recentReactions, reaction].slice(-MAX_REACTIONS);

    this.io.to(room.id).emit(SOCKET_EVENTS.emojiReaction, {
      roomId: room.id,
      reaction
    } satisfies EmojiReactionPayload);
  }

  heartbeat(socketId: string, roomId: string): void {
    const room = this.rooms.get(roomId);
    const participantId = this.participantIdBySocketId.get(socketId);
    const participant = room && participantId ? this.findParticipant(room, participantId) : undefined;

    if (!participant) {
      return;
    }

    this.markActivity(participant, false);
  }

  async handleDisconnect(socketId: string): Promise<void> {
    const roomId = this.roomIdBySocketId.get(socketId);
    const participantId = this.participantIdBySocketId.get(socketId);

    this.roomIdBySocketId.delete(socketId);
    this.participantIdBySocketId.delete(socketId);

    if (!roomId || !participantId) {
      return;
    }

    const room = this.rooms.get(roomId);

    if (!room) {
      return;
    }

    const participant = this.findParticipant(room, participantId);

    if (!participant) {
      return;
    }

    participant.socketId = null;
    participant.isConnected = false;
    participant.isTyping = false;
    participant.lastSeenAt = Date.now();

    if (participant.disconnectTimeout) {
      clearTimeout(participant.disconnectTimeout);
    }

    participant.disconnectTimeout = setTimeout(() => {
      participant.disconnectTimeout = null;
      void this.removeParticipant(room, participant.id, `${participant.name} left the room.`, false);
    }, RECONNECT_GRACE_MS);

    if (
      room.currentRound &&
      room.currentRound.drawerId === participant.id &&
      (room.phase === "choosing" || room.phase === "drawing")
    ) {
      await this.finishRound(room, "The drawer disconnected, so the turn was skipped.");
      return;
    }

    this.broadcastRoomUpdate(room);

    if (room.phase === "drawing" && this.haveAllGuessersFinished(room)) {
      await this.finishRound(room, "Everybody still connected has already guessed.");
    }
  }

  private sanitizeName(name: string): string {
    return name.replace(/\s+/g, " ").trim().slice(0, 18);
  }

  private sanitizeColor(color: string): string {
    return /^#[0-9a-f]{6}$/i.test(color) ? color : "#111827";
  }

  private createRoom(isPrivate: boolean): Room {
    const room: Room = {
      id: randomUUID().replace(/-/g, "").slice(0, 10),
      code: this.generateRoomCode(),
      isPrivate,
      phase: "waiting",
      players: [],
      spectators: [],
      minPlayersToStart: isPrivate ? PRIVATE_ROOM_MIN_PLAYERS : PUBLIC_ROOM_MIN_PLAYERS,
      maxPlayers: ROOM_MAX_PLAYERS,
      totalRounds: 0,
      turnOrder: [],
      turnIndex: 0,
      currentRound: null,
      chat: [],
      recentReactions: [],
      winner: null,
      timers: {
        startTimeout: null,
        choiceTimeout: null,
        roundTimeout: null,
        nextTurnTimeout: null,
        restartTimeout: null
      }
    };

    this.rooms.set(room.id, room);
    this.roomIdByCode.set(room.code, room.id);

    return room;
  }

  private generateRoomCode(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    do {
      code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    } while (this.roomIdByCode.has(code));

    return code;
  }

  private findOpenPublicRoom(): Room | undefined {
    const candidates = [...this.rooms.values()].filter(
      (room) => !room.isPrivate && room.phase === "waiting" && room.players.length < room.maxPlayers
    );

    if (candidates.length === 0) {
      return undefined;
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private joinRoomInternal(
    room: Room,
    socket: GameSocket,
    name: string,
    requestedSessionId?: string
  ): JoinAck {
    const sessionId = requestedSessionId?.trim() || this.createId();
    const existingParticipant = this.findParticipantBySession(room, sessionId);

    if (existingParticipant) {
      existingParticipant.name = name || existingParticipant.name;
      this.attachParticipantToSocket(room, existingParticipant, socket);

      const reconnectMessage = this.createChatMessage(
        null,
        "Draw Clash",
        `${existingParticipant.name} rejoined the room.`,
        "system"
      );
      this.appendChatMessage(room, reconnectMessage);
      this.broadcastChatMessage(room, reconnectMessage);
      this.broadcastRoomUpdate(room);

      return {
        ok: true,
        playerId: existingParticipant.id,
        sessionId: existingParticipant.sessionId,
        room: this.serializeRoom(room, existingParticipant)
      };
    }

    const joinedAt = Date.now();
    const participantId = this.createId();
    const canJoinAsPlayer = room.phase === "waiting" && room.players.length < room.maxPlayers;
    const participant: Player | Spectator = canJoinAsPlayer
      ? {
          id: participantId,
          sessionId,
          socketId: socket.id,
          name,
          joinedAt,
          lastSeenAt: joinedAt,
          lastInteractionAt: joinedAt,
          isConnected: true,
          isTyping: false,
          guessCooldownUntil: 0,
          disconnectTimeout: null,
          score: 0
        }
      : {
          id: participantId,
          sessionId,
          socketId: socket.id,
          name,
          joinedAt,
          lastSeenAt: joinedAt,
          lastInteractionAt: joinedAt,
          isConnected: true,
          isTyping: false,
          guessCooldownUntil: 0,
          disconnectTimeout: null
        };

    if (canJoinAsPlayer) {
      room.players.push(participant as Player);
    } else {
      room.spectators.push(participant as Spectator);
    }

    this.attachParticipantToSocket(room, participant, socket);

    const joinMessage = this.createChatMessage(
      null,
      "Draw Clash",
      canJoinAsPlayer ? `${name} joined the room.` : `${name} joined as a spectator.`,
      "system"
    );

    this.appendChatMessage(room, joinMessage);
    this.broadcastChatMessage(room, joinMessage);
    this.broadcastPlayerJoined(room);

    if (canJoinAsPlayer) {
      this.maybeScheduleGameStart(room);
    } else {
      this.broadcastRoomUpdate(room);
    }

    return {
      ok: true,
      playerId: participant.id,
      sessionId: participant.sessionId,
      room: this.serializeRoom(room, participant)
    };
  }

  private attachParticipantToSocket(room: Room, participant: Participant, socket: GameSocket): void {
    if (participant.socketId && participant.socketId !== socket.id) {
      this.roomIdBySocketId.delete(participant.socketId);
      this.participantIdBySocketId.delete(participant.socketId);
    }

    if (participant.disconnectTimeout) {
      clearTimeout(participant.disconnectTimeout);
      participant.disconnectTimeout = null;
    }

    participant.socketId = socket.id;
    participant.isConnected = true;
    participant.isTyping = false;
    participant.lastSeenAt = Date.now();
    this.roomIdBySocketId.set(socket.id, room.id);
    this.participantIdBySocketId.set(socket.id, participant.id);
    socket.join(room.id);
  }

  private maybeScheduleGameStart(room: Room): void {
    if (room.phase !== "waiting" || room.players.length < room.minPlayersToStart) {
      this.clearTimeout(room, "startTimeout");
      return;
    }

    if (room.timers.startTimeout) {
      return;
    }

    room.timers.startTimeout = setTimeout(() => {
      room.timers.startTimeout = null;
      if (room.phase === "waiting" && room.players.length >= room.minPlayersToStart) {
        this.startGame(room);
      }
    }, ROOM_START_DELAY_MS);
  }

  private startGame(room: Room): void {
    this.clearRoundTimers(room);
    this.kickAfkPlayers(room);
    this.pruneDisconnectedPlayers(room);

    if (room.players.length < room.minPlayersToStart) {
      room.phase = "waiting";
      room.currentRound = null;
      this.broadcastRoomUpdate(room);
      return;
    }

    room.players = room.players
      .slice()
      .sort((left, right) => left.joinedAt - right.joinedAt)
      .map((player) => ({ ...player, score: 0, isTyping: false, guessCooldownUntil: 0 }));
    room.turnOrder = this.buildTurnOrder(room.players);
    room.turnIndex = 0;
    room.totalRounds = room.turnOrder.length;
    room.currentRound = null;
    room.chat = [];
    room.recentReactions = [];
    room.winner = null;

    const gameMessage = this.createChatMessage(
      null,
      "Draw Clash",
      "A new game is starting. Watch the timer and get ready to guess fast.",
      "system"
    );
    this.appendChatMessage(room, gameMessage);
    this.broadcastStartGame(room);
    void this.startNextTurn(room);
  }

  private buildTurnOrder(players: Player[]): string[] {
    const shuffled = players.map((player) => player.id);

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    return Array.from({ length: TURNS_PER_PLAYER }, () => shuffled).flat();
  }

  private async startNextTurn(room: Room): Promise<void> {
    this.clearTimeout(room, "nextTurnTimeout");
    this.clearTimeout(room, "restartTimeout");
    this.kickAfkPlayers(room);
    this.pruneDisconnectedPlayers(room);

    if (room.players.length < room.minPlayersToStart) {
      room.phase = "waiting";
      room.currentRound = null;
      this.broadcastRoomUpdate(room);
      this.maybeScheduleGameStart(room);
      return;
    }

    const drawer = this.getNextDrawer(room);

    if (!drawer) {
      await this.finishGame(room);
      return;
    }

    room.phase = "choosing";
    room.currentRound = {
      number: room.turnIndex,
      totalRounds: room.totalRounds,
      drawerId: drawer.id,
      drawerName: drawer.name,
      phase: "choosing",
      wordChoices: getRandomWordChoices(),
      word: null,
      choiceDeadlineAt: Date.now() + WORD_CHOICE_MS,
      startedAt: null,
      endsAt: null,
      strokes: [],
      activeStrokes: new Map(),
      correctGuesses: new Map()
    };

    room.players.forEach((player) => {
      player.isTyping = false;
      player.guessCooldownUntil = 0;
    });

    const startMessage = this.createChatMessage(
      null,
      "Draw Clash",
      `${drawer.name} is choosing a word.`,
      "system"
    );
    this.appendChatMessage(room, startMessage);
    this.broadcastStartRound(room);

    room.timers.choiceTimeout = setTimeout(() => {
      const fallbackChoice = room.currentRound?.wordChoices[0];

      if (room.phase === "choosing" && fallbackChoice) {
        this.beginDrawing(room, fallbackChoice);
      }
    }, WORD_CHOICE_MS);
  }

  private getNextDrawer(room: Room): Player | undefined {
    while (room.turnIndex < room.turnOrder.length) {
      const nextDrawerId = room.turnOrder[room.turnIndex];
      room.turnIndex += 1;
      const player = room.players.find((entry) => entry.id === nextDrawerId && entry.isConnected);

      if (player) {
        return player;
      }
    }

    return undefined;
  }

  private beginDrawing(room: Room, word: WordEntry): void {
    const round = room.currentRound;

    if (!round) {
      return;
    }

    this.clearTimeout(room, "choiceTimeout");
    round.word = word;
    round.phase = "drawing";
    round.choiceDeadlineAt = null;
    round.startedAt = Date.now();
    round.endsAt = round.startedAt + DRAW_ROUND_MS;
    room.phase = "drawing";

    const roundMessage = this.createChatMessage(
      null,
      "Draw Clash",
      "The round is live. Draw, guess, and climb the board.",
      "system"
    );
    this.appendChatMessage(room, roundMessage);
    this.broadcastRoomUpdate(room);

    room.timers.roundTimeout = setTimeout(() => {
      void this.finishRound(room, "Time is up.");
    }, DRAW_ROUND_MS);
  }

  private haveAllGuessersFinished(room: Room): boolean {
    const round = room.currentRound;

    if (!round || room.phase !== "drawing") {
      return false;
    }

    const eligibleGuessers = room.players.filter(
      (player) => player.id !== round.drawerId && player.isConnected
    );

    return (
      eligibleGuessers.length > 0 &&
      eligibleGuessers.every((player) => round.correctGuesses.has(player.id))
    );
  }

  private async finishRound(room: Room, message: string): Promise<void> {
    const round = room.currentRound;

    if (!round || room.phase === "results" || room.phase === "finished") {
      return;
    }

    this.clearTimeout(room, "choiceTimeout");
    this.clearTimeout(room, "roundTimeout");
    round.phase = "results";
    round.choiceDeadlineAt = null;
    round.endsAt = null;
    round.activeStrokes.clear();
    room.phase = "results";

    const revealedWord = round.word ?? round.wordChoices[0] ?? { text: "mystery word", category: "Easy Words" };
    round.word = revealedWord;

    const drawer = room.players.find((player) => player.id === round.drawerId);
    const drawerBonus = calculateDrawerBonus(round.correctGuesses.size);

    if (drawer) {
      drawer.score += drawerBonus;
    }

    const results = room.players
      .map((player): RoundResultEntry => {
        const guessRecord = round.correctGuesses.get(player.id);
        const isDrawer = player.id === round.drawerId;
        const scoreDelta = isDrawer ? drawerBonus : guessRecord?.scoreAwarded ?? 0;

        return {
          playerId: player.id,
          playerName: player.name,
          isDrawer,
          isCorrect: Boolean(guessRecord),
          guessedAtMs:
            guessRecord && round.startedAt ? guessRecord.submittedAt - round.startedAt : null,
          scoreDelta,
          totalScore: player.score
        };
      })
      .sort((left, right) => right.scoreDelta - left.scoreDelta || right.totalScore - left.totalScore);

    const scoreDeltas = results
      .filter((entry) => entry.scoreDelta > 0)
      .map((entry) => ({ name: entry.playerName, points: entry.scoreDelta }));

    await this.persistence.recordRoundScores(scoreDeltas);

    const wordMessage = this.createChatMessage(
      null,
      "Draw Clash",
      `The word was ${revealedWord.text}.`,
      "system"
    );
    this.appendChatMessage(room, wordMessage);

    const isFinalRound = round.number >= room.totalRounds;

    if (isFinalRound) {
      room.winner = this.getWinner(room.players);
      room.phase = "finished";
      await this.persistence.recordGameHistory(room.id, room.winner?.name ?? null);
    }

    this.broadcastRoundEnd(room, results, revealedWord, room.winner, message);
    this.broadcastLeaderboard(room, results, room.winner);

    const delayMs = isFinalRound ? FINISHED_RESTART_MS : ROUND_RESULTS_MS;
    const nextStartsAt = Date.now() + delayMs;

    this.broadcastNextTurn(room, nextStartsAt);

    if (isFinalRound) {
      room.timers.restartTimeout = setTimeout(() => {
        room.timers.restartTimeout = null;

        if (room.players.length >= room.minPlayersToStart) {
          this.startGame(room);
          return;
        }

        room.phase = "waiting";
        room.currentRound = null;
        room.winner = null;
        this.broadcastRoomUpdate(room);
      }, FINISHED_RESTART_MS);

      return;
    }

    room.timers.nextTurnTimeout = setTimeout(() => {
      room.timers.nextTurnTimeout = null;
      void this.startNextTurn(room);
    }, ROUND_RESULTS_MS);
  }

  private async finishGame(room: Room): Promise<void> {
    room.phase = "finished";
    room.currentRound = null;
    room.winner = this.getWinner(room.players);
    await this.persistence.recordGameHistory(room.id, room.winner?.name ?? null);
    this.broadcastRoomUpdate(room);
  }

  private getWinner(players: Player[]): WinnerSnapshot | null {
    const winner = [...players].sort(
      (left, right) => right.score - left.score || left.joinedAt - right.joinedAt
    )[0];

    if (!winner) {
      return null;
    }

    return {
      id: winner.id,
      name: winner.name,
      score: winner.score
    };
  }

  private kickAfkPlayers(room: Room): void {
    const now = Date.now();
    const afkPlayers = room.players.filter(
      (player) => player.isConnected && now - player.lastInteractionAt >= AFK_KICK_MS
    );

    for (const player of afkPlayers) {
      void this.removeParticipant(room, player.id, `${player.name} was removed for being inactive.`, true);
    }
  }

  private pruneDisconnectedPlayers(room: Room): void {
    const disconnectedPlayers = room.players.filter((player) => !player.isConnected && !player.disconnectTimeout);
    const disconnectedSpectators = room.spectators.filter(
      (spectator) => !spectator.isConnected && !spectator.disconnectTimeout
    );

    for (const participant of [...disconnectedPlayers, ...disconnectedSpectators]) {
      void this.removeParticipant(room, participant.id, `${participant.name} left the room.`, false);
    }
  }

  private async removeParticipant(
    room: Room,
    participantId: string,
    message: string,
    kicked: boolean
  ): Promise<void> {
    const player = this.findPlayer(room, participantId);
    const spectator = player ? undefined : this.findSpectator(room, participantId);
    const participant = player ?? spectator;

    if (!participant) {
      return;
    }

    if (participant.disconnectTimeout) {
      clearTimeout(participant.disconnectTimeout);
      participant.disconnectTimeout = null;
    }

    if (participant.socketId) {
      this.roomIdBySocketId.delete(participant.socketId);
      this.participantIdBySocketId.delete(participant.socketId);
    }

    room.players = room.players.filter((entry) => entry.id !== participantId);
    room.spectators = room.spectators.filter((entry) => entry.id !== participantId);

    if (room.currentRound?.correctGuesses.has(participantId)) {
      room.currentRound.correctGuesses.delete(participantId);
    }

    const leaveMessage = this.createChatMessage(null, "Draw Clash", message, "system");
    this.appendChatMessage(room, leaveMessage);
    this.broadcastChatMessage(room, leaveMessage);

    if (room.players.length === 0 && room.spectators.length === 0) {
      this.destroyRoom(room);
      return;
    }

    if (
      player &&
      room.currentRound &&
      room.currentRound.drawerId === player.id &&
      (room.phase === "choosing" || room.phase === "drawing")
    ) {
      await this.finishRound(room, "The drawer left the room, so the turn was skipped.");
      return;
    }

    if (kicked) {
      this.broadcastPlayerKicked(room, participant.id, "Removed for being inactive.");
    } else {
      this.broadcastRoomUpdate(room);
    }

    if (room.players.length < room.minPlayersToStart) {
      this.clearRoundTimers(room);
      room.phase = "waiting";
      room.currentRound = null;
      room.winner = null;
      this.broadcastRoomUpdate(room);
      return;
    }

    if (room.phase === "drawing" && this.haveAllGuessersFinished(room)) {
      await this.finishRound(room, "Everybody still connected has already guessed.");
    }
  }

  private getDrawingContext(
    socketId: string,
    roomId: string
  ): { room: Room; round: RoundState; player: Player } | null {
    const room = this.rooms.get(roomId);
    const participantId = this.participantIdBySocketId.get(socketId);
    const player = room && participantId ? this.findPlayer(room, participantId) : undefined;
    const round = room?.currentRound;

    if (!room || !round || room.phase !== "drawing" || !player) {
      return null;
    }

    if (round.drawerId !== player.id) {
      return null;
    }

    return { room, round, player };
  }

  private findPlayer(room: Room, participantId: string): Player | undefined {
    return room.players.find((player) => player.id === participantId);
  }

  private findSpectator(room: Room, participantId: string): Spectator | undefined {
    return room.spectators.find((spectator) => spectator.id === participantId);
  }

  private findParticipant(room: Room, participantId: string): Participant | undefined {
    return this.findPlayer(room, participantId) ?? this.findSpectator(room, participantId);
  }

  private findParticipantBySession(room: Room, sessionId: string): Participant | undefined {
    return [...room.players, ...room.spectators].find((participant) => participant.sessionId === sessionId);
  }

  private markActivity(participant: Participant, countsAsInteraction: boolean): void {
    participant.lastSeenAt = Date.now();

    if (countsAsInteraction) {
      participant.lastInteractionAt = participant.lastSeenAt;
    }
  }

  private createId(): string {
    return randomUUID().replace(/-/g, "").slice(0, 12);
  }

  private createChatMessage(
    playerId: string | null,
    playerName: string,
    text: string,
    kind: ChatMessage["kind"]
  ): ChatMessage {
    return {
      id: this.createId(),
      kind,
      playerId,
      playerName,
      text,
      createdAt: Date.now()
    };
  }

  private appendChatMessage(room: Room, message: ChatMessage): void {
    room.chat = [...room.chat, message].slice(-MAX_CHAT_MESSAGES);
  }

  private serializeRoom(room: Room, viewerParticipant: Participant): RoomSnapshot {
    const round = room.currentRound;
    const viewerIsPlayer = Boolean(this.findPlayer(room, viewerParticipant.id));
    const viewerHasGuessed = Boolean(round?.correctGuesses.has(viewerParticipant.id));
    const viewerIsDrawer = Boolean(round && round.drawerId === viewerParticipant.id);
    const canSeeWord = Boolean(
      round &&
        round.word &&
        (viewerIsDrawer || viewerHasGuessed || room.phase === "results" || room.phase === "finished")
    );

    const viewer: ViewerSnapshot = {
      participantId: viewerParticipant.id,
      sessionId: viewerParticipant.sessionId,
      isSpectator: !viewerIsPlayer,
      isDrawer: viewerIsDrawer,
      hasGuessedCorrectly: viewerHasGuessed,
      canDraw: viewerIsDrawer && room.phase === "drawing",
      canGuess:
        viewerIsPlayer &&
        !viewerIsDrawer &&
        room.phase === "drawing" &&
        !viewerHasGuessed &&
        viewerParticipant.isConnected,
      secretWord: canSeeWord && round?.word ? round.word : null,
      wordChoices:
        viewerIsDrawer && room.phase === "choosing" && round ? [...round.wordChoices] : []
    };

    return {
      id: room.id,
      code: room.code,
      isPrivate: room.isPrivate,
      phase: room.phase,
      minPlayersToStart: room.minPlayersToStart,
      maxPlayers: room.maxPlayers,
      totalRounds: room.totalRounds,
      canStart: room.players.length >= room.minPlayersToStart,
      players: [...room.players]
        .sort((left, right) => right.score - left.score || left.joinedAt - right.joinedAt)
        .map((player) => ({
          id: player.id,
          name: player.name,
          score: player.score,
          isDrawer: player.id === round?.drawerId,
          hasGuessedCorrectly: Boolean(round?.correctGuesses.has(player.id)),
          isConnected: player.isConnected,
          isTyping: player.isTyping
        })),
      spectators: [...room.spectators]
        .sort((left, right) => left.joinedAt - right.joinedAt)
        .map<SpectatorSnapshot>((spectator) => ({
          id: spectator.id,
          name: spectator.name,
          isConnected: spectator.isConnected
        })),
      chat: [...room.chat],
      recentReactions: [...room.recentReactions],
      currentRound: round
        ? {
            number: round.number,
            totalRounds: round.totalRounds,
            drawerId: round.drawerId,
            drawerName: round.drawerName,
            phase: round.phase,
            maskedWord: round.word ? (canSeeWord ? round.word.text : maskWord(round.word.text)) : "Choose a word",
            revealedWord: canSeeWord && round.word ? round.word : null,
            wordLength: round.word?.text.length ?? 0,
            choiceDeadlineAt: round.choiceDeadlineAt,
            endsAt: round.endsAt,
            strokes: [...round.strokes],
            guessedPlayerIds: [...round.correctGuesses.keys()],
            correctGuessCount: round.correctGuesses.size
          }
        : null,
      winner: room.winner,
      viewer
    };
  }

  private broadcastPlayerJoined(room: Room): void {
    this.broadcastRoomEvent(SOCKET_EVENTS.playerJoined, room);
  }

  private broadcastRoomUpdate(room: Room): void {
    this.broadcastRoomEvent(SOCKET_EVENTS.roomUpdated, room);
  }

  private broadcastStartGame(room: Room): void {
    this.broadcastRoomEvent(SOCKET_EVENTS.startGame, room);
  }

  private broadcastStartRound(room: Room): void {
    this.broadcastRoomEvent(SOCKET_EVENTS.startRound, room);
  }

  private broadcastRoomEvent(
    eventName:
      | typeof SOCKET_EVENTS.playerJoined
      | typeof SOCKET_EVENTS.roomUpdated
      | typeof SOCKET_EVENTS.startGame
      | typeof SOCKET_EVENTS.startRound,
    room: Room
  ): void {
    this.forEachConnectedParticipant(room, (participant) => {
      this.io.to(participant.socketId!).emit(eventName, {
        room: this.serializeRoom(room, participant)
      } satisfies RoomPayload);
    });
  }

  private broadcastChatMessage(room: Room, message: ChatMessage): void {
    this.forEachConnectedParticipant(room, (participant) => {
      this.io.to(participant.socketId!).emit(SOCKET_EVENTS.chatMessage, {
        room: this.serializeRoom(room, participant),
        message
      } satisfies ChatMessagePayload);
    });
  }

  private broadcastCorrectGuess(room: Room, playerId: string, scoreAwarded: number): void {
    this.forEachConnectedParticipant(room, (participant) => {
      this.io.to(participant.socketId!).emit(SOCKET_EVENTS.correctGuess, {
        room: this.serializeRoom(room, participant),
        playerId,
        scoreAwarded,
        totalCorrect: room.currentRound?.correctGuesses.size ?? 0
      } satisfies CorrectGuessPayload);
    });
  }

  private broadcastRoundEnd(
    room: Room,
    results: RoundResultEntry[],
    word: WordEntry,
    winner: WinnerSnapshot | null,
    message: string
  ): void {
    this.forEachConnectedParticipant(room, (participant) => {
      this.io.to(participant.socketId!).emit(SOCKET_EVENTS.roundEnd, {
        room: this.serializeRoom(room, participant),
        results,
        word,
        winner,
        message
      } satisfies RoundEndPayload);
    });
  }

  private broadcastLeaderboard(
    room: Room,
    results: RoundResultEntry[],
    winner: WinnerSnapshot | null
  ): void {
    this.forEachConnectedParticipant(room, (participant) => {
      this.io.to(participant.socketId!).emit(SOCKET_EVENTS.leaderboard, {
        room: this.serializeRoom(room, participant),
        results,
        winner
      } satisfies LeaderboardPayload);
    });
  }

  private broadcastNextTurn(room: Room, startsAt: number): void {
    this.forEachConnectedParticipant(room, (participant) => {
      this.io.to(participant.socketId!).emit(SOCKET_EVENTS.nextTurn, {
        room: this.serializeRoom(room, participant),
        startsAt
      } satisfies NextTurnPayload);
    });
  }

  private emitTypingState(room: Room, player: Player, isTyping: boolean): void {
    this.io.to(room.id).emit(SOCKET_EVENTS.typingState, {
      roomId: room.id,
      playerId: player.id,
      playerName: player.name,
      isTyping
    } satisfies TypingStatePayload);
  }

  private broadcastPlayerKicked(room: Room, playerId: string, reason: string): void {
    this.forEachConnectedParticipant(room, (participant) => {
      this.io.to(participant.socketId!).emit(SOCKET_EVENTS.playerKicked, {
        room: this.serializeRoom(room, participant),
        playerId,
        reason
      } satisfies PlayerKickedPayload);
    });
  }

  private forEachConnectedParticipant(room: Room, callback: (participant: Participant) => void): void {
    for (const participant of [...room.players, ...room.spectators]) {
      if (participant.socketId && participant.isConnected) {
        callback(participant);
      }
    }
  }

  private clearRoundTimers(room: Room): void {
    this.clearTimeout(room, "startTimeout");
    this.clearTimeout(room, "choiceTimeout");
    this.clearTimeout(room, "roundTimeout");
    this.clearTimeout(room, "nextTurnTimeout");
    this.clearTimeout(room, "restartTimeout");
  }

  private clearTimeout(room: Room, timerKey: keyof Room["timers"]): void {
    const timer = room.timers[timerKey];

    if (timer) {
      clearTimeout(timer);
      room.timers[timerKey] = null;
    }
  }

  private destroyRoom(room: Room): void {
    this.clearRoundTimers(room);

    for (const participant of [...room.players, ...room.spectators]) {
      if (participant.disconnectTimeout) {
        clearTimeout(participant.disconnectTimeout);
      }

      if (participant.socketId) {
        this.roomIdBySocketId.delete(participant.socketId);
        this.participantIdBySocketId.delete(participant.socketId);
      }
    }

    this.rooms.delete(room.id);
    this.roomIdByCode.delete(room.code);
  }
}
