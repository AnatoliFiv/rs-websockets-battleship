import { httpServer } from './http_server/index.js';
import { WSServer } from './websocket/index.js';

const HTTP_PORT = 8181;

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);

const wsServer = new WSServer();

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
