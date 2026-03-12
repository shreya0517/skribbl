import { useEffect, useRef, useState } from "react";
import { socket } from "../socket";
import type { GameState, Player, Room, RoomSettings, RoomVisibility } from "../types";

type NoticeTone = "info" | "error" | "success";

export interface UiNotice {
  title: string;
  message: string;
  tone: NoticeTone;
}

export const useGameRoom = () => {
  const [settings, setSettings] = useState<RoomSettings>({
    rounds: 3,
    drawTime: 60,
    maxPlayers: 8,
    wordChoices: 3,
  });
  const [visibility, setVisibility] = useState<RoomVisibility>("private");
  const [name, setName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState(() => {
    if (typeof window === "undefined") return "";

    return new URLSearchParams(window.location.search).get("room")?.toUpperCase() ?? "";
  });
  const [room, setRoom] = useState<Room | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [drawerWord, setDrawerWord] = useState<string | null>(null);
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [lastRevealedWord, setLastRevealedWord] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [notice, setNotice] = useState<UiNotice | null>(null);
  const leavingRoomCodeRef = useRef<string | null>(null);

  const showNotice = (title: string, message: string, tone: NoticeTone) => {
    setNotice({ title, message, tone });
  };

  const getValidatedName = () => {
    const normalizedName = name.trim().replace(/\s+/g, " ");

    if (!normalizedName) {
      showNotice("Name required", "Enter a player name before continuing.", "error");
      return null;
    }

    if (normalizedName.length > 20) {
      showNotice("Name too long", "Player name must be 20 characters or fewer.", "error");
      return null;
    }

    if (normalizedName !== name) {
      setName(normalizedName);
    }

    return normalizedName;
  };

  useEffect(() => {
    const handleConnect = () => setSocketId(socket.id ?? null);
    const handleRoomUpdated = (updatedRoom: Room) => {
      if (leavingRoomCodeRef.current === updatedRoom.code) return;
      setRoom(updatedRoom);
      setIsHost(updatedRoom.hostId === socket.id);
    };
    const handleGameState = (state: GameState) => setGameState(state);
    const handleDrawerWord = ({ word }: { word: string }) => setDrawerWord(word);
    const handleWordOptions = ({ words }: { words: string[] }) => {
      setWordOptions(words);
      setDrawerWord(null);
    };
    const handleRoundEnd = ({ word }: { word: string }) => {
      setLastRevealedWord(word);
      setDrawerWord(null);
      setWordOptions([]);
    };
    const handleGameOver = ({ players }: { players: Player[] }) => {
      const winner = [...players].sort((a, b) => b.score - a.score)[0];
      if (winner) {
        showNotice("Game Over", `Winner: ${winner.name} with ${winner.score} points.`, "success");
      }
    };

    handleConnect();
    socket.on("connect", handleConnect);
    socket.on("room_updated", handleRoomUpdated);
    socket.on("game_state", handleGameState);
    socket.on("drawer_word", handleDrawerWord);
    socket.on("word_options", handleWordOptions);
    socket.on("round_end", handleRoundEnd);
    socket.on("game_over", handleGameOver);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("room_updated", handleRoomUpdated);
      socket.off("game_state", handleGameState);
      socket.off("drawer_word", handleDrawerWord);
      socket.off("word_options", handleWordOptions);
      socket.off("round_end", handleRoundEnd);
      socket.off("game_over", handleGameOver);
    };
  }, []);

  const createRoom = () => {
    const validatedName = getValidatedName();
    if (!validatedName) return;

    socket.emit(
      "create_room",
      { name: validatedName, visibility, settings },
      (res: { roomCode?: string; room?: Room; error?: string }) => {
        if (res.error) {
          showNotice("Create room failed", res.error, "error");
          return;
        }

        if (!res.room) return;
        setRoom(res.room);
        setIsHost(true);
      },
    );
  };

  const joinRoom = () => {
    const validatedName = getValidatedName();
    if (!validatedName) return;

    socket.emit(
      "join_room",
      { roomCode: roomCodeInput, name: validatedName },
      (res: { room?: Room; error?: string }) => {
        if (res.error) {
          showNotice("Join failed", res.error, "error");
          return;
        }

        if (res.room) {
          setRoom(res.room);
          setIsHost(res.room.hostId === socket.id);
        }
      },
    );
  };

  const startGame = () => {
    if (!room) return;

    socket.emit(
      "start_game",
      { roomCode: room.code },
      (res?: { error?: string }) => {
        if (res?.error) showNotice("Could not start game", res.error, "error");
      },
    );
  };

  const joinPublicRoom = () => {
    const validatedName = getValidatedName();
    if (!validatedName) return;

    socket.emit(
      "join_public_room",
      { name: validatedName },
      (res: { room?: Room; error?: string }) => {
        if (res.error) {
          showNotice(
            "No public room available",
            "There is no open public lobby right now. Create a public room first or try again after another player opens one.",
            "info",
          );
          return;
        }

        if (res.room) {
          setRoom(res.room);
          setIsHost(res.room.hostId === socket.id);
        }
      },
    );
  };

  const chooseWord = (word: string) => {
    if (!room) return;

    socket.emit(
      "word_chosen",
      { roomCode: room.code, word },
      (res?: { error?: string }) => {
        if (res?.error) {
          showNotice("Word selection failed", res.error, "error");
          return;
        }

        setWordOptions([]);
      },
    );
  };

  const toggleReady = (ready: boolean) => {
    if (!room) return;

    socket.emit(
      "toggle_ready",
      { roomCode: room.code, ready },
      (res?: { error?: string }) => {
        if (res?.error) {
          showNotice("Ready state failed", res.error, "error");
        }
      },
    );
  };

  const resetLocalRoomState = () => {
    setRoom(null);
    setIsHost(false);
    setDrawerWord(null);
    setWordOptions([]);
    setLastRevealedWord(null);
    setGameState(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    window.history.replaceState({}, "", url);
  };

  const leaveRoom = () => {
    if (!room) return;

    leavingRoomCodeRef.current = room.code;
    resetLocalRoomState();

    socket.emit(
      "leave_room",
      { roomCode: room.code },
      (res?: { ok?: boolean; error?: string }) => {
        if (res?.error) {
          showNotice("Leave room issue", res.error, "error");
        }
        leavingRoomCodeRef.current = null;
      },
    );
  };

  return {
    settings,
    setSettings,
    visibility,
    setVisibility,
    name,
    setName,
    roomCodeInput,
    setRoomCodeInput,
    room,
    isHost,
    drawerWord,
    wordOptions,
    lastRevealedWord,
    gameState,
    notice,
    setNotice,
    socketId,
    createRoom,
    joinRoom,
    joinPublicRoom,
    startGame,
    chooseWord,
    toggleReady,
    leaveRoom,
  };
};
