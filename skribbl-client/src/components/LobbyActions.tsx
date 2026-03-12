interface LobbyActionsProps {
  name: string;
  roomCodeInput: string;
  onNameChange: (value: string) => void;
  onRoomCodeChange: (value: string) => void;
  onJoinRoom: () => void;
  onJoinPublicRoom: () => void;
  onOpenCreateRoom: () => void;
}

export const LobbyActions: React.FC<LobbyActionsProps> = ({
  name,
  roomCodeInput,
  onNameChange,
  onRoomCodeChange,
  onJoinRoom,
  onJoinPublicRoom,
  onOpenCreateRoom,
}) => {
  return (
    <div className="lobby-panel">
      <div className="panel-intro">
        <div>
          <h2>Play now</h2>
          <p>Pick a nickname, then join a room or create your own match.</p>
        </div>
      </div>

      <label className="field">
        <span>Display name</span>
        <input
          className="text-input"
          placeholder="Enter your nickname"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </label>

      <div className="lobby-primary-stack">
        <button
          className="primary-button lobby-play-button"
          onClick={onJoinPublicRoom}
        >
          Quick Play
        </button>
        <div className="join-row lobby-join-row">
          <input
            className="text-input text-input-code"
            placeholder="ROOM"
            value={roomCodeInput}
            maxLength={6}
            onChange={(event) => onRoomCodeChange(event.target.value.toUpperCase())}
          />
          <button
            className="secondary-button lobby-join-button"
            onClick={onJoinRoom}
            disabled={!name || !roomCodeInput}
          >
            Join Private Room
          </button>
        </div>
      </div>

      <div className="divider">
        <span>or host a new game</span>
      </div>

      <section className="create-room-prompt">
        <div>
          <h3>Create room</h3>
          <p>Pick public or private, then set rounds, timer, and room size in a popup.</p>
        </div>
        <button
          className="primary-button lobby-create-button"
          onClick={onOpenCreateRoom}
          disabled={!name}
        >
          Create Room
        </button>
      </section>
    </div>
  );
};
