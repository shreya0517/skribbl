// Common types for server and client

// Room state: lobby, playing, finished
export type RoomState = "lobby" | "choosing" | "playing" | "finished";
export type RoomVisibility = "public" | "private";


// Player in a room
export interface Player {
  id: string;
  name: string;
  score: number;
  hasGuessed?: boolean;
  ready?: boolean;
}

// Room settings and state
export interface RoomSettings {
  rounds: number;
  drawTime: number;
  maxPlayers: number;
  wordChoices: number;
}


// Room data structure
export interface Room {
  code: string;
  hostId: string;
  visibility: RoomVisibility;
  players: Record<string, Player>;
  settings: RoomSettings;
  state: RoomState;
  currentRound?: number;
  turnIndex?: number;
  currentDrawerId?: string;
  word?: string;
  wordOptions?: string[];
  revealedIndexes?: number[];
  roundEndsAt?: number;        // timestamp (ms)
  timerIntervalId?: NodeJS.Timeout;
}

// Game state sent to clients
export interface GameState {
  state: RoomState;
  currentRound?: number;
  currentDrawerId?: string;
  wordLength?: number;
  hintPattern?: string;
  timeLeft?: number;
}
