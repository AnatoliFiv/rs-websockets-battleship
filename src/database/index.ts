import type { Player, Room, Game, GameBoard, Ship, Winner } from '../types/index.js';

type PlayerResult = { player: Player | null; error: boolean; errorText: string };

export class Database {
  private readonly players = new Map<number | string, Player>();
  private readonly rooms = new Map<number | string, Room>();
  private readonly games = new Map<number | string, Game>();
  private playerIdCounter = 1;
  private roomIdCounter = 1;
  private gameIdCounter = 1;

  private createEmptyBoard(): GameBoard {
    return { ships: [], attacks: new Map() };
  }

  createPlayer(name: string, password: string): PlayerResult {
    const existingPlayer = this.findPlayerByName(name);
    if (existingPlayer) {
      return existingPlayer.password === password
        ? { player: existingPlayer, error: false, errorText: '' }
        : { player: null, error: true, errorText: 'Invalid password' };
    }

    const player: Player = {
      id: this.playerIdCounter++,
      name,
      password,
      wins: 0,
    };
    this.players.set(player.id, player);
    return { player, error: false, errorText: '' };
  }

  findPlayerByName(name: string): Player | null {
    return Array.from(this.players.values()).find((player) => player.name === name) ?? null;
  }

  getPlayerById(id: number | string): Player | null {
    return this.players.get(id) ?? null;
  }

  updatePlayerWins(playerId: number | string): void {
    const player = this.players.get(playerId);
    if (player) player.wins++;
  }

  getWinners(): Winner[] {
    return Array.from(this.players.values())
      .filter((player) => player.wins > 0)
      .map((player) => ({ name: player.name, wins: player.wins }))
      .sort((a, b) => b.wins - a.wins);
  }

  createRoom(playerId: number | string, playerName: string, playerIndex: number | string): Room {
    const room: Room = {
      roomId: this.roomIdCounter++,
      users: [{ name: playerName, index: playerIndex }],
    };
    this.rooms.set(room.roomId, room);
    return room;
  }

  addPlayerToRoom(
    roomId: number | string,
    playerName: string,
    playerIndex: number | string
  ): Room | null {
    const room = this.rooms.get(roomId);
    if (!room || room.users.length >= 2) return null;

    room.users.push({ name: playerName, index: playerIndex });
    return room;
  }

  getAvailableRooms(): Room[] {
    return Array.from(this.rooms.values()).filter((room) => room.users.length === 1);
  }

  removeRoom(roomId: number | string): boolean {
    return this.rooms.delete(roomId);
  }

  getRoom(roomId: number | string): Room | null {
    return this.rooms.get(roomId) ?? null;
  }

  createGame(
    roomId: number | string,
    player1Id: number | string,
    player2Id: number | string
  ): Game {
    const game: Game = {
      gameId: this.gameIdCounter++,
      player1Id,
      player2Id,
      player1Board: this.createEmptyBoard(),
      player2Board: this.createEmptyBoard(),
      player1Ready: false,
      player2Ready: false,
      currentPlayerId: player1Id,
      status: 'waiting',
    };
    this.games.set(game.gameId, game);
    return game;
  }

  getGame(gameId: number | string): Game | null {
    return this.games.get(gameId) ?? null;
  }

  updateGame(gameId: number | string, game: Game): void {
    this.games.set(gameId, game);
  }

  deleteGame(gameId: number | string): boolean {
    return this.games.delete(gameId);
  }

  addShipsToGame(gameId: number | string, playerGameId: number | string, ships: Ship[]): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    if (playerGameId === game.player1Id) {
      if (game.player1Ready) return false;
      game.player1Board.ships = ships;
      game.player1Ready = true;
      return true;
    } else if (playerGameId === game.player2Id) {
      if (game.player2Ready) return false;
      game.player2Board.ships = ships;
      game.player2Ready = true;
      return true;
    }
    return false;
  }
}
