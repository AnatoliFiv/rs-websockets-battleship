import { httpServer } from './http_server/index.js';
import { WSServer, MessageRouter, ConnectionManager } from './websocket/index.js';
import { Database } from './database/index.js';

const HTTP_PORT = 8181;

httpServer.listen(HTTP_PORT);

const db = new Database();
const connectionManager = new ConnectionManager();
const wsServer = new WSServer();
const router = new MessageRouter(db, wsServer, connectionManager);
wsServer.setRouter(router);

const shutdown = async (): Promise<void> => {
  try {
    await wsServer.close();
    httpServer.close(() => {
      process.exit(0);
    });
  } catch {
    process.exit(1);
  }
};

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
