import express from "express";
import type { Request, Response } from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import type { Room, RoomVisibility } from "./types.js";
import {
  advanceTurn,
  canJoinRoom,
  getOrderedPlayerIds,
  resetRoomToLobby,
  serializeRoom,
  shouldEndRoundEarly,
} from "./game/roomManager.js";
import { computeGameState, revealNextHint } from "./game/gameEngine.js";

type Point = { x: number; y: number; color: string; size: number };
type Stroke = Point[];
type ChatEntry = { name: string; message: string };

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.get("/", (_req: Request, res: Response) => res.send("OK"));

const rooms = new Map<string, Room>();
const roomStrokes = new Map<string, Stroke[]>();
const activeStrokes = new Map<string, Stroke>();
const roomChatHistory = new Map<string, ChatEntry[]>();

const WORDS = ["apple", "house", "car", "tree", "cat", "dog"];
const MAX_CHAT_HISTORY = 80;

function pickWordOptions(count: number): string[] {
  const shuffled = [...WORDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(1, Math.min(count, shuffled.length)));
}

function getValidatedPlayerName(name: string) {
  const normalizedName = name.trim().replace(/\s+/g, " ");

  if (!normalizedName) {
    return { error: "Enter a player name before joining or creating a room." };
  }

  if (normalizedName.length > 20) {
    return { error: "Player name must be 20 characters or fewer." };
  }

  return { name: normalizedName };
}

function pushChatMessage(roomCode: string, entry: ChatEntry) {
  const history = roomChatHistory.get(roomCode) ?? [];
  history.push(entry);
  roomChatHistory.set(roomCode, history.slice(-MAX_CHAT_HISTORY));
  io.to(roomCode).emit("chat_message", entry);
}

function emitSystemMessage(roomCode: string, message: string) {
  pushChatMessage(roomCode, { name: "System", message });
}

function emitCanvasState(roomCode: string) {
  io.to(roomCode).emit("canvas_state", {
    strokes: roomStrokes.get(roomCode) ?? [],
  });
}

function resetCanvas(roomCode: string) {
  roomStrokes.set(roomCode, []);
  activeStrokes.delete(roomCode);
  io.to(roomCode).emit("canvas_cleared");
}

function canPlayerDraw(room: Room | undefined, socketId: string) {
  return !!room && room.state === "playing" && room.currentDrawerId === socketId;
}

function handlePlayerDisconnect(socketId: string) {
  for (const [roomCode, room] of rooms.entries()) {
    if (!room.players[socketId]) continue;

    const wasHost = room.hostId === socketId;
    const wasDrawer = room.currentDrawerId === socketId;

    delete room.players[socketId];

    const remainingPlayerIds = Object.keys(room.players);

    if (remainingPlayerIds.length === 0) {
      clearRoomTimer(room);
      roomStrokes.delete(roomCode);
      activeStrokes.delete(roomCode);
      roomChatHistory.delete(roomCode);
      rooms.delete(roomCode);
      return;
    }

    if (wasHost) {
      room.hostId = remainingPlayerIds[0];
    }

    if (room.state !== "lobby" && remainingPlayerIds.length < 2) {
      clearRoomTimer(room);
      resetRoomToLobby(room);
      resetCanvas(roomCode);
      emitSystemMessage(roomCode, "Not enough players to continue. Game reset to lobby.");
      io.to(roomCode).emit("room_updated", serializeRoom(room));
      io.to(roomCode).emit("game_state", computeGameState(room));
      return;
    }

    if (wasDrawer && room.state === "choosing") {
      advanceTurn(room, remainingPlayerIds);
      if ((room.currentRound ?? 1) > room.settings.rounds) {
        room.state = "finished";
        io.to(roomCode).emit("room_updated", serializeRoom(room));
        io.to(roomCode).emit("game_state", computeGameState(room));
        io.to(roomCode).emit("game_over", {
          roomCode: room.code,
          players: Object.values(room.players),
        });
        return;
      }
      prepareRound(roomCode);
      return;
    }

    if (wasDrawer && room.state === "playing") {
      emitSystemMessage(roomCode, "Drawer disconnected. Moving to the next round.");
      endRound(roomCode);
      return;
    }

    io.to(roomCode).emit("room_updated", serializeRoom(room));
    if (room.state !== "lobby") {
      io.to(roomCode).emit("game_state", computeGameState(room));
    }
    return;
  }
}

