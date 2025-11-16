import type { WebSocket } from 'ws';
import type { RequestMessage, RegRequestData, AddUserToRoomRequestData } from '../types/index.js';
import { Database } from '../database/index.js';
import { UserHandler, RoomHandler } from '../handlers/index.js';
import type { WSServer } from './server.js';
import type { ConnectionManager } from './connectionManager.js';

export class MessageRouter {
  private readonly userHandler: UserHandler;
  private readonly roomHandler: RoomHandler;

  constructor(
    private readonly db: Database,
    private readonly wsServer: WSServer,
    private readonly connectionManager: ConnectionManager
  ) {
    this.userHandler = new UserHandler(db, wsServer, connectionManager);
    this.roomHandler = new RoomHandler(db, wsServer, connectionManager);
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
        default:
          console.log(`[Command] ${message.type}`);
          console.log(`[Result] ${message.type}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`[Command] ${message.type}`);
      console.log(`[Result] Error: ${errorMessage}`);
    }
  }

  private handleReg(ws: WebSocket, message: RequestMessage): void {
    let data: RegRequestData;

    if (typeof message.data === 'string') {
      try {
        data = JSON.parse(message.data) as RegRequestData;
      } catch {
        console.log(`[Command] ${message.type}`);
        console.log('[Result] Error: Invalid JSON in data');
        return;
      }
    } else {
      data = message.data as RegRequestData;
    }

    this.userHandler.handleReg(ws, data);
  }

  private handleCreateRoom(ws: WebSocket, _message: RequestMessage): void {
    this.roomHandler.handleCreateRoom(ws);
  }

  private handleAddUserToRoom(ws: WebSocket, message: RequestMessage): void {
    let data: AddUserToRoomRequestData;

    if (typeof message.data === 'string') {
      try {
        data = JSON.parse(message.data) as AddUserToRoomRequestData;
      } catch {
        console.log(`[Command] ${message.type}`);
        console.log('[Result] Error: Invalid JSON in data');
        return;
      }
    } else {
      data = message.data as AddUserToRoomRequestData;
    }

    this.roomHandler.handleAddUserToRoom(ws, data);
  }

  removeConnection(ws: WebSocket): void {
    this.connectionManager.removeConnection(ws);
  }
}
