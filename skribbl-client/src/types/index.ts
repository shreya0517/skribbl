// Room, Player, shared types (mirrors server types)

export type RoomState = "lobby" | "choosing" | "playing" | "finished";
export type RoomVisibility = "public" | "private";

export interface Player {
  id: string;
  name: string;
  score: number;
  hasGuessed?: boolean;
  ready?: boolean;
}

export interface RoomSettings {
  rounds: number;
  drawTime: number;
  maxPlayers: number;
  wordChoices: number;
}

export interface GameState {
  state: RoomState;
  currentRound?: number;
  currentDrawerId?: string;
  wordLength?: number;
  hintPattern?: string;
  timeLeft?: number;
}

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
}
