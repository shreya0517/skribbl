import type { RoomSettings, RoomVisibility } from "../types";

interface CreateRoomModalProps {
  settings: RoomSettings;
  visibility: RoomVisibility;
  onSettingChange: (key: keyof RoomSettings, value: number) => void;
  onVisibilityChange: (value: RoomVisibility) => void;
  onClose: () => void;
  onCreateRoom: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  settings,
  visibility,
  onSettingChange,
  onVisibilityChange,
  onClose,
  onCreateRoom,
}) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="confirm-modal create-room-modal" onClick={(event) => event.stopPropagation()}>
        <span className="eyebrow">Create room</span>
        <h2>Set up your next match</h2>
        <p>Choose room access first, then adjust the game settings before you start.</p>

        <div className="segment-row create-room-visibility-row">
          <button
            type="button"
            className={`segment-button ${visibility === "private" ? "segment-button-active" : ""}`}
            onClick={() => onVisibilityChange("private")}
          >
            Private
          </button>
          <button
            type="button"
            className={`segment-button ${visibility === "public" ? "segment-button-active" : ""}`}
            onClick={() => onVisibilityChange("public")}
          >
            Public
          </button>
        </div>

        <div className="settings-grid">
          <label className="field">
            <span>Rounds</span>
            <input
              className="text-input"
              type="number"
              min={2}
              max={10}
              value={settings.rounds}
              onChange={(event) => onSettingChange("rounds", Number(event.target.value))}
            />
          </label>

          <label className="field">
            <span>Draw time</span>
            <input
              className="text-input"
              type="number"
              min={15}
              max={240}
              step={15}
              value={settings.drawTime}
              onChange={(event) => onSettingChange("drawTime", Number(event.target.value))}
            />
          </label>

          <label className="field">
            <span>Max players</span>
            <input
              className="text-input"
              type="number"
              min={2}
              max={20}
              value={settings.maxPlayers}
              onChange={(event) => onSettingChange("maxPlayers", Number(event.target.value))}
            />
          </label>

          <label className="field">
            <span>Word choices</span>
            <input
              className="text-input"
              type="number"
              min={1}
              max={5}
              value={settings.wordChoices}
              onChange={(event) => onSettingChange("wordChoices", Number(event.target.value))}
            />
          </label>
        </div>

        <div className="feature-strip lobby-feature-strip">
          <span>{settings.rounds} rounds</span>
          <span>{settings.drawTime}s timer</span>
          <span>{settings.maxPlayers} players</span>
          <span>{settings.wordChoices} choices</span>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-button lobby-create-button" onClick={onCreateRoom}>
            Create {visibility === "public" ? "Public" : "Private"} Room
          </button>
        </div>
      </div>
    </div>
  );
};
