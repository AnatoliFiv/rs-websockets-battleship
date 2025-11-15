import { WebSocketServer, WebSocket } from 'ws';
import type { RequestMessage, ResponseMessage } from '../types/index.js';

const WS_PORT = 3000;

export class WSServer {
  private readonly wss: WebSocketServer;
  private readonly port: number;
  private readonly clients: Set<WebSocket>;

  constructor(port: number = WS_PORT) {
    this.port = port;
    this.wss = new WebSocketServer({ port: this.port });
    this.clients = new Set<WebSocket>();
    this.setupEventHandlers();
    this.printServerInfo();
  }

  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    this.wss.on('error', (error: Error) => {
      console.error('[WebSocket] Server error:', error.message);
    });
  }

  private handleConnection(ws: WebSocket): void {
    this.clients.add(ws);

    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    ws.on('error', () => {
      this.handleDisconnection(ws);
    });
  }

  private handleMessage(ws: WebSocket, data: Buffer): void {
    try {
      const messageStr = data.toString();
      const message: RequestMessage = JSON.parse(messageStr);

      if (!this.isValidMessage(message)) {
        console.log(`[Command] ${messageStr}`);
        console.log('[Result] Error: Invalid message format');
        return;
      }

      console.log(`[Command] ${message.type}`);
      console.log(`[Result] ${message.type}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`[Command] ${data.toString()}`);
      console.log(`[Result] Error: ${errorMessage}`);
    }
  }

  private isValidMessage(message: unknown): message is RequestMessage {
    if (typeof message !== 'object' || message === null) {
      return false;
    }

    const msg = message as Record<string, unknown>;

    return (
      typeof msg.type === 'string' &&
      (typeof msg.data === 'string' || typeof msg.data === 'object') &&
      msg.id === 0
    );
  }

  private handleDisconnection(ws: WebSocket): void {
    if (this.clients.has(ws)) {
      this.clients.delete(ws);
    }
  }

  private printServerInfo(): void {
    console.log('WebSocket Server Parameters:');
    console.log(`Port: ${this.port}`);
    console.log(`URL: ws://localhost:${this.port}`);
  }

  public getServer(): WebSocketServer {
    return this.wss;
  }

  public getClients(): Set<WebSocket> {
    return this.clients;
  }

  public sendToClient(ws: WebSocket, message: ResponseMessage): boolean {
    try {
      if (ws.readyState !== WebSocket.OPEN) {
        return false;
      }

      const messageStr = JSON.stringify(message);
      ws.send(messageStr);
      console.log(`[Result] ${message.type}`);
      return true;
    } catch {
      return false;
    }
  }

  public sendToAll(message: ResponseMessage): void {
    this.clients.forEach((client) => {
      this.sendToClient(client, message);
    });
  }

  public sendToRoom(clients: WebSocket[], message: ResponseMessage): void {
    clients.forEach((client) => {
      if (this.clients.has(client)) {
        this.sendToClient(client, message);
      }
    });
  }

  public async close(): Promise<void> {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    this.clients.clear();

    return new Promise((resolve, reject) => {
      this.wss.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
