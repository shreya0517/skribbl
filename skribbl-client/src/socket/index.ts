import { io, Socket } from "socket.io-client";
import type { Room, GameState, RoomVisibility } from "../types";
import type { Player } from "../types";

export type Point = { x: number; y: number; color: string; size: number };
export type Stroke = Point[];

export interface ServerToClientEvents {
  room_updated: (room: Room) => void;
  draw_start: (data: { point: Point }) => void;
  draw_move: (data: { point: Point }) => void;
  draw_end: () => void;
  canvas_state: (data: { strokes: Stroke[] }) => void;
  canvas_cleared: () => void;
  game_state: (data: GameState) => void;

  correct_guess: (data: {
    playerId: string;
    name: string;
    score: number;
    pointsAwarded: number;
    drawerPointsAwarded: number;
  }) => void;
  guess_result: (data: { correct: boolean }) => void;
  chat_message: (data: { name: string; message: string }) => void;
  chat_history: (data: { messages: { name: string; message: string }[] }) => void;

  round_start: (data: {
    currentRound: number;
    drawerId: string;
    wordLength?: number;
  }) => void;
  word_options: (data: { words: string[] }) => void;
  round_end: (data: { word: string; currentRound: number }) => void;
  game_over: (data: { roomCode: string; players: Player[] }) => void;
  drawer_word: (data: { word: string }) => void;
}


export interface ClientToServerEvents {
  create_room: (
    data: { name: string; visibility?: RoomVisibility; settings?: Partial<Room["settings"]> },
    cb?: (res: { roomCode?: string; room?: Room; error?: string }) => void
  ) => void;
  join_room: (
    data: { roomCode: string; name: string },
    cb?: (res: { room?: Room; error?: string }) => void
  ) => void;
  leave_room: (
    data: { roomCode: string },
    cb?: (res?: { ok?: boolean; error?: string }) => void
  ) => void;
  join_public_room: (
    data: { name: string },
    cb?: (res: { room?: Room; error?: string }) => void
  ) => void;
  draw_start: (data: { roomCode: string; point: Point }) => void;
  draw_move: (data: { roomCode: string; point: Point }) => void;
  draw_end: (data: { roomCode: string }) => void;
  draw_undo: (data: { roomCode: string }) => void;
  canvas_clear: (data: { roomCode: string }) => void;
  start_game: (
    data: { roomCode: string },
    cb?: (res?: { error?: string }) => void
  ) => void;
  word_chosen: (
    data: { roomCode: string; word: string },
    cb?: (res?: { error?: string }) => void
  ) => void;
  toggle_ready: (
    data: { roomCode: string; ready: boolean },
    cb?: (res?: { error?: string }) => void
  ) => void;

  guess: (data: { roomCode: string; guess: string }) => void;
  chat_message: (data: { roomCode: string; message: string; name: string }) => void;
}

const URL = import.meta.env.VITE_WS_URL || "http://localhost:4000";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  URL,
  { autoConnect: true }
);