function removePlayerFromRoom(roomCode: string, socketId: string) {
  const room = rooms.get(roomCode);
  if (!room || !room.players[socketId]) {
    return { ok: false, error: "Room not found" };
  }

  const wasHost = room.hostId === socketId;
  const wasDrawer = room.currentDrawerId === socketId;

  delete room.players[socketId];

  const remainingPlayerIds = Object.keys(room.players);

  if (remainingPlayerIds.length === 0) {
    clearRoomTimer(room);
    roomStrokes.delete(roomCode);
    activeStrokes.delete(roomCode);
    roomChatHistory.delete(roomCode);
    rooms.delete(roomCode);
    return { ok: true };
  }

  if (wasHost) {
    room.hostId = remainingPlayerIds[0];
  }

  if (room.state !== "lobby" && remainingPlayerIds.length < 2) {
    clearRoomTimer(room);
    resetRoomToLobby(room);
    resetCanvas(roomCode);
    emitSystemMessage(roomCode, "Not enough players to continue. Game reset to lobby.");
    io.to(roomCode).emit("room_updated", serializeRoom(room));
    io.to(roomCode).emit("game_state", computeGameState(room));
    return { ok: true };
  }

  if (wasDrawer && room.state === "choosing") {
    advanceTurn(room, remainingPlayerIds);
    if ((room.currentRound ?? 1) > room.settings.rounds) {
      room.state = "finished";
      io.to(roomCode).emit("room_updated", serializeRoom(room));
      io.to(roomCode).emit("game_state", computeGameState(room));
      io.to(roomCode).emit("game_over", {
        roomCode: room.code,
        players: Object.values(room.players),
      });
      return { ok: true };
    }
    prepareRound(roomCode);
    return { ok: true };
  }

  if (wasDrawer && room.state === "playing") {
    emitSystemMessage(roomCode, "Drawer left the room. Moving to the next round.");
    endRound(roomCode);
    return { ok: true };
  }

  io.to(roomCode).emit("room_updated", serializeRoom(room));
  if (room.state !== "lobby") {
    io.to(roomCode).emit("game_state", computeGameState(room));
  }

  return { ok: true };
}

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // Room creation
  socket.on(
    "create_room",
    (
      payload: { name: string; settings?: Partial<Room["settings"]> },
      cb?: (data: { roomCode?: string; room?: Room; error?: string }) => void,
    ) => {
      const {
        name,
        settings,
        visibility = "private",
      }: {
        name: string;
        visibility?: RoomVisibility;
        settings?: Partial<Room["settings"]>;
      } = payload;
      const validatedName = getValidatedPlayerName(name);
      if ("error" in validatedName) {
        return cb?.({ error: validatedName.error });
      }
      const roomCode = Math.random().toString(36).slice(2, 7).toUpperCase();
      const room: Room = {
        code: roomCode,
        hostId: socket.id,
        visibility,
        players: {},
        settings: {
          rounds: settings?.rounds ?? 3,
          drawTime: settings?.drawTime ?? 60,
          maxPlayers: settings?.maxPlayers ?? 8,
          wordChoices: settings?.wordChoices ?? 3,
        },
        state: "lobby",
      };
      room.players[socket.id] = {
        id: socket.id,
        name: validatedName.name,
        score: 0,
        ready: false,
      };
      rooms.set(roomCode, room);
      roomStrokes.set(roomCode, []);
      roomChatHistory.set(roomCode, []);
      socket.join(roomCode);
      const publicRoom = serializeRoom(room);
      cb?.({ roomCode, room: publicRoom });
      io.to(roomCode).emit("room_updated", publicRoom);
      socket.emit("chat_history", {
        messages: roomChatHistory.get(roomCode) ?? [],
      });
    },
  );

  // Joining room
  socket.on(
    "join_room",
    (
      payload: { roomCode: string; name: string },
      cb?: (data: { room?: Room; error?: string }) => void,
    ) => {
      const { roomCode, name } = payload;
      const validatedName = getValidatedPlayerName(name);
      if ("error" in validatedName) return cb?.({ error: validatedName.error });
      const room = rooms.get(roomCode);
      if (!room) return cb?.({ error: "Room not found" });
      if (!canJoinRoom(room)) {
        return cb?.({ error: "Game already in progress for this room" });
      }
      if (Object.keys(room.players).length >= room.settings.maxPlayers) {
        return cb?.({ error: "Room full" });
      }
      room.players[socket.id] = {
        id: socket.id,
        name: validatedName.name,
        score: 0,
        ready: false,
      };
      socket.join(roomCode);
      const publicRoom = serializeRoom(room);
      cb?.({ room: publicRoom });
      io.to(roomCode).emit("room_updated", publicRoom);
      socket.emit("canvas_state", {
        strokes: roomStrokes.get(roomCode) ?? [],
      });
      socket.emit("chat_history", {
        messages: roomChatHistory.get(roomCode) ?? [],
      });
    },
  );

  socket.on(
    "leave_room",
    (
      payload: { roomCode: string },
      cb?: (data?: { ok?: boolean; error?: string }) => void,
    ) => {
      const result = removePlayerFromRoom(payload.roomCode, socket.id);
      socket.leave(payload.roomCode);
      cb?.(result);
    },
  );

  socket.on(
    "join_public_room",
    (
      payload: { name: string },
      cb?: (data: { room?: Room; error?: string }) => void,
    ) => {
      const validatedName = getValidatedPlayerName(payload.name);
      if ("error" in validatedName) return cb?.({ error: validatedName.error });
      const roomEntry = [...rooms.values()].find(
        (room) =>
          room.visibility === "public" &&
          room.state === "lobby" &&
          Object.keys(room.players).length < room.settings.maxPlayers,
      );

      if (!roomEntry) {
        return cb?.({ error: "No open public rooms available" });
      }

      roomEntry.players[socket.id] = {
        id: socket.id,
        name: validatedName.name,
        score: 0,
        ready: false,
      };
      socket.join(roomEntry.code);
      const publicRoom = serializeRoom(roomEntry);
      cb?.({ room: publicRoom });
      io.to(roomEntry.code).emit("room_updated", publicRoom);
      socket.emit("canvas_state", {
        strokes: roomStrokes.get(roomEntry.code) ?? [],
      });
      socket.emit("chat_history", {
        messages: roomChatHistory.get(roomEntry.code) ?? [],
      });
    },
  );

  // game start, word selection, turn management, etc would go here
  socket.on(
    "start_game",
    (
      payload: { roomCode: string },
      cb?: (data?: { error?: string }) => void,
    ) => {
      const { roomCode } = payload;
      const room = rooms.get(roomCode);
      if (!room) return cb?.({ error: "Room not found" });
      if (room.hostId !== socket.id)
        return cb?.({ error: "Only host can start" });
      if (room.state !== "lobby")
        return cb?.({ error: "Game already started" });

      const playerIds = Object.keys(room.players);
      if (playerIds.length < 2)
        return cb?.({ error: "Need at least 2 players" });

      room.currentRound = 1;
      room.turnIndex = 0;
      prepareRound(roomCode);
      cb?.();
    },
  );

  socket.on(
    "toggle_ready",
    (
      payload: { roomCode: string; ready: boolean },
      cb?: (data?: { error?: string }) => void,
    ) => {
      const room = rooms.get(payload.roomCode);
      if (!room) return cb?.({ error: "Room not found" });
      if (room.state !== "lobby") {
        return cb?.({ error: "Ready status can only change in the lobby" });
      }

      const player = room.players[socket.id];
      if (!player) return cb?.({ error: "Player not found in room" });

      player.ready = payload.ready;
      io.to(payload.roomCode).emit("room_updated", serializeRoom(room));
      cb?.();
    },
  );

  //  game reset
  socket.on(
    "reset_game",
    (
      payload: { roomCode: string },
      cb?: (data?: { error?: string }) => void,
    ) => {
      const { roomCode } = payload;
      const room = rooms.get(roomCode);
      if (!room) return cb?.({ error: "Room not found" });
      if (room.hostId !== socket.id)
        return cb?.({ error: "Only host can reset" });

      clearRoomTimer(room);
      resetRoomToLobby(room);
      resetCanvas(roomCode);

      io.to(roomCode).emit("room_updated", serializeRoom(room));
      io.to(roomCode).emit("game_state", computeGameState(room));
      cb?.();
    },
  );

  // Drawing events
  socket.on("draw_start", (payload: { roomCode: string; point: Point }) => {
    const { roomCode, point } = payload;
    const room = rooms.get(roomCode);
    if (!canPlayerDraw(room, socket.id)) return;

    activeStrokes.set(roomCode, [point]);
    socket.to(roomCode).emit("draw_start", { point });
  });

  // later: validate drawer, game state, etc
  socket.on("draw_move", (payload: { roomCode: string; point: Point }) => {
    const { roomCode, point } = payload;
    const room = rooms.get(roomCode);
    if (!canPlayerDraw(room, socket.id)) return;

    const stroke = activeStrokes.get(roomCode);
    if (stroke) {
      stroke.push(point);
    }
    socket.to(roomCode).emit("draw_move", { point });
  });

  // draw end
  socket.on("draw_end", (payload: { roomCode: string }) => {
    const { roomCode } = payload;
    const room = rooms.get(roomCode);
    if (!canPlayerDraw(room, socket.id)) return;

    const stroke = activeStrokes.get(roomCode);
    if (stroke && stroke.length > 0) {
      const strokes = roomStrokes.get(roomCode) ?? [];
      strokes.push(stroke);
      roomStrokes.set(roomCode, strokes);
    }
    activeStrokes.delete(roomCode);
    socket.to(roomCode).emit("draw_end");
  });

  socket.on("draw_undo", (payload: { roomCode: string }) => {
    const { roomCode } = payload;
    const room = rooms.get(roomCode);
    if (!canPlayerDraw(room, socket.id)) return;

    activeStrokes.delete(roomCode);
    const strokes = roomStrokes.get(roomCode) ?? [];
    strokes.pop();
    roomStrokes.set(roomCode, strokes);
    emitCanvasState(roomCode);
  });

  socket.on("canvas_clear", (payload: { roomCode: string }) => {
    const { roomCode } = payload;
    const room = rooms.get(roomCode);
    if (!canPlayerDraw(room, socket.id)) return;

    resetCanvas(roomCode);
  });

  // Guessing
  socket.on("guess", (payload: { roomCode: string; guess: string }) => {
    const { roomCode, guess } = payload;
    const room = rooms.get(roomCode);
    if (!room || !room.word) return;

    const player = room.players[socket.id];
    if (!player) return;
    if (socket.id === room.currentDrawerId) return;
    if (player.hasGuessed) return;

    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedWord = room.word.toLowerCase();

    if (normalizedGuess === normalizedWord) {
      const guessers = Object.values(room.players).filter(
        (entry) => entry.id !== room.currentDrawerId,
      );
      const guessOrder = guessers.filter((entry) => entry.hasGuessed).length;
      const state = computeGameState(room);
      const timeLeft = state.timeLeft ?? 0;
      const timeRatio = room.settings.drawTime > 0 ? timeLeft / room.settings.drawTime : 0;
      const guesserPoints = Math.max(
        45,
        Math.round(70 + timeRatio * 55 - guessOrder * 12),
      );
      const drawer = room.currentDrawerId ? room.players[room.currentDrawerId] : undefined;
      const drawerPoints = Math.max(12, Math.round(guesserPoints * 0.35));

      player.score += guesserPoints;
      player.hasGuessed = true;
      if (drawer) {
        drawer.score += drawerPoints;
      }

      io.to(roomCode).emit("correct_guess", {
        playerId: player.id,
        name: player.name,
        score: player.score,
        pointsAwarded: guesserPoints,
        drawerPointsAwarded: drawer ? drawerPoints : 0,
      });
      io.to(roomCode).emit("room_updated", serializeRoom(room));
      socket.emit("guess_result", { correct: true });
      emitSystemMessage(
        roomCode,
        `${player.name} guessed correctly for +${guesserPoints}. Drawer bonus +${drawer ? drawerPoints : 0}.`,
      );

      if (shouldEndRoundEarly(room)) {
        endRound(roomCode);
      }
    } else {
      pushChatMessage(roomCode, {
        name: player.name,
        message: guess.trim(),
      });
      socket.emit("guess_result", { correct: false });
    }
  });

  socket.on(
    "word_chosen",
    (
      payload: { roomCode: string; word: string },
      cb?: (data?: { error?: string }) => void,
    ) => {
      const { roomCode, word } = payload;
      const room = rooms.get(roomCode);
      if (!room) return cb?.({ error: "Room not found" });
      if (room.currentDrawerId !== socket.id) {
        return cb?.({ error: "Only the drawer can choose a word" });
      }
      if (room.state !== "choosing" || !room.wordOptions?.includes(word)) {
        return cb?.({ error: "Invalid word choice" });
      }

      startChosenRound(roomCode, word);
      cb?.();
    },
  );

  // Chat messages
  socket.on(
    "chat_message",
    (payload: { roomCode: string; message: string; name: string }) => {
      const { roomCode, message, name } = payload;
      if (!message.trim()) return;
      pushChatMessage(roomCode, {
        name: name.trim() || "Player",
        message: message.trim(),
      });
    },
  );

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("disconnected:", socket.id);
    handlePlayerDisconnect(socket.id);
  });
});

