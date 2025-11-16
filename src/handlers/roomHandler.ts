import type { WebSocket } from 'ws';
import type { ResponseMessage, AddUserToRoomRequestData } from '../types/index.js';
import { Database } from '../database/index.js';
import type { WSServer, ConnectionManager } from '../websocket/index.js';

export class RoomHandler {
  constructor(
    private readonly db: Database,
    private readonly wsServer: WSServer,
    private readonly connectionManager: ConnectionManager
  ) {}

  handleCreateRoom(ws: WebSocket): void {
    const playerId = this.connectionManager.getPlayerId(ws);
    if (!playerId) {
      return;
    }

    const player = this.db.getPlayerById(playerId);
    if (!player) {
      return;
    }

    this.db.createRoom(playerId, player.name, playerId);
    this.broadcastRoomUpdate();
  }

  handleAddUserToRoom(ws: WebSocket, data: AddUserToRoomRequestData): void {
    const playerId = this.connectionManager.getPlayerId(ws);
    if (!playerId) {
      return;
    }

    const player = this.db.getPlayerById(playerId);
    if (!player) {
      return;
    }

    const room = this.db.addPlayerToRoom(data.indexRoom, player.name, playerId);
    if (!room) {
      return;
    }

    if (room.users.length === 2) {
      const player1Id = room.users[0].index;
      const player2Id = room.users[1].index;

      const game = this.db.createGame(room.roomId, player1Id, player2Id);

      const idPlayer1 = this.connectionManager.generateGamePlayerId();
      const idPlayer2 = this.connectionManager.generateGamePlayerId();

      this.connectionManager.setGameMapping(
        game.gameId,
        player1Id,
        player2Id,
        idPlayer1,
        idPlayer2
      );

      const ws1 = this.connectionManager.getWebSocket(player1Id);
      const ws2 = this.connectionManager.getWebSocket(player2Id);

      if (ws1) {
        const response1: ResponseMessage = {
          type: 'create_game',
          data: {
            idGame: game.gameId,
            idPlayer: idPlayer1,
          },
          id: 0,
        };
        this.wsServer.sendToClient(ws1, response1);
      }

      if (ws2) {
        const response2: ResponseMessage = {
          type: 'create_game',
          data: {
            idGame: game.gameId,
            idPlayer: idPlayer2,
          },
          id: 0,
        };
        this.wsServer.sendToClient(ws2, response2);
      }

      this.db.removeRoom(room.roomId);
    }

    this.broadcastRoomUpdate();
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
}
