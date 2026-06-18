import { GameEngine } from '../core/gameEngine.js';
import { CpuController } from '../cpu/cpuAI.js';
import { renderGame, renderRawBoard, renderPiecePreview } from '../render/canvasRenderer.js';
import { socketClient } from '../net/socketClient.js';
import { showResult } from './resultView.js';

const CELL_SIZE = 25;
const PREVIEW_CELL_SIZE = 20;
const DAS_DELAY = 200;
const ARR_INTERVAL = 50;
const STATE_BROADCAST_INTERVAL = 100;

let appRef = null;
let mode = null; // 'cpu' | 'online'
let selfEngine = null;
let cpuEngine = null;
let cpuController = null;
let lastDifficulty = 'normal';

let ctxSelf, ctxOpponent, ctxHold, ctxNext;

let animationFrameId = null;
let lastTimestamp = null;
let onlineStateInterval = null;
let resultShown = false;

const keysDown = {};
const dasTimers = {};

let opponentBoardSnapshot = null;
let opponentScore = 0;

export function initGameView(app) {
  appRef = app;
  ctxSelf = document.getElementById('canvas-self').getContext('2d');
  ctxOpponent = document.getElementById('canvas-opponent').getContext('2d');
  ctxHold = document.getElementById('canvas-hold').getContext('2d');
  ctxNext = document.getElementById('canvas-next').getContext('2d');

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  socketClient.on('game:opponentState', (payload) => {
    opponentBoardSnapshot = payload.board;
    opponentScore = payload.score;
  });

  socketClient.on('game:incomingGarbage', ({ garbageLines }) => {
    if (selfEngine) selfEngine.receiveGarbage(garbageLines);
  });

  socketClient.on('game:result', ({ result }) => {
    finishGame(result === 'win');
  });

  socketClient.on('room:opponentLeft', () => {
    if (mode === 'online' && isGameViewActive() && !resultShown) {
      finishGame(true, '相手が退室しました');
    }
  });
}

function isGameViewActive() {
  return document.getElementById('view-game').classList.contains('active');
}

export function startCpuGame(difficulty) {
  mode = 'cpu';
  lastDifficulty = difficulty;
  resultShown = false;
  const seed = Math.floor(Math.random() * 2147483647);
  selfEngine = new GameEngine({ seed: seed + 1 });
  cpuEngine = new GameEngine({ seed: seed + 2 });
  cpuController = new CpuController(cpuEngine, difficulty);
  document.getElementById('opponent-label').textContent = 'CPU';
  appRef.showView('game');
  startLoop();
}

export function startOnlineGame({ seed }) {
  mode = 'online';
  resultShown = false;
  selfEngine = new GameEngine({ seed });
  cpuEngine = null;
  cpuController = null;
  opponentBoardSnapshot = null;
  opponentScore = 0;
  document.getElementById('opponent-label').textContent = '相手';
  appRef.showView('game');
  startLoop();

  onlineStateInterval = setInterval(() => {
    if (!selfEngine || selfEngine.gameOver) return;
    socketClient.emit('game:state', {
      board: selfEngine.getVisibleBoard(),
      score: selfEngine.score,
    });
  }, STATE_BROADCAST_INTERVAL);
}

export function stopGame() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
  lastTimestamp = null;
  if (onlineStateInterval) {
    clearInterval(onlineStateInterval);
    onlineStateInterval = null;
  }
}

function startLoop() {
  lastTimestamp = null;
  function loop(timestamp) {
    if (lastTimestamp === null) lastTimestamp = timestamp;
    const deltaMs = Math.min(timestamp - lastTimestamp, 100);
    lastTimestamp = timestamp;
    tick(deltaMs);
    animationFrameId = requestAnimationFrame(loop);
  }
  animationFrameId = requestAnimationFrame(loop);
}