function clearRoomTimer(room: Room) {
  if (room.timerIntervalId) {
    clearInterval(room.timerIntervalId);
    room.timerIntervalId = undefined;
  }
}

function prepareRound(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const playerIds = getOrderedPlayerIds(room);
  if (playerIds.length === 0) return;
  if ((room.currentRound ?? 1) > room.settings.rounds) {
    room.state = "finished";
    io.to(roomCode).emit("room_updated", serializeRoom(room));
    io.to(roomCode).emit("game_state", computeGameState(room));
    io.to(roomCode).emit("game_over", {
      roomCode: room.code,
      players: Object.values(room.players),
    });
    return;
  }

  Object.values(room.players).forEach((p) => {
    p.hasGuessed = false;
  });

  const turnIndex = room.turnIndex ?? 0;
  const drawerId = playerIds[turnIndex % playerIds.length];

  room.currentDrawerId = drawerId;
  room.word = undefined;
  room.wordOptions = pickWordOptions(room.settings.wordChoices);
  room.revealedIndexes = undefined;
  room.state = "choosing";
  room.roundEndsAt = undefined;

  clearRoomTimer(room);
  resetCanvas(roomCode);

  io.to(roomCode).emit("room_updated", serializeRoom(room));
  io.to(roomCode).emit("game_state", computeGameState(room));
  io.to(roomCode).emit("round_start", {
    currentRound: room.currentRound ?? 1,
    drawerId: room.currentDrawerId!,
  });
  io.to(room.currentDrawerId!).emit("word_options", {
    words: room.wordOptions,
  });
}

