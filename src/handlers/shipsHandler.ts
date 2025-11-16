import type { WebSocket } from 'ws';
import type { ResponseMessage, AddShipsRequestData, Ship } from '../types/index.js';
import type { Game } from '../types/index.js';
import { Database } from '../database/index.js';
import type { WSServer, ConnectionManager } from '../websocket/index.js';

export class ShipsHandler {
  constructor(
    private readonly db: Database,
    private readonly wsServer: WSServer,
    private readonly connectionManager: ConnectionManager
  ) {}

  handleAddShips(ws: WebSocket, data: AddShipsRequestData): void {
    const { gameId, ships, indexPlayer } = data;

    if (!this.validateShips(ships)) {
      return;
    }

    const playerId = this.connectionManager.getPlayerIdByGamePlayerId(gameId, indexPlayer);
    if (!playerId) {
      return;
    }

    const success = this.db.addShipsToGame(gameId, playerId, ships);
    if (!success) {
      return;
    }

    const game = this.db.getGame(gameId);
    if (!game) {
      return;
    }

    if (game.player1Ready && game.player2Ready) {
      this.startGame(gameId, game, indexPlayer);
    }
  }

  private validateShips(ships: Ship[]): boolean {
    const boardSize = 10;
    const occupied = new Set<string>();

    for (const ship of ships) {
      if (!this.validateShip(ship, boardSize, occupied)) {
        return false;
      }
    }

    return true;
  }

  private validateShip(ship: Ship, boardSize: number, occupied: Set<string>): boolean {
    const { position, direction, length } = ship;

    if (length < 1 || length > 4) return false;
    if (position.x < 0 || position.x >= boardSize || position.y < 0 || position.y >= boardSize)
      return false;

    const endX = direction ? position.x : position.x + length - 1;
    const endY = direction ? position.y + length - 1 : position.y;

    if (endX < 0 || endX >= boardSize || endY < 0 || endY >= boardSize) return false;

    for (let i = 0; i < length; i++) {
      const x = direction ? position.x : position.x + i;
      const y = direction ? position.y + i : position.y;
      const key = `${x},${y}`;

      if (occupied.has(key)) return false;
      occupied.add(key);
    }

    return true;
  }

  private startGame(gameId: number | string, game: Game, lastPlayerId: number | string): void {
    const player1Id = game.player1Id;
    const player2Id = game.player2Id;

    const idPlayer1 = this.connectionManager.getGamePlayerIdByPlayerId(gameId, player1Id);
    const idPlayer2 = this.connectionManager.getGamePlayerIdByPlayerId(gameId, player2Id);

    if (!idPlayer1 || !idPlayer2) return;

    const playerId = this.connectionManager.getPlayerIdByGamePlayerId(gameId, lastPlayerId);
    if (!playerId) return;

    const ws1 = this.connectionManager.getWebSocket(player1Id);
    const ws2 = this.connectionManager.getWebSocket(player2Id);

    game.currentPlayerId = playerId;
    game.status = 'active';
    this.db.updateGame(gameId, game);

    if (ws1) {
      const response1: ResponseMessage = {
        type: 'start_game',
        data: {
          ships: game.player1Board.ships,
          currentPlayerIndex: lastPlayerId,
        },
        id: 0,
      };
      this.wsServer.sendToClient(ws1, response1);
    }

    if (ws2) {
      const response2: ResponseMessage = {
        type: 'start_game',
        data: {
          ships: game.player2Board.ships,
          currentPlayerIndex: lastPlayerId,
        },
        id: 0,
      };
      this.wsServer.sendToClient(ws2, response2);
    }

    const turnResponse: ResponseMessage = {
      type: 'turn',
      data: {
        currentPlayer: lastPlayerId,
      },
      id: 0,
    };

    if (ws1) this.wsServer.sendToClient(ws1, turnResponse);
    if (ws2) this.wsServer.sendToClient(ws2, turnResponse);
  }
}
