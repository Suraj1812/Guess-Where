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
    service: "guess-where-server"
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

  socket.on(SOCKET_EVENTS.submitClue, (payload, ack) => {
    roomManager.submitClue(socket, payload, ack);
  });

  socket.on(SOCKET_EVENTS.submitGuess, (payload, ack) => {
    roomManager.submitGuess(socket, payload, ack);
  });

  socket.on("disconnect", () => {
    void roomManager.handleDisconnect(socket.id);
  });
});

const bootstrap = async (): Promise<void> => {
  try {
    await persistence.initialize();

    server.listen(PORT, () => {
      console.log(`Guess Where server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Guess Where server", error);
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
