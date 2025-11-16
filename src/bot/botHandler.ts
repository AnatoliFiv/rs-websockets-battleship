import type { WebSocket } from 'ws';
import type {
  ResponseMessage,
  AddShipsRequestData,
  RandomAttackRequestData,
  Ship,
} from '../types/index.js';
import { Database } from '../database/index.js';
import type { WSServer, ConnectionManager } from '../websocket/index.js';
import { BotShipGenerator } from './shipGenerator.js';
import { BOT_NAME, BOT_ATTACK_DELAY_MS } from '../constants/index.js';
import { ShipsHandler, GameHandler } from '../handlers/index.js';

export class BotHandler {
  private botAttackTimeouts = new Map<number | string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly db: Database,
    private readonly wsServer: WSServer,
    private readonly connectionManager: ConnectionManager,
    private readonly shipsHandler: ShipsHandler,
    private readonly gameHandler: GameHandler
  ) {}

  handleSinglePlay(ws: WebSocket): void {
    const playerId = this.connectionManager.getPlayerId(ws);
    if (!playerId) return;

    const player = this.db.getPlayerById(playerId);
    if (!player) return;

    let botPlayer = this.db.findPlayerByName(BOT_NAME);
    if (!botPlayer) {
      const result = this.db.createPlayer(BOT_NAME, '');
      botPlayer = result.player;
    }

    if (!botPlayer) return;

    const room = this.db.createRoom(playerId, player.name, playerId);
    const updatedRoom = this.db.addPlayerToRoom(room.roomId, botPlayer.name, botPlayer.id);
    if (!updatedRoom) return;

    const game = this.db.createGame(room.roomId, playerId, botPlayer.id);

    const idPlayer1 = this.connectionManager.generateGamePlayerId();
    const idPlayer2 = this.connectionManager.generateGamePlayerId();

    this.connectionManager.setGameMapping(
      game.gameId,
      playerId,
      botPlayer.id,
      idPlayer1,
      idPlayer2
    );
    this.connectionManager.setBotPlayer(game.gameId, idPlayer2);

    const response: ResponseMessage = {
      type: 'create_game',
      data: {
        idGame: game.gameId,
        idPlayer: idPlayer1,
      },
      id: 0,
    };
    this.wsServer.sendToClient(ws, response);

    console.log('[Result] create_game');

    this.db.removeRoom(room.roomId);

    const botShips = BotShipGenerator.generateShips();
    this.placeBotShips(game.gameId, idPlayer2, botShips);
  }

  private placeBotShips(
    gameId: number | string,
    botGamePlayerId: number | string,
    ships: Ship[]
  ): void {
    const data: AddShipsRequestData = {
      gameId,
      ships,
      indexPlayer: botGamePlayerId,
    };

    this.shipsHandler.handleAddShips(data);
  }

  handleBotTurn(gameId: number | string, botGamePlayerId: number | string): void {
    const timeout = setTimeout(() => {
      this.botAttackTimeouts.delete(gameId);
      const data: RandomAttackRequestData = {
        gameId,
        indexPlayer: botGamePlayerId,
      };
      this.gameHandler.handleRandomAttack(data);
    }, BOT_ATTACK_DELAY_MS);

    this.botAttackTimeouts.set(gameId, timeout);
  }

  cancelBotTurn(gameId: number | string): void {
    const timeout = this.botAttackTimeouts.get(gameId);
    if (timeout) {
      clearTimeout(timeout);
      this.botAttackTimeouts.delete(gameId);
    }
  }

  isBot(playerId: number | string): boolean {
    const player = this.db.getPlayerById(playerId);
    return player?.name === BOT_NAME;
  }
}
