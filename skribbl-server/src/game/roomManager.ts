import type { Player, Room } from "../types.js";

export function serializeRoom(room: Room): Room {
  return {
    ...room,
    word: undefined,
    wordOptions: undefined,
    roundEndsAt: undefined,
    timerIntervalId: undefined,
  };
}

export function resetRoomToLobby(room: Room) {
  room.state = "lobby";
  room.currentRound = undefined;
  room.turnIndex = undefined;
  room.currentDrawerId = undefined;
  room.word = undefined;
  room.wordOptions = undefined;
  room.revealedIndexes = undefined;
  room.roundEndsAt = undefined;

  Object.values(room.players).forEach((player) => {
    player.score = 0;
    player.hasGuessed = false;
    player.ready = false;
  });
}

export function getOrderedPlayerIds(room: Room) {
  return Object.keys(room.players);
}

export function advanceTurn(room: Room, playerIds = getOrderedPlayerIds(room)) {
  if (playerIds.length === 0) return;

  const nextTurnIndex = (room.turnIndex ?? 0) + 1;
  room.turnIndex = nextTurnIndex;
  room.currentRound = Math.floor(nextTurnIndex / playerIds.length) + 1;
}

export function canJoinRoom(room: Room) {
  return room.state === "lobby";
}

export function shouldEndRoundEarly(room: Room) {
  const guessers: Player[] = Object.values(room.players).filter(
    (player) => player.id !== room.currentDrawerId,
  );

  return guessers.length > 0 && guessers.every((player) => player.hasGuessed);
}
