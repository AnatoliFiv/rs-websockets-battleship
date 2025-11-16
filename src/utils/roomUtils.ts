import type { ResponseMessage } from '../types/index.js';
import { Database } from '../database/index.js';
import type { WSServer } from '../websocket/server.js';

export function broadcastRoomUpdate(db: Database, wsServer: WSServer): void {
  const rooms = db.getAvailableRooms();
  const response: ResponseMessage = {
    type: 'update_room',
    data: rooms.map((room) => ({
      roomId: room.roomId,
      roomUsers: room.users,
    })),
    id: 0,
  };
  wsServer.sendToAll(response);
}
