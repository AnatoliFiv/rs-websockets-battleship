import type {
  ResponseMessage,
  AttackRequestData,
  RandomAttackRequestData,
  AttackStatus,
  AttackResponseData,
  TurnResponseData,
  FinishResponseData,
  Position,
  Game,
  GameBoard,
  Ship,
} from '../types/index.js';
import { Database } from '../database/index.js';
import type { WSServer, ConnectionManager } from '../websocket/index.js';
import { BOARD_SIZE, CELL_DIRECTIONS } from '../constants/index.js';
import type { BotHandler } from '../bot/index.js';

export class GameHandler {
  private botHandler: BotHandler | null = null;

  constructor(
    private readonly db: Database,
    private readonly wsServer: WSServer,
    private readonly connectionManager: ConnectionManager
  ) {}

  setBotHandler(botHandler: BotHandler): void {
    this.botHandler = botHandler;
  }

  handleAttack(data: AttackRequestData): void {
    const { gameId, x, y, indexPlayer } = data;

    const game = this.db.getGame(gameId);
    if (!game || game.status !== 'active') return;

    const playerId = this.connectionManager.getPlayerIdByGamePlayerId(gameId, indexPlayer);
    if (!playerId || playerId !== game.currentPlayerId) return;

    this.processAttack(gameId, game, playerId, x, y);
  }

  handleRandomAttack(data: RandomAttackRequestData): void {
    const { gameId, indexPlayer } = data;

    const game = this.db.getGame(gameId);
    if (!game || game.status !== 'active') return;

    const playerId = this.connectionManager.getPlayerIdByGamePlayerId(gameId, indexPlayer);
    if (!playerId || playerId !== game.currentPlayerId) return;

    const { enemyBoard } = this.getBoards(game, playerId);
    const target = this.pickRandomTarget(enemyBoard);
    if (!target) return;

    this.processAttack(gameId, game, playerId, target.x, target.y);
  }

  private processAttack(
    gameId: number | string,
    game: Game,
    attackerId: number | string,
    x: number,
    y: number
  ): void {
    const { enemyBoard, enemyId } = this.getBoards(game, attackerId);
    const key = `${x},${y}`;

    if (enemyBoard.attacks.has(key)) {
      return;
    }

    const ship = this.findShipAt(enemyBoard, x, y);
    let status: AttackStatus = 'miss';
    let killedShipCells: Position[] | null = null;

    if (ship) {
      const shipCells = this.getShipCells(ship);
      const allHit = shipCells.every((cell) => {
        const cellKey = `${cell.x},${cell.y}`;
        return enemyBoard.attacks.get(cellKey) === 'shot' || (cell.x === x && cell.y === y);
      });

      if (allHit) {
        status = 'killed';
        killedShipCells = shipCells;
        shipCells.forEach((cell) => {
          enemyBoard.attacks.set(`${cell.x},${cell.y}`, 'shot');
        });
        this.markSurroundingsAsMiss(enemyBoard, shipCells);
      } else {
        status = 'shot';
        enemyBoard.attacks.set(key, 'shot');
      }
    } else {
      enemyBoard.attacks.set(key, 'miss');
    }

    const attackerGameId = this.connectionManager.getGamePlayerIdByPlayerId(gameId, attackerId);
    const defenderGameId = this.connectionManager.getGamePlayerIdByPlayerId(gameId, enemyId);
    if (!attackerGameId || !defenderGameId) {
      return;
    }

    const nextPlayerId = status === 'miss' ? enemyId : attackerId;
    const nextGamePlayerId = status === 'miss' ? defenderGameId : attackerGameId;

    game.currentPlayerId = nextPlayerId;
    this.db.updateGame(gameId, game);

    const currentPlayerForAttack = attackerGameId;

    const attackResponse: ResponseMessage = {
      type: 'attack',
      data: {
        position: { x, y },
        currentPlayer: currentPlayerForAttack,
        status,
      } as AttackResponseData,
      id: 0,
    };

    this.broadcastToGamePlayers(game, attackResponse);

    if (status === 'killed' && killedShipCells) {
      this.sendSurroundingMisses(game, enemyBoard, killedShipCells, currentPlayerForAttack);
    }

    const defenderShipsAlive = this.hasAliveShips(enemyBoard);

    if (!defenderShipsAlive) {
      this.finishGame(gameId, game, attackerId, attackerGameId);
      return;
    }

    const turnResponse: ResponseMessage = {
      type: 'turn',
      data: {
        currentPlayer: nextGamePlayerId,
      } as TurnResponseData,
      id: 0,
    };

    this.broadcastToGamePlayers(game, turnResponse);

    if (this.botHandler) {
      if (this.connectionManager.isBotGamePlayer(gameId, nextGamePlayerId)) {
        this.botHandler.handleBotTurn(gameId, nextGamePlayerId);
      } else {
        this.botHandler.cancelBotTurn(gameId);
      }
    }
  }

