import type { WebSocket } from 'ws';

export class ConnectionManager {
  private readonly wsToPlayerId = new Map<WebSocket, number | string>();
  private readonly playerIdToWs = new Map<number | string, WebSocket>();
  private gamePlayerIdCounter = 1;

  setPlayer(ws: WebSocket, playerId: number | string): void {
    const oldPlayerId = this.wsToPlayerId.get(ws);
    if (oldPlayerId) {
      this.playerIdToWs.delete(oldPlayerId);
    }

    this.wsToPlayerId.set(ws, playerId);
    this.playerIdToWs.set(playerId, ws);
  }

  getPlayerId(ws: WebSocket): number | string | null {
    return this.wsToPlayerId.get(ws) ?? null;
  }

  getWebSocket(playerId: number | string): WebSocket | null {
    return this.playerIdToWs.get(playerId) ?? null;
  }

  removeConnection(ws: WebSocket): void {
    const playerId = this.wsToPlayerId.get(ws);
    if (playerId) {
      this.playerIdToWs.delete(playerId);
    }
    this.wsToPlayerId.delete(ws);
  }

  generateGamePlayerId(): number {
    return this.gamePlayerIdCounter++;
  }
}
