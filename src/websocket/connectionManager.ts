import type { WebSocket } from 'ws';

interface GamePlayerMapping {
  player1Id: number | string;
  player2Id: number | string;
  idPlayer1: number | string;
  idPlayer2: number | string;
}

export class ConnectionManager {
  private readonly wsToPlayerId = new Map<WebSocket, number | string>();
  private readonly playerIdToWs = new Map<number | string, WebSocket>();
  private gamePlayerIdCounter = 1;
  private readonly gamePlayerMapping = new Map<number | string, GamePlayerMapping>();

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

  setGameMapping(gameId: number | string, player1Id: number | string, player2Id: number | string, idPlayer1: number | string, idPlayer2: number | string): void {
    this.gamePlayerMapping.set(gameId, {
      player1Id,
      player2Id,
      idPlayer1,
      idPlayer2,
    });
  }

  getPlayerIdByGamePlayerId(gameId: number | string, idPlayer: number | string): number | string | null {
    const mapping = this.gamePlayerMapping.get(gameId);
    if (!mapping) return null;

    if (idPlayer === mapping.idPlayer1) return mapping.player1Id;
    if (idPlayer === mapping.idPlayer2) return mapping.player2Id;
    return null;
  }

  getGamePlayerIdByPlayerId(gameId: number | string, playerId: number | string): number | string | null {
    const mapping = this.gamePlayerMapping.get(gameId);
    if (!mapping) return null;

    if (playerId === mapping.player1Id) return mapping.idPlayer1;
    if (playerId === mapping.player2Id) return mapping.idPlayer2;
    return null;
  }

  removeGameMapping(gameId: number | string): void {
    this.gamePlayerMapping.delete(gameId);
  }
}