function tick(deltaMs) {
  if (!selfEngine || resultShown) return;

  processDas(deltaMs);

  const softDropActive = !!keysDown['ArrowDown'];
  selfEngine.update(deltaMs, softDropActive);

  if (selfEngine.lastAttackSent > 0) {
    const attack = selfEngine.lastAttackSent;
    selfEngine.lastAttackSent = 0;
    if (mode === 'cpu' && cpuEngine) {
      cpuEngine.receiveGarbage(attack);
    } else if (mode === 'online') {
      socketClient.emit('game:attack', { garbageLines: attack });
    }
  }

  if (mode === 'cpu' && cpuEngine && cpuController) {
    cpuController.update(deltaMs);
    // CPUが思考中は重力・ロック遅延を進めない(考え終わる前に勝手にロックされて
    // 評価関数を無視した配置になってしまうのを防ぐ)
    if (!cpuController.isThinking()) {
      cpuEngine.update(deltaMs, false);
    }
    if (cpuEngine.lastAttackSent > 0) {
      selfEngine.receiveGarbage(cpuEngine.lastAttackSent);
      cpuEngine.lastAttackSent = 0;
    }
  }

  render();
  checkGameOver();
}

function render() {
  renderGame(ctxSelf, selfEngine, CELL_SIZE);
  document.getElementById('self-score').textContent = selfEngine.score;

  if (mode === 'cpu' && cpuEngine) {
    renderGame(ctxOpponent, cpuEngine, CELL_SIZE);
    document.getElementById('opponent-score').textContent = cpuEngine.score;
  } else if (mode === 'online') {
    if (opponentBoardSnapshot) {
      renderRawBoard(ctxOpponent, opponentBoardSnapshot, CELL_SIZE);
    }
    document.getElementById('opponent-score').textContent = opponentScore;
  }

  renderPiecePreview(ctxHold, selfEngine.hold, PREVIEW_CELL_SIZE);
  renderPiecePreview(ctxNext, selfEngine.nextQueue[0], PREVIEW_CELL_SIZE);
}

function checkGameOver() {
  if (resultShown) return;
  if (mode === 'cpu') {
    if (selfEngine.gameOver) {
      finishGame(false);
    } else if (cpuEngine.gameOver) {
      finishGame(true);
    }
  } else if (mode === 'online') {
    if (selfEngine.gameOver) {
      socketClient.emit('game:gameover');
    }
  }
}

function finishGame(won, reasonText) {
  if (resultShown) return;
  resultShown = true;
  stopGame();
  const selfScore = selfEngine ? selfEngine.score : 0;
  const oppScore = mode === 'cpu' && cpuEngine ? cpuEngine.score : opponentScore;

  showResult(appRef, {
    won,
    selfScore,
    opponentScore: oppScore,
    retryLabel: mode === 'cpu' ? 'もう一度' : 'ロビーへ戻る',
    retryFn: () => {
      if (mode === 'cpu') {
        startCpuGame(lastDifficulty);
      } else {
        socketClient.emit('room:leave');
        if (appRef.resetLobby) appRef.resetLobby();
        appRef.showView('lobby');
      }
    },
  });
}

function handleKeyDown(e) {
  if (!selfEngine || resultShown || !isGameViewActive()) return;
  if (keysDown[e.code]) return;
  keysDown[e.code] = true;

  switch (e.code) {
    case 'ArrowLeft':
      selfEngine.tryMove(-1, 0);
      dasTimers.ArrowLeft = { elapsed: 0, fired: false };
      break;
    case 'ArrowRight':
      selfEngine.tryMove(1, 0);
      dasTimers.ArrowRight = { elapsed: 0, fired: false };
      break;
    case 'ArrowUp':
    case 'KeyX':
      selfEngine.tryRotate(1);
      break;
    case 'KeyZ':
      selfEngine.tryRotate(-1);
      break;
    case 'Space':
      e.preventDefault();
      selfEngine.hardDrop();
      break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      selfEngine.holdPiece();
      break;
    default:
      break;
  }
}

function handleKeyUp(e) {
  keysDown[e.code] = false;
  delete dasTimers[e.code];
}

function processDas(deltaMs) {
  for (const key of ['ArrowLeft', 'ArrowRight']) {
    if (!keysDown[key]) continue;
    const timer = dasTimers[key];
    if (!timer) continue;
    timer.elapsed += deltaMs;
    if (!timer.fired) {
      if (timer.elapsed >= DAS_DELAY) {
        timer.fired = true;
        timer.elapsed = 0;
      }
    } else if (timer.elapsed >= ARR_INTERVAL) {
      timer.elapsed = 0;
      selfEngine.tryMove(key === 'ArrowLeft' ? -1 : 1, 0);
    }
  }
}
