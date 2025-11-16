import type { WebSocket } from 'ws';
import type {
  RequestMessage,
  RegRequestData,
  AddUserToRoomRequestData,
  AddShipsRequestData,
  AttackRequestData,
  RandomAttackRequestData,
} from '../types/index.js';
import { Database } from '../database/index.js';
import { UserHandler, RoomHandler, ShipsHandler, GameHandler } from '../handlers/index.js';
import type { WSServer } from './server.js';
import type { ConnectionManager } from './connectionManager.js';

export class MessageRouter {
  private readonly userHandler: UserHandler;
  private readonly roomHandler: RoomHandler;
  private readonly shipsHandler: ShipsHandler;
  private readonly gameHandler: GameHandler;

  constructor(
    private readonly db: Database,
    private readonly wsServer: WSServer,
    private readonly connectionManager: ConnectionManager
  ) {
    this.userHandler = new UserHandler(db, wsServer, connectionManager);
    this.roomHandler = new RoomHandler(db, wsServer, connectionManager);
    this.shipsHandler = new ShipsHandler(db, wsServer, connectionManager);
    this.gameHandler = new GameHandler(db, wsServer, connectionManager);
  }

  route(ws: WebSocket, message: RequestMessage): void {
    try {
      switch (message.type) {
        case 'reg':
          this.handleReg(ws, message);
          break;
        case 'create_room':
          this.handleCreateRoom(ws, message);
          break;
        case 'add_user_to_room':
          this.handleAddUserToRoom(ws, message);
          break;
        case 'add_ships':
          this.handleAddShips(message);
          break;
        case 'attack':
          this.handleAttack(message);
          break;
        case 'randomAttack':
          this.handleRandomAttack(message);
          break;
        default:
          console.log(`[Result] ${message.type}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`[Result] Error: ${errorMessage}`);
    }
  }

  private handleReg(ws: WebSocket, message: RequestMessage): void {
    const data = this.parseMessageData<RegRequestData>(message);
    if (!data) return;
    this.userHandler.handleReg(ws, data);
  }

  private handleCreateRoom(ws: WebSocket, _message: RequestMessage): void {
    this.roomHandler.handleCreateRoom(ws);
  }

  private handleAddUserToRoom(ws: WebSocket, message: RequestMessage): void {
    const data = this.parseMessageData<AddUserToRoomRequestData>(message);
    if (!data) return;
    this.roomHandler.handleAddUserToRoom(ws, data);
  }

  private handleAddShips(message: RequestMessage): void {
    const data = this.parseMessageData<AddShipsRequestData>(message);
    if (!data) return;
    this.shipsHandler.handleAddShips(data);
  }

  private handleAttack(message: RequestMessage): void {
    const data = this.parseMessageData<AttackRequestData>(message);
    if (!data) return;
    this.gameHandler.handleAttack(data);
  }

  private handleRandomAttack(message: RequestMessage): void {
    const data = this.parseMessageData<RandomAttackRequestData>(message);
    if (!data) return;
    this.gameHandler.handleRandomAttack(data);
  }

  private parseMessageData<T>(message: RequestMessage): T | null {
    if (typeof message.data === 'string') {
      try {
        return JSON.parse(message.data) as T;
      } catch {
        console.log('[Result] Error: Invalid JSON in data');
        return null;
      }
    }
    return message.data as T;
  }

  removeConnection(ws: WebSocket): void {
    this.connectionManager.removeConnection(ws);
  }
}
