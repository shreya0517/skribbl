import { useState } from "react";
import type { RoomSettings, RoomVisibility } from "../types";
import { CreateRoomModal } from "./CreateRoomModal";
import { LobbyActions } from "./LobbyActions";
import { LobbyHero } from "./LobbyHero";

interface LobbyProps {
  settings: RoomSettings;
  visibility: RoomVisibility;
  name: string;
  roomCodeInput: string;
  onSettingChange: (key: keyof RoomSettings, value: number) => void;
  onVisibilityChange: (value: RoomVisibility) => void;
  onNameChange: (value: string) => void;
  onRoomCodeChange: (value: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onJoinPublicRoom: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  settings,
  visibility,
  name,
  roomCodeInput,
  onSettingChange,
  onVisibilityChange,
  onNameChange,
  onRoomCodeChange,
  onCreateRoom,
  onJoinRoom,
  onJoinPublicRoom,
  theme,
  onToggleTheme,
}) => {
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);

  const openCreateRoomModal = () => {
    setShowCreateRoomModal(true);
  };

  const closeCreateRoomModal = () => {
    setShowCreateRoomModal(false);
  };

  const handleCreateRoom = () => {
    onCreateRoom();
    setShowCreateRoomModal(false);
  };

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div className="theme-toggle-wrap">
          <button className="theme-toggle" type="button" onClick={onToggleTheme}>
            {theme === "light" ? "Dark UI" : "Light UI"}
          </button>
        </div>

        <LobbyHero />
        <LobbyActions
          name={name}
          roomCodeInput={roomCodeInput}
          onNameChange={onNameChange}
          onRoomCodeChange={onRoomCodeChange}
          onJoinRoom={onJoinRoom}
          onJoinPublicRoom={onJoinPublicRoom}
          onOpenCreateRoom={openCreateRoomModal}
        />
      </section>

      {showCreateRoomModal ? (
        <CreateRoomModal
          settings={settings}
          visibility={visibility}
          onSettingChange={onSettingChange}
          onVisibilityChange={onVisibilityChange}
          onClose={closeCreateRoomModal}
          onCreateRoom={handleCreateRoom}
        />
      ) : null}
    </main>
  );
};
