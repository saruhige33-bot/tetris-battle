import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerSocketHandlers } from './socketHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static(path.join(__dirname, '..', 'public')));

registerSocketHandlers(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Tetris Battle server listening on port ${PORT}`);
});
