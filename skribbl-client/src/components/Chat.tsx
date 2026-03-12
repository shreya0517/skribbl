// chat + guesses input and list

import { useEffect, useState } from "react";
import { socket } from "../socket";

interface ChatProps {
  roomCode: string;
  name: string;
  canGuess: boolean;
}

interface ChatMessage {
  name: string;
  message: string;
}

export const Chat: React.FC<ChatProps> = ({ roomCode, name, canGuess }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const handleHistory = (data: { messages: ChatMessage[] }) => {
      setMessages(data.messages);
    };
    const handleChat = (data: ChatMessage) => {
      setMessages((prev) => [...prev, data]);
    };

    socket.on("chat_history", handleHistory);
    socket.on("chat_message", handleChat);

    return () => {
      socket.off("chat_history", handleHistory);
      socket.off("chat_message", handleChat);
    };
  }, []);

  const send = () => {
    const message = input.trim();
    if (!message) return;

    if (canGuess) {
      socket.emit("guess", { roomCode, guess: message });
    } else {
      socket.emit("chat_message", { roomCode, message, name });
    }

    setInput("");
  };

  return (
    <div className="chat-shell">
      <div className="panel-heading">
        <div>
          <h2>Chat</h2>
          <p>{canGuess ? "Type guesses or talk trash." : "Drawer chat is still live."}</p>
        </div>
      </div>
      <div className="chat-stream">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`chat-message ${m.name === "System" ? "chat-message-system" : ""}`}
          >
            <strong>{m.name}</strong>
            <span>{m.message}</span>
          </div>
        ))}
        {messages.length === 0 ? (
          <div className="chat-empty">Messages and guesses will appear here.</div>
        ) : null}
      </div>
      <div className="chat-input-row">
        <input
          className="text-input"
          placeholder={canGuess ? "Type a guess or message..." : "Chat..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="primary-button" onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
};
