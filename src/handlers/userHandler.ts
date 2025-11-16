import type { WebSocket } from 'ws';
import type { ResponseMessage, RegRequestData } from '../types/index.js';
import { Database } from '../database/index.js';
import type { WSServer, ConnectionManager } from '../websocket/index.js';

export class UserHandler {
  constructor(
    private readonly db: Database,
    private readonly wsServer: WSServer,
    private readonly connectionManager: ConnectionManager
  ) {}

  handleReg(ws: WebSocket, data: RegRequestData): void {
    const { name, password } = data;

    if (!this.validateUserData(name, password)) {
      this.sendErrorResponse(ws, name, 'Invalid name or password');
      return;
    }

    const result = this.db.createPlayer(name, password);

    if (result.error) {
      this.sendErrorResponse(ws, name, result.errorText);
      return;
    }

    const player = result.player!;
    this.connectionManager.setPlayer(ws, player.id);
    this.sendSuccessResponse(ws, player.name, player.id);

    this.broadcastRoomUpdate();
    this.broadcastWinnersUpdate();
  }

  private validateUserData(name: string, password: string): boolean {
    return (name.trim().length > 0 && password.trim().length > 0);
  }

  private sendSuccessResponse(ws: WebSocket, name: string, index: number | string): void {
    const response: ResponseMessage = {
      type: 'reg',
      data: {
        name,
        index,
        error: false,
        errorText: '',
      },
      id: 0,
    };
    this.wsServer.sendToClient(ws, response);
  }

  private sendErrorResponse(ws: WebSocket, name: string, errorText: string): void {
    const response: ResponseMessage = {
      type: 'reg',
      data: {
        name,
        index: 0,
        error: true,
        errorText,
      },
      id: 0,
    };
    this.wsServer.sendToClient(ws, response);
  }

  private broadcastRoomUpdate(): void {
    const rooms = this.db.getAvailableRooms();
    const response: ResponseMessage = {
      type: 'update_room',
      data: rooms.map((room) => ({
        roomId: room.roomId,
        roomUsers: room.users,
      })),
      id: 0,
    };
    this.wsServer.sendToAll(response);
  }

  private broadcastWinnersUpdate(): void {
    const winners = this.db.getWinners();
    const response: ResponseMessage = {
      type: 'update_winners',
      data: winners,
      id: 0,
    };
    this.wsServer.sendToAll(response);
  }
}
