import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";
import {
  CLUE_ENTRY_MS,
  CLUE_MAX_LENGTH,
  PRIVATE_ROOM_MIN_PLAYERS,
  PUBLIC_ROOM_MIN_PLAYERS,
  ROOM_MAX_PLAYERS,
  ROOM_START_DELAY_MS,
  ROUND_GUESS_MS,
  ROUND_RESULTS_MS,
  SOCKET_EVENTS
} from "../../../shared/constants.js";
import { getCountryByCode, type Country } from "../../../shared/countries.js";
import type {
  ActionAck,
  ClientToServerEvents,
  JoinAck,
  JoinPrivateRoomRequest,
  JoinRequest,
  RoomSnapshot,
  RoundResultEntry,
  ServerToClientEvents,
  SubmitClueRequest,
  SubmitGuessRequest
} from "../../../shared/types.js";
import { calculateGuessPoints } from "./scoring.js";
import { buildCountryOptions } from "./options.js";
import type { Persistence } from "../persistence.js";
import type { GuessRecord, Player, Room, RoundState } from "./types.js";

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly roomIdByCode = new Map<string, string>();
  private readonly roomIdBySocketId = new Map<string, string>();
  private readonly playerIdBySocketId = new Map<string, string>();

  constructor(
    private readonly io: Server<ClientToServerEvents, ServerToClientEvents>,
    private readonly persistence: Persistence
  ) {}

  joinMatchmaking(socket: GameSocket, payload: JoinRequest, ack: (response: JoinAck) => void): void {
    const name = this.sanitizeName(payload.name);

    if (!name) {
      ack({ ok: false, error: "Enter a display name to continue." });
      return;
    }

    const room = this.findOpenPublicRoom() ?? this.createRoom(false);
    const response = this.addPlayerToRoom(room, socket, name);
    ack(response);
    this.broadcastRoomUpdate(room);
    this.maybeScheduleRoundStart(room);
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
    const response = this.addPlayerToRoom(room, socket, name);
    ack(response);
    this.broadcastRoomUpdate(room);
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

    if (room.players.length >= room.maxPlayers) {
      ack({ ok: false, error: "That room is already full." });
      return;
    }

    const response = this.addPlayerToRoom(room, socket, name);
    ack(response);
    this.broadcastRoomUpdate(room);
    this.maybeScheduleRoundStart(room);
  }

  submitClue(
    socket: GameSocket,
    payload: SubmitClueRequest,
    ack?: (response: ActionAck) => void
  ): void {
    const room = this.rooms.get(payload.roomId);
    const playerId = this.playerIdBySocketId.get(socket.id);

    if (!room || !room.currentRound || room.phase !== "clue" || !playerId) {
      ack?.({ ok: false, error: "The round is not ready for a clue." });
      return;
    }

    if (room.currentRound.hostId !== playerId) {
      ack?.({ ok: false, error: "Only the host can submit the clue." });
      return;
    }

    const clue = payload.clue.trim().slice(0, CLUE_MAX_LENGTH);
    const answerCountry = getCountryByCode(payload.countryCode);

    if (!clue) {
      ack?.({ ok: false, error: "Add a short clue before starting the round." });
      return;
    }

    if (!answerCountry) {
      ack?.({ ok: false, error: "Choose a valid country for this clue." });
      return;
    }

    this.clearTimeout(room, "clueTimeout");

    room.phase = "guessing";
    room.currentRound.phase = "guessing";
    room.currentRound.clue = clue;
    room.currentRound.answer = answerCountry;
    room.currentRound.options = buildCountryOptions(answerCountry);
    room.currentRound.guessStartedAt = Date.now();
    room.currentRound.guessDeadlineAt = room.currentRound.guessStartedAt + ROUND_GUESS_MS;

    this.io.to(room.id).emit(SOCKET_EVENTS.startRound, {
      room: this.serializeRoom(room)
    });

    room.timers.guessTimeout = setTimeout(() => {
      void this.finishRound(room);
    }, ROUND_GUESS_MS);

    ack?.({ ok: true });
  }

  submitGuess(
    socket: GameSocket,
    payload: SubmitGuessRequest,
    ack?: (response: ActionAck) => void
  ): void {
    const room = this.rooms.get(payload.roomId);
    const playerId = this.playerIdBySocketId.get(socket.id);

    if (!room || !room.currentRound || room.phase !== "guessing" || !playerId) {
      ack?.({ ok: false, error: "Guessing is closed for this round." });
      return;
    }

    if (room.currentRound.hostId === playerId) {
      ack?.({ ok: false, error: "The host cannot submit a guess." });
      return;
    }

    if (room.currentRound.guesses.has(playerId)) {
      ack?.({ ok: false, error: "You already locked in a guess." });
      return;
    }

    const isValidOption = room.currentRound.options.some(
      (country) => country.code === payload.countryCode.toUpperCase()
    );

    if (!isValidOption) {
      ack?.({ ok: false, error: "Choose one of the available country options." });
      return;
    }

    const guessRecord: GuessRecord = {
      countryCode: payload.countryCode.toUpperCase(),
      submittedAt: Date.now()
    };

    room.currentRound.guesses.set(playerId, guessRecord);
    ack?.({ ok: true });

    if (this.haveAllGuessersSubmitted(room)) {
      void this.finishRound(room);
    }
  }

  async handleDisconnect(socketId: string): Promise<void> {
    const roomId = this.roomIdBySocketId.get(socketId);
    const playerId = this.playerIdBySocketId.get(socketId);

    if (!roomId || !playerId) {
      return;
    }

    const room = this.rooms.get(roomId);

    this.roomIdBySocketId.delete(socketId);
    this.playerIdBySocketId.delete(socketId);

    if (!room) {
      return;
    }

    const removedPlayer = room.players.find((player) => player.id === playerId);
    room.players = room.players.filter((player) => player.id !== playerId);

    if (room.players.length === 0) {
      await this.persistence.recordGameHistory(room.id, removedPlayer?.name ?? null);
      this.destroyRoom(room);
      return;
    }

    if (room.players.length < room.minPlayersToStart) {
      this.setRoomToWaiting(room);
      this.broadcastRoomUpdate(room);
      return;
    }

    if (room.currentRound?.phase === "clue" && room.currentRound.hostId === playerId) {
      void this.finishRound(room, "The host left before submitting a clue.");
      return;
    }

    this.broadcastRoomUpdate(room);

    if (room.currentRound?.phase === "guessing" && this.haveAllGuessersSubmitted(room)) {
      void this.finishRound(room);
    }
  }

  private sanitizeName(name: string): string {
    return name.replace(/\s+/g, " ").trim().slice(0, 18);
  }

  private findOpenPublicRoom(): Room | undefined {
    const candidates = [...this.rooms.values()].filter(
      (room) => !room.isPrivate && room.players.length < room.maxPlayers
    );

    if (candidates.length === 0) {
      return undefined;
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private createRoom(isPrivate: boolean): Room {
    const room: Room = {
      id: randomUUID().replace(/-/g, "").slice(0, 10),
      code: this.generateRoomCode(),
      isPrivate,
      phase: "waiting",
      players: [],
      minPlayersToStart: isPrivate ? PRIVATE_ROOM_MIN_PLAYERS : PUBLIC_ROOM_MIN_PLAYERS,
      maxPlayers: ROOM_MAX_PLAYERS,
      currentRound: null,
      lastHostId: null,
      timers: {
        startTimeout: null,
        clueTimeout: null,
        guessTimeout: null,
        nextRoundTimeout: null
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

  private addPlayerToRoom(room: Room, socket: GameSocket, name: string): JoinAck {
    const player: Player = {
      id: randomUUID().replace(/-/g, "").slice(0, 10),
      socketId: socket.id,
      name,
      score: 0,
      joinedAt: Date.now()
    };

    room.players.push(player);
    this.roomIdBySocketId.set(socket.id, room.id);
    this.playerIdBySocketId.set(socket.id, player.id);
    socket.join(room.id);

    return {
      ok: true,
      playerId: player.id,
      room: this.serializeRoom(room)
    };
  }

  private serializeRoom(room: Room): RoomSnapshot {
    const hostId = room.currentRound?.hostId ?? null;
    const shouldRevealAnswer = room.phase === "results";

    return {
      id: room.id,
      code: room.code,
      isPrivate: room.isPrivate,
      phase: room.phase,
      minPlayersToStart: room.minPlayersToStart,
      maxPlayers: room.maxPlayers,
      canStart: room.players.length >= room.minPlayersToStart,
      players: [...room.players]
        .sort((left, right) => right.score - left.score || left.joinedAt - right.joinedAt)
        .map((player) => ({
          id: player.id,
          name: player.name,
          score: player.score,
          isHost: player.id === hostId
        })),
      currentRound: room.currentRound
        ? {
            number: room.currentRound.number,
            hostId,
            hostName: room.currentRound.hostName,
            clue: room.currentRound.clue,
            phase: room.currentRound.phase,
            answer: shouldRevealAnswer ? room.currentRound.answer : null,
            options: room.currentRound.phase === "guessing" || shouldRevealAnswer ? room.currentRound.options : [],
            clueDeadlineAt: room.currentRound.clueDeadlineAt,
            guessDeadlineAt: room.currentRound.guessDeadlineAt,
            submittedGuessIds: [...room.currentRound.guesses.keys()]
          }
        : null
    };
  }

  private maybeScheduleRoundStart(room: Room): void {
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
        this.startRound(room);
      }
    }, ROOM_START_DELAY_MS);
  }

  private startRound(room: Room): void {
    this.clearRoundTimers(room);

    if (room.players.length < room.minPlayersToStart) {
      this.setRoomToWaiting(room);
      this.broadcastRoomUpdate(room);
      return;
    }

    const host = this.getNextHost(room);

    if (!host) {
      this.setRoomToWaiting(room);
      this.broadcastRoomUpdate(room);
      return;
    }

    room.lastHostId = host.id;
    room.phase = "clue";

    const roundNumber = (room.currentRound?.number ?? 0) + 1;

    room.currentRound = {
      number: roundNumber,
      hostId: host.id,
      hostName: host.name,
      clue: "",
      answer: null,
      options: [],
      phase: "clue",
      clueDeadlineAt: Date.now() + CLUE_ENTRY_MS,
      guessStartedAt: null,
      guessDeadlineAt: null,
      guesses: new Map()
    };

    this.io.to(room.id).emit(SOCKET_EVENTS.startRound, {
      room: this.serializeRoom(room)
    });

    room.timers.clueTimeout = setTimeout(() => {
      void this.finishRound(room, "The host ran out of time to submit a clue.");
    }, CLUE_ENTRY_MS);
  }

  private getNextHost(room: Room): Player | undefined {
    if (room.players.length === 0) {
      return undefined;
    }

    if (!room.lastHostId) {
      return room.players[Math.floor(Math.random() * room.players.length)];
    }

    const previousHostIndex = room.players.findIndex((player) => player.id === room.lastHostId);

    if (previousHostIndex === -1) {
      return room.players[0];
    }

    return room.players[(previousHostIndex + 1) % room.players.length];
  }

  private haveAllGuessersSubmitted(room: Room): boolean {
    if (!room.currentRound || room.currentRound.phase !== "guessing") {
      return false;
    }

    const eligibleGuessers = room.players.filter((player) => player.id !== room.currentRound?.hostId);

    return eligibleGuessers.length > 0 && eligibleGuessers.every((player) => room.currentRound?.guesses.has(player.id));
  }

  private async finishRound(room: Room, message?: string): Promise<void> {
    const round = room.currentRound;

    if (!round || room.phase === "results") {
      return;
    }

    this.clearTimeout(room, "clueTimeout");
    this.clearTimeout(room, "guessTimeout");

    room.phase = "results";
    round.phase = "results";
    round.clueDeadlineAt = null;
    round.guessDeadlineAt = null;

    const results = this.buildRoundResults(room, round);
    const scoreDeltas = results
      .filter((result) => result.pointsEarned > 0)
      .map((result) => ({ name: result.playerName, points: result.pointsEarned }));

    await this.persistence.recordRoundScores(scoreDeltas);

    const snapshot = this.serializeRoom(room);

    this.io.to(room.id).emit(SOCKET_EVENTS.roundResult, {
      room: snapshot,
      correctCountry: round.answer,
      results,
      message
    });

    this.io.to(room.id).emit(SOCKET_EVENTS.leaderboardUpdate, {
      room: snapshot
    });

    room.timers.nextRoundTimeout = setTimeout(() => {
      room.timers.nextRoundTimeout = null;

      if (room.players.length >= room.minPlayersToStart) {
        this.startRound(room);
        return;
      }

      this.setRoomToWaiting(room);
      this.broadcastRoomUpdate(room);
    }, ROUND_RESULTS_MS);

    if (room.players.length >= room.minPlayersToStart) {
      this.io.to(room.id).emit(SOCKET_EVENTS.nextRound, {
        room: snapshot,
        startsAt: Date.now() + ROUND_RESULTS_MS
      });
    }
  }

  private buildRoundResults(room: Room, round: RoundState): RoundResultEntry[] {
    const correctCountryCode = round.answer?.code;
    const results = room.players.map((player) => {
      const guessRecord = round.guesses.get(player.id);
      const guess = guessRecord ? getCountryByCode(guessRecord.countryCode) ?? null : null;
      const answerTimeMs =
        guessRecord && round.guessStartedAt ? guessRecord.submittedAt - round.guessStartedAt : null;
      const isCorrect = Boolean(correctCountryCode && guess?.code === correctCountryCode);
      const pointsEarned = isCorrect && answerTimeMs !== null ? calculateGuessPoints(answerTimeMs) : 0;

      player.score += pointsEarned;

      return {
        playerId: player.id,
        playerName: player.name,
        guess,
        isCorrect,
        pointsEarned,
        answerTimeMs
      };
    });

    return results.sort((left, right) => right.pointsEarned - left.pointsEarned || left.playerName.localeCompare(right.playerName));
  }

  private setRoomToWaiting(room: Room): void {
    this.clearRoundTimers(room);
    room.phase = "waiting";
    room.currentRound = null;
  }

  private clearRoundTimers(room: Room): void {
    this.clearTimeout(room, "startTimeout");
    this.clearTimeout(room, "clueTimeout");
    this.clearTimeout(room, "guessTimeout");
    this.clearTimeout(room, "nextRoundTimeout");
  }

  private clearTimeout(room: Room, timerKey: keyof Room["timers"]): void {
    const timer = room.timers[timerKey];

    if (timer) {
      clearTimeout(timer);
      room.timers[timerKey] = null;
    }
  }

  private broadcastRoomUpdate(room: Room): void {
    this.io.to(room.id).emit(SOCKET_EVENTS.playerJoined, {
      room: this.serializeRoom(room)
    });
  }

  private destroyRoom(room: Room): void {
    this.clearRoundTimers(room);
    this.rooms.delete(room.id);
    this.roomIdByCode.delete(room.code);
  }
}
