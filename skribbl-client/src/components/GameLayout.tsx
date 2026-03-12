import { Canvas } from "./Canvas";
import { Chat } from "./Chat";
import type { GameState, Player, Room } from "../types";

interface GameLayoutProps {
  room: Room;
  players: Player[];
  gameState: GameState | null;
  name: string;
  canDraw: boolean;
  canGuess: boolean;
  wordOptions: string[];
  isHost: boolean;
  canStart: boolean;
  socketId: string | null;
  onStartGame: () => void;
  onChooseWord: (word: string) => void;
  onToggleReady: (ready: boolean) => void;
}

export const GameLayout: React.FC<GameLayoutProps> = ({
  room,
  players,
  gameState,
  name,
  canDraw,
  canGuess,
  wordOptions,
  isHost,
  canStart,
  socketId,
  onStartGame,
  onChooseWord,
  onToggleReady,
}) => {
  const activeState = gameState?.state ?? room.state;
  const activeDrawerId = gameState?.currentDrawerId ?? room.currentDrawerId;
  const isChoosingWord = canDraw && activeState === "choosing" && wordOptions.length > 0;
  const sortedPlayers = players.slice().sort((a, b) => b.score - a.score);
  const currentPlayer = socketId ? room.players[socketId] : undefined;
  const readyPlayers = players.filter((player) => player.ready).length;
  const isLobby = activeState === "lobby";
  const everyoneReady = players.length > 0 && players.every((player) => player.ready);

  return (
    <section className="game-grid">
      <div className="canvas-panel">
        <div className="canvas-stage-bar">
          <div className="stage-chip">
            {isLobby ? "Lobby ready-up" : isChoosingWord ? "Choosing word" : canDraw ? "Drawing turn" : "Guess phase"}
          </div>
          <div className="stage-chip stage-chip-muted">
            {isLobby ? `${readyPlayers}/${players.length} ready` : gameState?.hintPattern ? "Hints active" : "No hint revealed yet"}
          </div>
        </div>
        <div className="panel-heading">
          <div>
            <h2>Sketch board</h2>
            <p>
              {isLobby
                ? "Wait for everyone to ready up before starting the room."
                : isChoosingWord
                ? "Pick a word to begin the round."
                : canDraw
                  ? "Your turn to draw."
                  : "Watch closely and guess fast."}
            </p>
          </div>
          {isHost && (
            <button className="primary-button" onClick={onStartGame} disabled={!canStart}>
              {gameState?.state === "playing" ? "Game Running" : "Start Game"}
            </button>
          )}
        </div>
        {isChoosingWord ? (
          <div className="word-choice-panel">
            <span className="status-label">Choose your word</span>
            <div className="word-choice-grid">
              {wordOptions.map((word) => (
                <button
                  key={word}
                  type="button"
                  className="secondary-button word-choice-button"
                  onClick={() => onChooseWord(word)}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <Canvas roomCode={room.code} canDraw={canDraw} />
      </div>

      <aside className="sidebar">
        <section className="sidebar-card">
          <div className="panel-heading">
            <div>
              <h2>Players</h2>
              <p>
                {players.length} in room
                {isLobby ? ` • ${readyPlayers}/${players.length} ready` : ""}
              </p>
            </div>
            <div className="game-action-row">
              {isLobby && currentPlayer ? (
                <button
                  type="button"
                  className={`secondary-button ready-button ${currentPlayer.ready ? "ready-button-active" : ""}`}
                  onClick={() => onToggleReady(!currentPlayer.ready)}
                >
                  {currentPlayer.ready ? "Ready" : "Mark Ready"}
                </button>
              ) : null}
              <div className="leader-tag">
                {isLobby ? (everyoneReady ? "All players ready" : "Waiting on ready-up") : "Live leaderboard"}
              </div>
            </div>
          </div>
          <div className="player-list">
            {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`player-row ${
                    player.id === gameState?.currentDrawerId ? "player-row-active" : ""
                  }`}
                >
                  <div className="rank-chip">#{index + 1}</div>
                  <div className="player-meta">
                    <span className="player-avatar">
                      {player.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <div className="player-name">
                        {player.name}
                        {player.id === room.hostId ? <span className="mini-badge">Host</span> : null}
                        {isLobby && player.ready ? <span className="mini-badge mini-badge-ready">Ready</span> : null}
                      </div>
                      <div className="player-role">
                        {isLobby
                          ? player.ready
                            ? "Waiting for host"
                            : "Not ready"
                          : player.id === activeDrawerId
                            ? "Drawing now"
                            : "Guessing"}
                      </div>
                    </div>
                  </div>
                  <div className="score-chip">{player.score}</div>
                </div>
              ))}
          </div>
        </section>

        <section className="sidebar-card chat-card">
          <Chat key={room.code} roomCode={room.code} name={name} canGuess={canGuess} />
        </section>
      </aside>
    </section>
  );
};
