import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import process from "node:process";
import { io } from "socket.io-client";

const rootDir = new URL("..", import.meta.url);
const serverUrl = "http://127.0.0.1:3001";
const clientUrl = "http://127.0.0.1:4175";
const serverEntry = fileURLToPath(new URL("./server/dist/server/src/index.js", rootDir));
const viteEntry = fileURLToPath(new URL("./node_modules/vite/bin/vite.js", rootDir));
const clientDir = fileURLToPath(new URL("./client/", rootDir));

const SOCKET_EVENTS = {
  createRoom: "create_room",
  joinRoom: "join_room",
  startRound: "start_round",
  roomUpdated: "room_updated",
  chooseWord: "choose_word",
  drawStart: "draw_start",
  drawMove: "draw_move",
  drawEnd: "draw_end",
  sendGuess: "send_guess",
  roundEnd: "round_end"
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
      // keep polling
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

const waitForSocketEvent = (socket, eventName, matcher = () => true, timeoutMs = 15_000) =>
  new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);

    const handler = (payload) => {
      if (!matcher(payload)) {
        return;
      }

      clearTimeout(timeoutId);
      socket.off(eventName, handler);
      resolve(payload);
    };

    socket.on(eventName, handler);
  });

const runSocketSmokeTest = async () => {
  log("smoke", "starting realtime gameplay smoke test");

  const alpha = await connectSocket("Alpha");
  const bravo = await connectSocket("Bravo");

  try {
    const alphaRoundPromise = waitForSocketEvent(alpha, SOCKET_EVENTS.startRound);
    const bravoRoundPromise = waitForSocketEvent(bravo, SOCKET_EVENTS.startRound);

    const createResponse = await emitWithAck(alpha, SOCKET_EVENTS.createRoom, {
      name: "Alpha"
    });

    if (!createResponse?.ok || !createResponse.room) {
      throw new Error(createResponse?.error ?? "Failed to create private room");
    }

    const joinResponse = await emitWithAck(bravo, SOCKET_EVENTS.joinRoom, {
      name: "Bravo",
      code: createResponse.room.code
    });

    if (!joinResponse?.ok || !joinResponse.room) {
      throw new Error(joinResponse?.error ?? "Failed to join private room");
    }

    const [alphaRound, bravoRound] = await Promise.all([alphaRoundPromise, bravoRoundPromise]);
    const drawerPayload = alphaRound.room.viewer.isDrawer ? alphaRound : bravoRound;
    const guesserSocket = alphaRound.room.viewer.isDrawer ? bravo : alpha;
    const drawerSocket = alphaRound.room.viewer.isDrawer ? alpha : bravo;
    const chosenWord = drawerPayload.room.viewer.wordChoices[0]?.text;

    if (!chosenWord) {
      throw new Error("Drawer did not receive word choices");
    }

    const drawingUpdatePromise = waitForSocketEvent(
      alphaRound.room.viewer.isDrawer ? bravo : alpha,
      SOCKET_EVENTS.roomUpdated,
      (payload) => payload?.room?.phase === "drawing"
    );

    const chooseAck = await emitWithAck(drawerSocket, SOCKET_EVENTS.chooseWord, {
      roomId: drawerPayload.room.id,
      word: chosenWord
    });

    if (!chooseAck?.ok) {
      throw new Error(chooseAck?.error ?? "Drawer could not choose a word");
    }

    await drawingUpdatePromise;

    const strokeId = "verify-stroke-1";
    const drawStartAck = await emitWithAck(drawerSocket, SOCKET_EVENTS.drawStart, {
      roomId: drawerPayload.room.id,
      strokeId,
      point: { x: 80, y: 90 },
      color: "#111827",
      size: 8,
      tool: "pencil"
    });

    if (!drawStartAck?.ok) {
      throw new Error(drawStartAck?.error ?? "draw_start failed");
    }

    await emitWithAck(drawerSocket, SOCKET_EVENTS.drawMove, {
      roomId: drawerPayload.room.id,
      strokeId,
      point: { x: 180, y: 160 }
    });

    const drawEndEventPromise = waitForSocketEvent(
      guesserSocket,
      SOCKET_EVENTS.drawEnd,
      (payload) => payload?.stroke?.id === strokeId
    );

    await emitWithAck(drawerSocket, SOCKET_EVENTS.drawEnd, {
      roomId: drawerPayload.room.id,
      strokeId,
      point: { x: 240, y: 220 }
    });

    await drawEndEventPromise;

    const roundEndPromise = waitForSocketEvent(guesserSocket, SOCKET_EVENTS.roundEnd);
    const guessAck = await emitWithAck(guesserSocket, SOCKET_EVENTS.sendGuess, {
      roomId: drawerPayload.room.id,
      guess: chosenWord
    });

    if (!guessAck?.ok || !guessAck?.correct) {
      throw new Error(guessAck?.error ?? "Correct guess was not accepted");
    }

    const roundEnd = await roundEndPromise;
    const winningEntry = roundEnd?.results?.find((entry) => entry.playerName === "Bravo" || entry.playerName === "Alpha");

    if (!roundEnd?.word || roundEnd.word.text.toLowerCase() !== chosenWord.toLowerCase()) {
      throw new Error("Round end did not reveal the correct word");
    }

    if (!winningEntry || !roundEnd.results.some((entry) => entry.isCorrect && entry.scoreDelta > 0)) {
      throw new Error("Round end did not award points to a correct guesser");
    }

    if (!roundEnd.results.some((entry) => entry.isDrawer && entry.scoreDelta > 0)) {
      throw new Error("Drawer did not receive a bonus");
    }

    log("smoke", "socket smoke test passed");
  } finally {
    alpha.disconnect();
    bravo.disconnect();
  }
};

const main = async () => {
  startProcess("server", process.execPath, [serverEntry]);
  startProcess(
    "client",
    process.execPath,
    [viteEntry, "preview", "--host", "127.0.0.1", "--port", "4175", "--strictPort"],
    clientDir
  );

  await waitFor(async () => {
    const body = await fetchText(`${serverUrl}/health`);
    return body.includes('"service":"draw-clash-server"');
  }, "backend health endpoint");

  await waitFor(async () => {
    const body = await fetchText(clientUrl);
    return body.includes("<title>Draw Clash</title>");
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
