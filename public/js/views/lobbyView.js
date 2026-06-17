import { socketClient } from '../net/socketClient.js';

export function initLobbyView(app) {
  const errorEl = document.getElementById('lobby-error');
  const waitingPanel = document.getElementById('lobby-waiting');
  const roomCodeEl = document.getElementById('lobby-room-code');
  const statusEl = document.getElementById('lobby-status');
  const inputCode = document.getElementById('input-room-code');

  let currentRoomCode = null;

  function resetLobby() {
    errorEl.textContent = '';
    waitingPanel.classList.add('hidden');
    inputCode.value = '';
    currentRoomCode = null;
  }

  document.getElementById('btn-room-create').addEventListener('click', () => {
    resetLobby();
    if (!socketClient.socket) socketClient.connect();
    socketClient.emit('room:create');
  });

  document.getElementById('btn-room-join').addEventListener('click', () => {
    const code = inputCode.value.trim().toUpperCase();
    errorEl.textContent = '';
    if (!code) return;
    if (!socketClient.socket) socketClient.connect();
    socketClient.emit('room:join', { roomCode: code });
  });

  document.getElementById('btn-lobby-back').addEventListener('click', () => {
    if (currentRoomCode) socketClient.emit('room:leave');
    resetLobby();
    app.showView('title');
  });

  socketClient.on('room:created', ({ roomCode }) => {
    currentRoomCode = roomCode;
    waitingPanel.classList.remove('hidden');
    roomCodeEl.textContent = roomCode;
    statusEl.textContent = '対戦相手を待っています…';
  });

  socketClient.on('room:joined', ({ roomCode }) => {
    currentRoomCode = roomCode;
    waitingPanel.classList.remove('hidden');
    roomCodeEl.textContent = roomCode;
    statusEl.textContent = '対戦相手が見つかりました。開始準備中…';
    socketClient.emit('player:ready');
  });

  socketClient.on('room:error', ({ message }) => {
    errorEl.textContent = message;
  });

  socketClient.on('room:opponentLeft', () => {
    if (document.getElementById('view-lobby').classList.contains('active')) {
      statusEl.textContent = '相手が退室しました';
    }
  });

  socketClient.on('game:start', ({ seed }) => {
    app.startOnlineGame({ seed, roomCode: currentRoomCode });
  });

  app.resetLobby = resetLobby;
}
