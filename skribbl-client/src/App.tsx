import { useEffect, useState } from "react";
import { Lobby } from "./components/Lobby";
import { Header } from "./components/Header";
import { GameLayout } from "./components/GameLayout";
import { useGameRoom } from "./hooks/useGameRoom";

function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";

    const savedTheme = window.localStorage.getItem("skribbl-theme");
    return savedTheme === "dark" ? "dark" : "light";
  });
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const {
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
  } = useGameRoom();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("skribbl-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!room) return;
    const url = new URL(window.location.href);
    url.searchParams.set("room", room.code);
    window.history.replaceState({}, "", url);
  }, [room]);

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timeoutId);
  }, [notice, setNotice]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  };

  const confirmLeaveRoom = () => {
    setShowLeaveConfirm(false);
    leaveRoom();
  };

  const backgroundDoodles = (
    <div className="page-doodle-layer" aria-hidden="true">
      <span className="page-doodle page-doodle-squiggle page-doodle-top-left" />
      <span className="page-doodle page-doodle-loop page-doodle-top-right" />
      <span className="page-doodle page-doodle-star page-doodle-mid-right" />
      <span className="page-doodle page-doodle-swoosh page-doodle-bottom-left" />
      <span className="page-doodle page-doodle-dots page-doodle-bottom-right" />
    </div>
  );

  if (!room) {
    return (
      <>
        {backgroundDoodles}
        <Lobby
          settings={settings}
          visibility={visibility}
          name={name}
          roomCodeInput={roomCodeInput}
          onSettingChange={(key, value) => {
            const limits = {
              rounds: { min: 2, max: 10 },
              drawTime: { min: 15, max: 240 },
              maxPlayers: { min: 2, max: 20 },
              wordChoices: { min: 1, max: 5 },
            } as const;

            const range = limits[key];
            const nextValue = Number.isFinite(value)
              ? Math.min(range.max, Math.max(range.min, value))
              : settings[key];

            setSettings((currentSettings) => ({
              ...currentSettings,
              [key]: nextValue,
            }));
          }}
          onVisibilityChange={setVisibility}
          onNameChange={setName}
          onRoomCodeChange={setRoomCodeInput}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          onJoinPublicRoom={joinPublicRoom}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {notice ? (
          <div className="notice-wrap">
            <div className={`notice-card notice-card-${notice.tone}`}>
              <div>
                <strong>{notice.title}</strong>
                <p>{notice.message}</p>
              </div>
              <button
                type="button"
                className="notice-close"
                onClick={() => setNotice(null)}
                aria-label="Dismiss notification"
              >
                x
              </button>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  const players = Object.values(room.players);
  const activeState = gameState?.state ?? room.state;
  const activeDrawerId = gameState?.currentDrawerId ?? room.currentDrawerId;
  const isDrawer = activeDrawerId === socketId;
  const canDraw = !!isDrawer;
  const canGuess = !isDrawer && activeState === "playing";
  const everyoneReady = players.length > 0 && players.every((player) => player.ready);
  const canStart =
    isHost &&
    room &&
    Object.keys(room.players).length >= 2 &&
    everyoneReady &&
    activeState !== "playing" &&
    activeState !== "choosing";

  return (
    <main className="app-shell">
      {backgroundDoodles}
      <section className="game-shell">
        <Header
          room={room}
          isHost={isHost}
          gameState={gameState}
          isDrawer={isDrawer}
          drawerWord={drawerWord}
          lastRevealedWord={lastRevealedWord}
          theme={theme}
          onToggleTheme={toggleTheme}
          inviteLink={`${window.location.origin}${window.location.pathname}?room=${room.code}`}
          onLeaveRoom={() => setShowLeaveConfirm(true)}
          onInviteCopied={() =>
            setNotice({
              title: "Invite copied",
              message: "Private room link copied to clipboard.",
              tone: "success",
            })
          }
        />
        <GameLayout
          room={room}
          players={players}
          gameState={gameState}
          name={name}
          canDraw={canDraw}
          canGuess={!!canGuess}
          wordOptions={wordOptions}
          isHost={isHost}
          canStart={!!canStart}
          socketId={socketId}
          onStartGame={startGame}
          onChooseWord={chooseWord}
          onToggleReady={toggleReady}
        />
      </section>

      {showLeaveConfirm ? (
        <div className="modal-backdrop" onClick={() => setShowLeaveConfirm(false)}>
          <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
            <span className="eyebrow">Leave current room</span>
            <h2>Exit this game room?</h2>
            <p>
              You will return to the lobby and will need the invite link or room code
              to join again.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowLeaveConfirm(false)}
              >
                Stay Here
              </button>
              <button
                type="button"
                className="leave-button modal-leave-button"
                onClick={confirmLeaveRoom}
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="notice-wrap">
          <div className={`notice-card notice-card-${notice.tone}`}>
            <div>
              <strong>{notice.title}</strong>
              <p>{notice.message}</p>
            </div>
            <button
              type="button"
              className="notice-close"
              onClick={() => setNotice(null)}
              aria-label="Dismiss notification"
            >
              x
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default App;
