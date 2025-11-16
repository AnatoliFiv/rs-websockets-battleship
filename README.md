# WebSocket Battleship Server

Backend server for Battleship game implemented with TypeScript and WebSocket for real-time multiplayer gameplay.

## Installation

```bash
npm install
```

## Usage

**Development:**

```bash
npm run start:dev
```

**Production:**

```bash
npm run start
```

- HTTP server: `http://localhost:8181`
- WebSocket server: `ws://localhost:3000`

## Features

- Player registration and authentication
- Game room creation and joining
- Ship placement with validation
- Real-time game attacks and turns
- Winner tracking and statistics
- Single play bot

## WebSocket Commands

### Client → Server

- `reg` - Register/login player
- `create_room` - Create game room
- `add_user_to_room` - Join room
- `add_ships` - Place ships
- `attack` - Attack coordinates
- `randomAttack` - Random attack
- `single_play` - Play with bot

### Server → Client

- `reg` - Registration result
- `update_room` - Room list update
- `update_winners` - Winners table update
- `create_game` - Game created
- `start_game` - Game started
- `turn` - Current player turn
- `attack` - Attack result
- `finish` - Game finished

## Tech Stack

- **Node.js** 24.x.x
- **TypeScript** 5.9.3
- **WebSocket** (ws 8.8.0)

## Scripts

```bash
npm run start
npm run start:dev
npm run lint
npm run format
npm run build
```

---

**Note**: Replace `npm` with `yarn` if you use yarn.
