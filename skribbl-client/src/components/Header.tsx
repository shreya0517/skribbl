import type { GameState, Room } from "../types";

interface HeaderProps {
  room: Room;
  isHost: boolean;
  gameState: GameState | null;
  isDrawer: boolean;
  drawerWord: string | null;
  lastRevealedWord: string | null;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  inviteLink: string;
  onLeaveRoom: () => void;
  onInviteCopied: () => void;
}

const formatWordHint = (length?: number) => {
  if (!length) return "Waiting for word";
  return Array.from({ length }, () => "_").join(" ");
};

export const Header: React.FC<HeaderProps> = ({
  room,
  isHost,
  gameState,
  isDrawer,
  drawerWord,
  lastRevealedWord,
  theme,
  onToggleTheme,
  inviteLink,
  onLeaveRoom,
  onInviteCopied,
}) => {
  const activeDrawerId = gameState?.currentDrawerId ?? room.currentDrawerId;
  const currentDrawerName = activeDrawerId
    ? room.players[activeDrawerId]?.name
    : "Waiting";
  const statusTone =
    gameState?.timeLeft !== undefined && gameState.timeLeft <= 5
      ? "danger"
      : gameState?.timeLeft !== undefined && gameState.timeLeft <= 15
        ? "warning"
        : "normal";
  const visibleHint =
    isDrawer && drawerWord
      ? drawerWord
      : gameState?.hintPattern ?? formatWordHint(gameState?.wordLength);

  const handleInviteCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    if (room.visibility === "private") {
      onInviteCopied();
    }
  };

  return (
    <>
      <header className="game-topbar">
        <div className="topbar-group">
          <div className="room-pill">Room {room.code}</div>
          <div className="meta-pill">{isHost ? "Host" : "Player"}</div>
          <div className="meta-pill meta-pill-visibility">{room.visibility}</div>
        </div>
        <div className="topbar-group">
          <button className="leave-button" type="button" onClick={onLeaveRoom}>
            Leave Room
          </button>
          <button className="theme-toggle" type="button" onClick={onToggleTheme}>
            {theme === "light" ? "Dark UI" : "Light UI"}
          </button>
          <div className="meta-pill">
            Round {gameState?.currentRound ?? room.currentRound ?? 0}
          </div>
          <div className={`timer-pill timer-pill-${statusTone}`}>
            {gameState?.timeLeft ?? "-"}s
          </div>
        </div>
      </header>

      <section className="game-status-card game-status-card-extended">
        <div className="status-block">
          <span className="status-label">Current drawer</span>
          <div className="status-value">{currentDrawerName}</div>
        </div>
        <div className="status-block status-block-highlight">
          <span className="status-label">Word hint</span>
          <div className="word-hint">{visibleHint}</div>
        </div>
        <div className="status-block">
          <span className="status-label">State</span>
          <div className="status-value state-capitalize">
            {gameState?.state ?? room.state}
          </div>
        </div>
        <div className="status-block">
          <span className="status-label">Room access</span>
          <div className="invite-row">
            <span className="meta-pill invite-pill">{room.visibility}</span>
            <button
              type="button"
              className="secondary-button invite-button"
              onClick={handleInviteCopy}
            >
              Copy Invite Link
            </button>
          </div>
        </div>
      </section>

      {lastRevealedWord && gameState?.state !== "playing" && (
        <div className="round-reveal">
          Last word: <strong>{lastRevealedWord}</strong>
        </div>
      )}
    </>
  );
};
