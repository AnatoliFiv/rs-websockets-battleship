import type { Ship, Position, AttackStatus, RoomUser } from './messages.js';

export interface Player {
  id: number | string;
  name: string;
  password: string;
  wins: number;
}

export interface Room {
  roomId: number | string;
  users: RoomUser[];
}

export interface GameBoard {
  ships: Ship[];
  attacks: Map<string, AttackStatus>;
}

export interface Game {
  gameId: number | string;
  player1Id: number | string;
  player2Id: number | string;
  player1Board: GameBoard;
  player2Board: GameBoard;
  player1Ready: boolean;
  player2Ready: boolean;
  currentPlayerId: number | string;
  status: GameStatus;
}

export type GameStatus = 'waiting' | 'ready' | 'active' | 'finished';

export interface AttackResult {
  position: Position;
  status: AttackStatus;
  isShipKilled: boolean;
  killedShipCells?: Position[];
}
