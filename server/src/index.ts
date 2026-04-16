import "dotenv/config";
import http from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { SOCKET_EVENTS } from "../../shared/constants.js";
import type { ClientToServerEvents, ServerToClientEvents } from "../../shared/types.js";
import { CLIENT_ORIGIN, DATABASE_URL, PORT } from "./config.js";
import { RoomManager } from "./game/room-manager.js";
import { Persistence } from "./persistence.js";

const app = express();

app.use(
  cors({
    origin: CLIENT_ORIGIN
  })
);
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "draw-clash-server"
  });
});

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: CLIENT_ORIGIN
  }
});

const persistence = new Persistence(DATABASE_URL);
const roomManager = new RoomManager(io, persistence);

io.on("connection", (socket) => {
  socket.on(SOCKET_EVENTS.joinGame, (payload, ack) => {
    roomManager.joinMatchmaking(socket, payload, ack);
  });

  socket.on(SOCKET_EVENTS.createRoom, (payload, ack) => {
    roomManager.createPrivateRoom(socket, payload, ack);
  });

  socket.on(SOCKET_EVENTS.joinRoom, (payload, ack) => {
    roomManager.joinPrivateRoom(socket, payload, ack);
  });

  socket.on(SOCKET_EVENTS.rejoinRoom, (payload, ack) => {
    roomManager.rejoinRoom(socket, payload, ack);
  });

  socket.on(SOCKET_EVENTS.chooseWord, (payload, ack) => {
    roomManager.chooseWord(socket, payload, ack);
  });

  socket.on(SOCKET_EVENTS.drawStart, (payload, ack) => {
    roomManager.drawStart(socket, payload, ack);
  });

  socket.on(SOCKET_EVENTS.drawMove, (payload, ack) => {
    roomManager.drawMove(socket, payload, ack);
  });

  socket.on(SOCKET_EVENTS.drawEnd, (payload, ack) => {
    roomManager.drawEnd(socket, payload, ack);
  });

  socket.on(SOCKET_EVENTS.undoStroke, (payload, ack) => {
    roomManager.undoStroke(socket, payload, ack);
  });

  socket.on(SOCKET_EVENTS.clearCanvas, (payload, ack) => {
    roomManager.clearCanvas(socket, payload, ack);
  });

  socket.on(SOCKET_EVENTS.sendGuess, (payload, ack) => {
    roomManager.sendGuess(socket, payload, ack);
  });

  socket.on(SOCKET_EVENTS.typingState, (payload) => {
    roomManager.handleTypingState(socket, payload);
  });

  socket.on(SOCKET_EVENTS.emojiReaction, (payload) => {
    roomManager.sendReaction(socket, payload);
  });

  socket.on(SOCKET_EVENTS.heartbeat, (payload) => {
    roomManager.heartbeat(socket.id, payload.roomId);
  });

  socket.on("disconnect", () => {
    void roomManager.handleDisconnect(socket.id);
  });
});

const bootstrap = async (): Promise<void> => {
  try {
    await persistence.initialize();

    server.listen(PORT, () => {
      console.log(`Draw Clash server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Draw Clash server", error);
    process.exit(1);
  }
};

void bootstrap();

const shutdown = async (): Promise<void> => {
  await persistence.close();
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