  private getBoards(
    game: Game,
    attackerId: number | string
  ): {
    ownBoard: GameBoard;
    enemyBoard: GameBoard;
    enemyId: number | string;
  } {
    if (attackerId === game.player1Id) {
      return {
        ownBoard: game.player1Board,
        enemyBoard: game.player2Board,
        enemyId: game.player2Id,
      };
    }
    return {
      ownBoard: game.player2Board,
      enemyBoard: game.player1Board,
      enemyId: game.player1Id,
    };
  }

  private findShipAt(board: GameBoard, x: number, y: number): Ship | null {
    return (
      board.ships.find((ship) =>
        this.getShipCells(ship).some((cell) => cell.x === x && cell.y === y)
      ) || null
    );
  }

  private getShipCells(ship: Ship): Position[] {
    const cells: Position[] = [];
    for (let i = 0; i < ship.length; i++) {
      const x = ship.direction ? ship.position.x : ship.position.x + i;
      const y = ship.direction ? ship.position.y + i : ship.position.y;
      cells.push({ x, y });
    }
    return cells;
  }

  private markSurroundingsAsMiss(board: GameBoard, shipCells: Position[]): void {
    shipCells.forEach((cell) => {
      CELL_DIRECTIONS.forEach(([dx, dy]) => {
        const x = cell.x + dx;
        const y = cell.y + dy;
        if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return;
        const key = `${x},${y}`;
        if (!board.attacks.has(key)) {
          board.attacks.set(key, 'miss');
        }
      });
    });
  }

  private sendSurroundingMisses(
    game: Game,
    board: GameBoard,
    shipCells: Position[],
    currentPlayerId: number | string
  ): void {
    const surroundingCells = new Set<string>();

    shipCells.forEach((cell) => {
      CELL_DIRECTIONS.forEach(([dx, dy]) => {
        const x = cell.x + dx;
        const y = cell.y + dy;
        if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return;

        const isShipCell = shipCells.some((sc) => sc.x === x && sc.y === y);
        if (isShipCell) return;

        const key = `${x},${y}`;
        const attackStatus = board.attacks.get(key);
        if (!attackStatus || attackStatus === 'miss') {
          surroundingCells.add(key);
        }
      });
    });

    surroundingCells.forEach((cellKey) => {
      const [x, y] = cellKey.split(',').map(Number);
      const missResponse: ResponseMessage = {
        type: 'attack',
        data: {
          position: { x, y },
          currentPlayer: currentPlayerId,
          status: 'miss',
        } as AttackResponseData,
        id: 0,
      };
      this.broadcastToGamePlayers(game, missResponse);
    });
  }

  private hasAliveShips(board: GameBoard): boolean {
    return board.ships.some((ship) =>
      this.getShipCells(ship).some((cell) => {
        const key = `${cell.x},${cell.y}`;
        const status = board.attacks.get(key);
        return status !== 'shot' && status !== 'killed';
      })
    );
  }

  private finishGame(
    gameId: number | string,
    game: Game,
    winnerPlayerId: number | string,
    winnerGamePlayerId: number | string
  ): void {
    if (this.botHandler) {
      this.botHandler.cancelBotTurn(gameId);
    }

    game.status = 'finished';
    this.db.updateGame(gameId, game);

    const botPlayerId = this.connectionManager.getPlayerIdByGamePlayerId(
      gameId,
      winnerGamePlayerId
    );
    if (!botPlayerId || !this.botHandler?.isBot(botPlayerId)) {
      this.db.updatePlayerWins(winnerPlayerId);
    }

    const finishResponse: ResponseMessage = {
      type: 'finish',
      data: {
        winPlayer: winnerGamePlayerId,
      } as FinishResponseData,
      id: 0,
    };

    this.broadcastToGamePlayers(game, finishResponse);

    const winners = this.db.getWinners();
    const updateWinnersResponse: ResponseMessage = {
      type: 'update_winners',
      data: winners,
      id: 0,
    };
    this.wsServer.sendToAll(updateWinnersResponse);

    this.connectionManager.removeGameMapping(gameId);
    this.db.deleteGame(gameId);
  }

  private broadcastToGamePlayers(game: Game, message: ResponseMessage): void {
    const ws1 = this.connectionManager.getWebSocket(game.player1Id);
    const ws2 = this.connectionManager.getWebSocket(game.player2Id);

    if (ws1) this.wsServer.sendToClient(ws1, message);
    if (ws2) this.wsServer.sendToClient(ws2, message);
    console.log(`[Result] ${message.type}`);
  }

  private pickRandomTarget(board: GameBoard): Position | null {
    const candidates: Position[] = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        const key = `${x},${y}`;
        if (!board.attacks.has(key)) {
          candidates.push({ x, y });
        }
      }
    }
    if (candidates.length === 0) return null;
    const index = Math.floor(Math.random() * candidates.length);
    return candidates[index];
  }
}
