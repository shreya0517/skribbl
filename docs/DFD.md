# Data Flow Diagram

This project is a real-time multiplayer drawing game with a React client and a Socket.IO/Express server. The backend is the single source of truth for room state, game state, drawing data, and chat history.

## Context DFD

```mermaid
flowchart LR
    P1[Player / Host Browser]
    P2[Other Player Browsers]
    S((Skribbl Room System))

    P1 -->|Create room, join room, start game,\nchoose word, draw, chat, guess| S
    S -->|Room updates, word options,\ndrawer word, game state,\ncanvas sync, chat history| P1

    P2 -->|Join room, ready toggle,\nguess, chat, receive drawing| S
    S -->|Room updates, round events,\ngame state, drawing stream,\nchat stream| P2
```

## Level 1 DFD

```mermaid
flowchart TB
    Player[Player Browser]
    Host[Host Browser]

    P1((1. Room & Lobby Management))
    P2((2. Game Flow Engine))
    P3((3. Drawing Sync))
    P4((4. Chat & Guess Handling))

    D1[(Room Store\nMap roomCode -> Room)]
    D2[(Canvas Store\nroomStrokes + activeStrokes)]
    D3[(Chat History Store\nroomChatHistory)]
    D4[(Word List\nhardcoded WORDS)]

    Host -->|create_room, join_room,\njoin_public_room, toggle_ready,\nleave_room, start_game| P1
    Player -->|join_room, join_public_room,\ntoggle_ready, leave_room| P1
    P1 -->|create/update/reset room| D1
    D1 -->|serialized room| P1
    P1 -->|room_updated, chat_history,\ncanvas_state| Host
    P1 -->|room_updated, chat_history,\ncanvas_state| Player

    Host -->|word_chosen| P2
    Player -->|guess| P4
    P2 -->|read/write room state,\nturn, round, timers, scores| D1
    P2 -->|pick word options| D4
    D1 -->|room state| P2
    D4 -->|candidate words| P2
    P2 -->|word_options, drawer_word,\nround_start, round_end,\ngame_state, game_over| Host
    P2 -->|round_start, round_end,\ngame_state, game_over| Player

    Host -->|draw_start, draw_move,\ndraw_end, draw_undo,\ncanvas_clear| P3
    P3 -->|validate drawer using room state| D1
    P3 -->|store/replay strokes| D2
    D2 -->|stroke history| P3
    P3 -->|draw_start, draw_move,\ndraw_end, canvas_state,\ncanvas_cleared| Player
    P3 -->|canvas_state,\ncanvas_cleared| Host

    Host -->|chat_message| P4
    Player -->|chat_message, guess| P4
    P4 -->|validate word / score updates| D1
    P4 -->|append/replay messages| D3
    D1 -->|active word, players,\ncurrent drawer| P4
    D3 -->|message history| P4
    P4 -->|chat_message, chat_history,\nguess_result, correct_guess,\nroom_updated| Host
    P4 -->|chat_message, chat_history,\ncorrect_guess, room_updated| Player
```

## Process Notes

- `1. Room & Lobby Management`
  Handles `create_room`, `join_room`, `join_public_room`, `toggle_ready`, `leave_room`, host reassignment, and lobby resets.
- `2. Game Flow Engine`
  Handles round preparation, word selection, hint reveal timing, score progression, round end, and game over.
- `3. Drawing Sync`
  Accepts drawing input only from the active drawer and broadcasts/replays canvas state to the room.
- `4. Chat & Guess Handling`
  Stores chat history, validates guesses against the active word, awards points, and emits guess/chat updates.

## Data Stores

- `Room Store`
  In-memory `Map<string, Room>` in `skribbl-server/src/index.ts`
- `Canvas Store`
  In-memory `roomStrokes` and `activeStrokes`
- `Chat History Store`
  In-memory `roomChatHistory`
- `Word List`
  Current hardcoded `WORDS` array

## Source Mapping

- Backend entry and event handling: `skribbl-server/src/index.ts`
- Room lifecycle helpers: `skribbl-server/src/game/roomManager.ts`
- Derived game state and hint logic: `skribbl-server/src/game/gameEngine.ts`
- Client room/game orchestration: `skribbl-client/src/hooks/useGameRoom.ts`
- Client socket contract: `skribbl-client/src/socket/index.ts`