function startChosenRound(roomCode: string, chosenWord: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.word = chosenWord;
  room.wordOptions = undefined;
  room.revealedIndexes = [];
  room.state = "playing";
  const now = Date.now();
  const durationMs = room.settings.drawTime * 1000;
  room.roundEndsAt = now + durationMs;
  const hintThresholds = [Math.floor(durationMs / 3), Math.floor((durationMs * 2) / 3)];

  clearRoomTimer(room);

  room.timerIntervalId = setInterval(() => {
    const r = rooms.get(roomCode);
    if (!r) return;
    const elapsedMs = durationMs - Math.max(0, (r.roundEndsAt ?? 0) - Date.now());
    const revealedCount = r.revealedIndexes?.length ?? 0;

    if (
      revealedCount < hintThresholds.length &&
      elapsedMs >= hintThresholds[revealedCount]
    ) {
      revealNextHint(r);
    }

    const state = computeGameState(r);
    io.to(roomCode).emit("game_state", state);

    if (state.timeLeft === 0) {
      endRound(roomCode);
    }
  }, 1000);

  const state = computeGameState(room);
  io.to(roomCode).emit("room_updated", serializeRoom(room));
  io.to(roomCode).emit("game_state", state);

  if (room.word) {
    io.to(roomCode).emit("round_start", {
      currentRound: room.currentRound,
      drawerId: room.currentDrawerId,
      wordLength: room.word.length,
    });

    // tell drawer the actual word (client will handle showing it only to drawer)
    io.to(room.currentDrawerId!).emit("drawer_word", { word: room.word });
  }
}

function endRound(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  clearRoomTimer(room);
  room.revealedIndexes = undefined;

  io.to(roomCode).emit("round_end", {
    word: room.word,
    currentRound: room.currentRound,
  });

  const totalRounds = room.settings.rounds;
  const currentRound = room.currentRound ?? 1;

  if (currentRound >= totalRounds) {
    const playerIds = getOrderedPlayerIds(room);
    const activeTurnIndex = room.turnIndex ?? 0;

    if (playerIds.length > 0 && activeTurnIndex % playerIds.length !== playerIds.length - 1) {
      advanceTurn(room, playerIds);
      prepareRound(roomCode);
      return;
    }
  }

  advanceTurn(room);
  prepareRound(roomCode);
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log("Server listening on", PORT);
});
