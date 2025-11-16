import type { WebSocket } from 'ws';
import type { ResponseMessage, AddShipsRequestData, Ship } from '../types/index.js';
import type { Game } from '../types/index.js';
import { Database } from '../database/index.js';
import type { WSServer, ConnectionManager } from '../websocket/index.js';
import { BOARD_SIZE, MIN_SHIP_LENGTH, MAX_SHIP_LENGTH } from '../constants/index.js';
import type { BotHandler } from '../bot/index.js';

export class ShipsHandler {
  private botHandler: BotHandler | null = null;

  constructor(
    private readonly db: Database,
    private readonly wsServer: WSServer,
    private readonly connectionManager: ConnectionManager
  ) {}

  setBotHandler(botHandler: BotHandler): void {
    this.botHandler = botHandler;
  }

  handleAddShips(data: AddShipsRequestData): void {
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
    const occupied = new Set<string>();

    for (const ship of ships) {
      if (!this.validateShip(ship, BOARD_SIZE, occupied)) {
        return false;
      }
    }

    return true;
  }

  private validateShip(ship: Ship, boardSize: number, occupied: Set<string>): boolean {
    const { position, direction, length } = ship;

    if (length < MIN_SHIP_LENGTH || length > MAX_SHIP_LENGTH) return false;
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

  private startGame(
    gameId: number | string,
    game: Game,
    currentGamePlayerId: number | string
  ): void {
    const idPlayer1 = this.connectionManager.getGamePlayerIdByPlayerId(gameId, game.player1Id);
    const idPlayer2 = this.connectionManager.getGamePlayerIdByPlayerId(gameId, game.player2Id);

    if (!idPlayer1 || !idPlayer2) return;

    const currentPlayerId = this.connectionManager.getPlayerIdByGamePlayerId(
      gameId,
      currentGamePlayerId
    );
    if (!currentPlayerId) return;

    const ws1 = this.connectionManager.getWebSocket(game.player1Id);
    const ws2 = this.connectionManager.getWebSocket(game.player2Id);

    game.currentPlayerId = currentPlayerId;
    game.status = 'active';
    this.db.updateGame(gameId, game);

    if (ws1) {
      this.sendStartGameResponse(ws1, game.player1Board.ships, currentGamePlayerId);
    }
    if (ws2) {
      this.sendStartGameResponse(ws2, game.player2Board.ships, currentGamePlayerId);
    }
    console.log('[Result] start_game');

    this.sendTurnToPlayers(ws1, ws2, currentGamePlayerId);

    if (this.botHandler && this.connectionManager.isBotGamePlayer(gameId, currentGamePlayerId)) {
      this.botHandler.handleBotTurn(gameId, currentGamePlayerId);
    }
  }

  private sendStartGameResponse(
    ws: WebSocket,
    ships: Ship[],
    currentPlayerIndex: number | string
  ): void {
    const response: ResponseMessage = {
      type: 'start_game',
      data: {
        ships,
        currentPlayerIndex,
      },
      id: 0,
    };
    this.wsServer.sendToClient(ws, response);
  }

  private sendTurnToPlayers(
    ws1: WebSocket | null,
    ws2: WebSocket | null,
    currentPlayer: number | string
  ): void {
    const turnResponse: ResponseMessage = {
      type: 'turn',
      data: { currentPlayer },
      id: 0,
    };
    if (ws1) this.wsServer.sendToClient(ws1, turnResponse);
    if (ws2) this.wsServer.sendToClient(ws2, turnResponse);
    console.log('[Result] turn');
  }
}
