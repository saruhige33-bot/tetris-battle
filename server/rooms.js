import { ROOM_CODE_CHARS, ROOM_CODE_LENGTH } from '../public/js/shared/constants.js';

const rooms = new Map();

function generateRoomCode() {
  let code;
  do {
    code = Array.from(
      { length: ROOM_CODE_LENGTH },
      () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
    ).join('');
  } while (rooms.has(code));
  return code;
}

export function createRoom(hostSocketId) {
  const code = generateRoomCode();
  const room = {
    code,
    players: [hostSocketId],
    ready: new Set(),
    seed: Math.floor(Math.random() * 2147483647),
    status: 'waiting',
  };
  rooms.set(code, room);
  return room;
}

export function joinRoom(code, socketId) {
  const room = rooms.get(code);
  if (!room) return { error: 'ルームが見つかりません' };
  if (room.players.length >= 2) return { error: 'ルームは満員です' };
  room.players.push(socketId);
  room.status = 'full';
  return { room };
}

export function getRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.players.includes(socketId)) return room;
  }
  return null;
}

export function removeRoom(code) {
  rooms.delete(code);
}

export function removePlayerFromRoom(socketId) {
  const room = getRoomBySocket(socketId);
  if (!room) return null;
  room.players = room.players.filter((id) => id !== socketId);
  room.ready.delete(socketId);
  if (room.players.length === 0) {
    removeRoom(room.code);
  }
  return room;
}
