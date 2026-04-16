import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import process from "node:process";
import { io } from "socket.io-client";

const rootDir = new URL("..", import.meta.url);
const serverUrl = "http://127.0.0.1:3001";
const clientUrl = "http://127.0.0.1:4173";
const serverEntry = fileURLToPath(new URL("./server/dist/server/src/index.js", rootDir));
const viteEntry = fileURLToPath(new URL("./node_modules/vite/bin/vite.js", rootDir));
const clientDir = fileURLToPath(new URL("./client/", rootDir));
const SOCKET_EVENTS = {
  createRoom: "create_room",
  joinRoom: "join_room",
  startRound: "start_round",
  submitClue: "submit_clue",
  submitGuess: "submit_guess",
  roundResult: "round_result"
};

const childProcesses = [];

const log = (scope, message) => {
  process.stdout.write(`[verify:${scope}] ${message}\n`);
};

const startProcess = (scope, command, args, cwd = fileURLToPath(rootDir)) => {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${scope}] ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${scope}] ${chunk}`);
  });

  childProcesses.push(child);
  return child;
};

const stopProcess = async (child) => {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");

  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    delay(3_000).then(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
    })
  ]);
};

const cleanup = async () => {
  await Promise.allSettled(childProcesses.map((child) => stopProcess(child)));
};

const waitFor = async (check, description, timeoutMs = 30_000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const result = await check();

      if (result) {
        log("ready", `${description} is ready`);
        return;
      }
    } catch {
      // Keep polling until timeout.
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${description}`);
};

const fetchText = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.text();
};

const connectSocket = async (name) => {
  const socket = io(serverUrl, {
    transports: ["websocket", "polling"],
    reconnection: false
  });

  await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timed out connecting socket for ${name}`));
    }, 10_000);

    socket.once("connect", () => {
      clearTimeout(timeoutId);
      resolve();
    });

    socket.once("connect_error", (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });

  return socket;
};

const emitWithAck = (socket, eventName, payload) =>
  new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timed out waiting for ack on ${eventName}`));
    }, 10_000);

    socket.emit(eventName, payload, (response) => {
      clearTimeout(timeoutId);
      resolve(response);
    });
  });

const waitForSocketEvent = (sockets, eventName, matcher = () => true, timeoutMs = 15_000) =>
  new Promise((resolve, reject) => {
    const listeners = [];
    const timeoutId = setTimeout(() => {
      cleanupListeners();
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);

    const cleanupListeners = () => {
      clearTimeout(timeoutId);
      for (const [socket, handler] of listeners) {
        socket.off(eventName, handler);
      }
    };

    for (const socket of sockets) {
      const handler = (payload) => {
        if (!matcher(payload)) {
          return;
        }

        cleanupListeners();
        resolve(payload);
      };

      listeners.push([socket, handler]);
      socket.on(eventName, handler);
    }
  });

const runSocketSmokeTest = async () => {
  log("smoke", "starting realtime gameplay smoke test");

  const alpha = await connectSocket("Alpha");
  const bravo = await connectSocket("Bravo");

  try {
    const createResponse = await emitWithAck(alpha, SOCKET_EVENTS.createRoom, {
      name: "Alpha"
    });

    if (!createResponse?.ok || !createResponse.room || !createResponse.playerId) {
      throw new Error(createResponse?.error ?? "Failed to create private room");
    }

    const roomCode = createResponse.room.code;
    const startRoundPromise = waitForSocketEvent(
      [alpha, bravo],
      SOCKET_EVENTS.startRound,
      (payload) => payload?.room?.phase === "clue"
    );

    const joinResponse = await emitWithAck(bravo, SOCKET_EVENTS.joinRoom, {
      name: "Bravo",
      code: roomCode
    });

    if (!joinResponse?.ok || !joinResponse.room || !joinResponse.playerId) {
      throw new Error(joinResponse?.error ?? "Failed to join private room");
    }

    const clueRound = await startRoundPromise;
    const round = clueRound.room.currentRound;

    if (!round?.hostId) {
      throw new Error("Round started without a host");
    }

    const hostSocket = round.hostId === createResponse.playerId ? alpha : bravo;
    const guessSocket = round.hostId === createResponse.playerId ? bravo : alpha;
    const guessingRoundPromise = waitForSocketEvent(
      [alpha, bravo],
      SOCKET_EVENTS.startRound,
      (payload) => payload?.room?.phase === "guessing"
    );

    const clueAck = await emitWithAck(hostSocket, SOCKET_EVENTS.submitClue, {
      roomId: clueRound.room.id,
      clue: "Taj Mahal and giant festivals",
      countryCode: "IN"
    });

    if (!clueAck?.ok) {
      throw new Error(clueAck?.error ?? "Host clue submission failed");
    }

    const guessingRound = await guessingRoundPromise;
    const options = guessingRound.room.currentRound?.options ?? [];

    if (options.length !== 4 || !options.some((option) => option.code === "IN")) {
      throw new Error("Guess options were not generated correctly");
    }

    const resultPromise = waitForSocketEvent([alpha, bravo], SOCKET_EVENTS.roundResult);
    const guessAck = await emitWithAck(guessSocket, SOCKET_EVENTS.submitGuess, {
      roomId: guessingRound.room.id,
      countryCode: "IN"
    });

    if (!guessAck?.ok) {
      throw new Error(guessAck?.error ?? "Guess submission failed");
    }

    const resultPayload = await resultPromise;
    const correctCountry = resultPayload?.correctCountry;
    const winningEntry = resultPayload?.results?.find((entry) => entry.isCorrect);

    if (correctCountry?.code !== "IN") {
      throw new Error("Round result returned the wrong country");
    }

    if (!winningEntry || winningEntry.pointsEarned <= 0) {
      throw new Error("Correct guess did not award points");
    }

    log("smoke", "socket smoke test passed");
  } finally {
    alpha.disconnect();
    bravo.disconnect();
  }
};

const main = async () => {
  const server = startProcess("server", process.execPath, [serverEntry]);
  const client = startProcess("client", process.execPath, [
    viteEntry,
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4173"
  ], clientDir);

  void server;
  void client;

  await waitFor(async () => {
    const body = await fetchText(`${serverUrl}/health`);
    return body.includes('"ok":true');
  }, "backend health endpoint");

  await waitFor(async () => {
    const body = await fetchText(clientUrl);
    return body.includes("<title>Guess Where</title>");
  }, "frontend preview");

  await runSocketSmokeTest();
  log("done", "local verification passed");
};

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await cleanup();
}
