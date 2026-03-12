import type { GameState, Room, RoomState } from "../types.js";

export function getHintPattern(room: Room): string | undefined {
  if (!room.word) return undefined;

  return room.word
    .split("")
    .map((char, index) => {
      if (char === " ") return " ";
      return room.revealedIndexes?.includes(index) ? char.toUpperCase() : "_";
    })
    .join(" ");
}

export function revealNextHint(room: Room) {
  if (!room.word) return;

  const hiddenIndexes = room.word
    .split("")
    .map((char, index) => ({ char, index }))
    .filter(
      ({ char, index }) =>
        char !== " " && !(room.revealedIndexes ?? []).includes(index),
    )
    .map(({ index }) => index);

  if (hiddenIndexes.length === 0) return;

  const randomIndex =
    hiddenIndexes[Math.floor(Math.random() * hiddenIndexes.length)];
  room.revealedIndexes = [...(room.revealedIndexes ?? []), randomIndex].sort(
    (left, right) => left - right,
  );
}

export function computeGameState(room: Room): GameState & { state: RoomState } {
  const now = Date.now();
  const timeLeft =
    room.roundEndsAt && room.state === "playing"
      ? Math.max(0, Math.floor((room.roundEndsAt - now) / 1000))
      : undefined;

  return {
    state: room.state,
    currentRound: room.currentRound,
    currentDrawerId: room.currentDrawerId,
    wordLength: room.word ? room.word.length : undefined,
    hintPattern: room.state === "playing" ? getHintPattern(room) : undefined,
    timeLeft,
  };
}
