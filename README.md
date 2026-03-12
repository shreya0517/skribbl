# Skribbl Room

A full-stack multiplayer drawing and guessing game inspired by skribbl.io.

## Overview

Skribbl Room is a browser-based party game where players join a shared room, take turns drawing, and try to guess the secret word before time runs out. The project was built as a full-stack real-time application with a React frontend and a Socket.IO-powered Node.js backend.

Current implementation includes:

- Public and private rooms
- Invite-link sharing
- Real-time synchronized canvas drawing
- Turn-based rounds with word choice
- Hints that reveal over time
- Ready-up lobby flow
- Live leaderboard and game-over winner state
- In-memory chat history replay for new room members

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Socket.IO Client
- HTML5 Canvas API
- Plain CSS

### Backend

- Node.js
- Express
- TypeScript
- Socket.IO
- CORS

## Project Structure

```text
Web3Task_assignment/
|-- README.md
|-- skribbl-client/
|   |-- src/
|   |   |-- components/
|   |   |-- hooks/
|   |   |-- socket/
|   |   |-- types/
|   |   |-- App.tsx
|   |   |-- main.tsx
|   |   `-- styles.css
|   |-- package.json
|   `-- vite.config.ts
`-- skribbl-server/
    |-- src/
    |   |-- game/
    |   |   |-- gameEngine.ts
    |   |   `-- roomManager.ts
    |   |-- index.ts
    |   `-- types.ts
    `-- package.json
```

## Features

- Create public or private rooms
- Join by room code or invite link
- Quick Play for open public rooms
- Ready-up state in lobby
- Host-controlled game start
- Real-time drawing sync across all players
- Brush, eraser, color picker, brush size, undo, and clear tools
- Drawer word selection from multiple options
- Timed rounds with hint reveal
- Guess validation and chat stream
- Dynamic scoring closer to skribbl-style timing
- Drawer bonus for correct guesses
- Chat history replay when joining an active lobby room
- Winner announcement at game end
- Theme toggle and polished responsive UI

## How It Works

### Frontend

- `skribbl-client/src/App.tsx` coordinates lobby state, room state, notices, and top-level UI switching.
- `skribbl-client/src/hooks/useGameRoom.ts` manages client-side room lifecycle, socket subscriptions, and user actions.
- `skribbl-client/src/components/Canvas.tsx` captures pointer input and renders synchronized drawing on the HTML5 canvas.
- `skribbl-client/src/components/Chat.tsx` handles room chat, guess visibility, and chat history hydration.

### Backend

- `skribbl-server/src/index.ts` wires all Socket.IO events and acts as the main real-time server entry point.
- `skribbl-server/src/game/roomManager.ts` contains room helpers such as room serialization, lobby reset, and turn progression.
- `skribbl-server/src/game/gameEngine.ts` contains game helpers for hint generation and computed game state.

## Game Flow

1. A player creates a room or joins an existing room.
2. Players mark themselves ready in the lobby.
3. The host starts the game.
4. The server assigns the current drawer and sends word choices to that player.
5. The drawer selects a word and begins drawing.
6. Other players submit guesses in real time.
7. The server scores correct guesses, awards drawer bonuses, and reveals hints over time.
8. The round ends when time expires or when all guessers answer correctly.
9. The next drawer is selected until the configured rounds are complete.
10. The server emits a final game-over state and the client shows the winner.

## Socket Event Summary

### Room and lobby

- `create_room`
- `join_room`
- `join_public_room`
- `leave_room`
- `toggle_ready`
- `room_updated`

### Game flow

- `start_game`
- `word_chosen`
- `game_state`
- `round_start`
- `round_end`
- `game_over`
- `drawer_word`
- `word_options`

### Drawing

- `draw_start`
- `draw_move`
- `draw_end`
- `draw_undo`
- `canvas_clear`
- `canvas_state`
- `canvas_cleared`

### Chat and guessing

- `guess`
- `guess_result`
- `correct_guess`
- `chat_message`
- `chat_history`

## Scoring Logic

The current scoring model is not flat. It rewards faster and earlier guesses more heavily:

- A correct guess earns more points when there is more time left in the round
- Earlier correct guessers receive more than later correct guessers
- The active drawer receives a bonus when another player guesses correctly

This logic is calculated server-side in `skribbl-server/src/index.ts`.

## Local Setup

### Prerequisites

- Node.js 18 or newer
- npm

### Install dependencies

```bash
cd skribbl-client
npm install
```

```bash
cd ../skribbl-server
npm install
```

## Run Locally

### Start the backend

```bash
cd skribbl-server
npm run dev
```

The backend runs on `http://localhost:4000`.

### Start the frontend

```bash
cd skribbl-client
npm run dev
```

The frontend usually runs on `http://localhost:5173`.

## Build and Verification

### Frontend

```bash
cd skribbl-client
npm run lint
npm run build
```

### Backend

```bash
cd skribbl-server
npm run build
```

## Environment Configuration

### What you need today

You do not need a Canva API key or any other external canvas service configuration. The project uses the browser's built-in HTML5 Canvas API.

You also do not need a database connection string yet because room state, strokes, scores, and chat history are stored in memory.

### Variables used by the app

Frontend:

- `VITE_WS_URL`
  The websocket/backend URL used by the client.
  Example: `https://your-backend-name.up.railway.app`

Backend:

- `PORT`
  Port used by the Node.js server in production.

If `VITE_WS_URL` is not set, the frontend defaults to:

```text
http://localhost:4000
```

### Deployment guidance

For deployment, you will usually want:

- a deployed backend URL
- `VITE_WS_URL` set in the frontend host
- `PORT` set automatically by the backend host, or injected by the platform

You only need additional environment variables later if you add:

- a database such as PostgreSQL or MongoDB
- auth providers
- storage services
- analytics or third-party APIs

## Current Limitations

- Room state, scores, canvas data, and chat history are stored in memory
- Restarting the server clears all rooms and history
- There is no database integration yet
- The word list is still hardcoded
- Deployment is not completed yet

## Architecture Notes

This project is intentionally event-driven:

- The frontend does not poll the backend for game state
- The backend is the single source of truth for rooms, turns, scores, hints, and drawing permissions
- The canvas sync is done by broadcasting stroke events and replaying stored strokes for new room members
- Chat history is stored in memory per room and replayed on join

## Deployment

Recommended deployment split:

- Backend: Railway
- Frontend: Netlify

### Files added for deployment

- `netlify.toml`
- `skribbl-client/.env.example`
- `skribbl-server/.env.example`

### Backend deployment on Railway

Manual Railway setup:

1. Create a new project on Railway
2. Connect this repository
3. Set the root directory to `skribbl-server`
4. Use:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
5. Railway should provide `PORT` automatically
6. Deploy and copy the backend public URL

Expected backend URL format:

```text
https://your-backend-name.up.railway.app
```

### Frontend deployment on Netlify

This repo includes a root `netlify.toml` configured for the frontend build.

1. Import the same repository into Netlify
2. Netlify should read `netlify.toml`
3. Add environment variable:

```text
VITE_WS_URL=https://your-backend-name.up.railway.app
```

4. Deploy the frontend

### Post-deployment checks

After both services are live, verify:

- room creation works
- private invite links work
- Quick Play can join a public room
- drawing sync works across browser tabs/devices
- guessing updates the leaderboard
- ready-up and start-game flow work
- chat history loads correctly for new room members

### Live URL

- To be added after deployment
