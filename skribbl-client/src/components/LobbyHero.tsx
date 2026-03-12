export const LobbyHero: React.FC = () => {
  return (
    <div className="hero-copy">
      <span className="eyebrow">Multiplayer drawing party</span>
      <div className="hero-title-lockup">
        <div className="hero-logo-badge">S</div>
        <h1>Skribbl Room</h1>
      </div>
      <p>
        Fast rounds, messy sketches, loud guesses. Start a room, share the
        code, and let the leaderboard do the judging.
      </p>

      <div className="hero-badges">
        <span className="hero-badge">Live drawing sync</span>
        <span className="hero-badge">Word picks per round</span>
        <span className="hero-badge">Public or private rooms</span>
      </div>

      <div className="hero-showcase">
        <div className="showcase-card showcase-card-mascot">
          <span className="showcase-label">Lobby mascot</span>
          <div className="mascot-scene" aria-hidden="true">
            <div className="mascot-board">
              <span className="mascot-board-line mascot-board-line-one" />
              <span className="mascot-board-line mascot-board-line-two" />
              <span className="mascot-board-line mascot-board-line-three" />
            </div>
            <div className="mascot-character">
              <span className="mascot-head" />
              <span className="mascot-body" />
              <span className="mascot-arm mascot-arm-left" />
              <span className="mascot-arm mascot-arm-right" />
              <span className="mascot-leg mascot-leg-left" />
              <span className="mascot-leg mascot-leg-right" />
            </div>
          </div>
          <strong>Sketch chaos starts here.</strong>
        </div>
        <div className="showcase-card showcase-card-main">
          <span className="showcase-label">Round energy</span>
          <div className="showcase-scribble">
            <span />
            <span />
            <span />
          </div>
          <strong>Draw fast. Guess faster.</strong>
        </div>
        <div className="showcase-card">
          <span className="showcase-kicker">Live rooms</span>
          <strong>Instant join codes</strong>
        </div>
        <div className="showcase-card">
          <span className="showcase-kicker">Score chase</span>
          <strong>Rounds, timers, leader board</strong>
        </div>
      </div>

      <div className="hero-doodle-row" aria-hidden="true">
        <span className="doodle doodle-pencil" />
        <span className="doodle doodle-wave" />
        <span className="doodle doodle-dot" />
      </div>
    </div>
  );
};
