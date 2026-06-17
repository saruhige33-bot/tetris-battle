import { createRoom, joinRoom, getRoomBySocket, removePlayerFromRoom } from './rooms.js';

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('room:create', () => {
      const room = createRoom(socket.id);
      socket.join(room.code);
      socket.emit('room:created', { roomCode: room.code });
    });

    socket.on('room:join', ({ roomCode }) => {
      const code = (roomCode || '').toUpperCase().trim();
      const result = joinRoom(code, socket.id);
      if (result.error) {
        socket.emit('room:error', { message: result.error });
        return;
      }
      socket.join(code);
      const room = result.room;
      const opponentId = room.players.find((id) => id !== socket.id);
      socket.emit('room:joined', { roomCode: code, opponentId });
      if (opponentId) {
        io.to(opponentId).emit('room:joined', { roomCode: code, opponentId: socket.id });
      }
    });

    socket.on('player:ready', () => {
      const room = getRoomBySocket(socket.id);
      if (!room || room.players.length < 2) return;
      room.ready.add(socket.id);
      if (room.ready.size === 2) {
        io.to(room.code).emit('game:start', { seed: room.seed, countdown: 3 });
      }
    });

    socket.on('game:state', (payload) => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;
      const opponentId = room.players.find((id) => id !== socket.id);
      if (opponentId) {
        io.to(opponentId).emit('game:opponentState', payload);
      }
    });

    socket.on('game:attack', ({ garbageLines }) => {
      const room = getRoomBySocket(socket.id);
      if (!room || !garbageLines) return;
      const opponentId = room.players.find((id) => id !== socket.id);
      if (opponentId) {
        io.to(opponentId).emit('game:incomingGarbage', { garbageLines });
      }
    });

    socket.on('game:gameover', () => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;
      const opponentId = room.players.find((id) => id !== socket.id);
      socket.emit('game:result', { result: 'lose', reason: 'gameover' });
      if (opponentId) {
        io.to(opponentId).emit('game:result', { result: 'win', reason: 'opponent_gameover' });
      }
    });

    socket.on('room:leave', () => {
      const room = getRoomBySocket(socket.id);
      const roomCode = room ? room.code : null;
      removePlayerFromRoom(socket.id);
      if (roomCode) {
        socket.leave(roomCode);
        io.to(roomCode).emit('room:opponentLeft');
      }
    });

    socket.on('disconnect', () => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;
      const opponentId = room.players.find((id) => id !== socket.id);
      removePlayerFromRoom(socket.id);
      if (opponentId) {
        io.to(opponentId).emit('room:opponentLeft');
      }
    });
  });
}
