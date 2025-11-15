import type { Player, Room, Game } from './game.js';

export interface Database {
  players: Map<number | string, Player>;
  rooms: Map<number | string, Room>;
  games: Map<number | string, Game>;
  playerIdCounter: number;
  roomIdCounter: number;
  gameIdCounter: number;
}
