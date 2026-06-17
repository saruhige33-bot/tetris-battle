import { createEmptyBoard, isValidPosition, lockPiece, getDropY, getVisibleBoard } from './board.js';
import { findFullLines, clearLines } from './lineClear.js';
import { calculateAttack, insertGarbage, GarbageQueue } from './garbage.js';
import { SevenBagRandomizer } from './rng.js';
import { PIECE_COLOR_INDEX, WALL_KICKS, SPAWN_X, SPAWN_Y } from './pieces.js';

const NEXT_QUEUE_SIZE = 5;
const LOCK_DELAY_MS = 500;
const LINE_SCORE = [0, 100, 300, 500, 800];

function gravityMsForLevel(level) {
  return Math.max(80, 1000 - (level - 1) * 60);
}

export class GameEngine {
  constructor({ seed } = {}) {
    this.rng = new SevenBagRandomizer(seed);
    this.board = createEmptyBoard();
    this.nextQueue = [];
    for (let i = 0; i < NEXT_QUEUE_SIZE; i++) this.nextQueue.push(this.rng.next());
    this.hold = null;
    this.canHold = true;
    this.garbageQueue = new GarbageQueue();
    this.score = 0;
    this.combo = -1;
    this.totalLinesCleared = 0;
    this.level = 1;
    this.gameOver = false;
    this.fallTimer = 0;
    this.lockTimer = 0;
    this.isLocking = false;
    this.lastAttackSent = 0;
    this.current = null;
    this._spawnPiece();
  }

  _spawnPiece() {
    const type = this.nextQueue.shift();
    this.nextQueue.push(this.rng.next());
    this.current = { type, rotation: 0, x: SPAWN_X[type], y: SPAWN_Y };
    this.isLocking = false;
    this.lockTimer = 0;
    this.fallTimer = 0;
    if (!isValidPosition(this.board, type, 0, this.current.x, this.current.y)) {
      this.gameOver = true;
    }
  }

  tryMove(dx, dy) {
    if (this.gameOver || !this.current) return false;
    const { type, rotation, x, y } = this.current;
    const nx = x + dx;
    const ny = y + dy;
    if (isValidPosition(this.board, type, rotation, nx, ny)) {
      this.current.x = nx;
      this.current.y = ny;
      if (this.isLocking) {
        if (isValidPosition(this.board, type, rotation, nx, ny + 1)) {
          this.isLocking = false;
        }
        this.lockTimer = 0;
      }
      return true;
    }
    return false;
  }

  tryRotate(dir) {
    if (this.gameOver || !this.current) return false;
    const { type, rotation, x, y } = this.current;
    const nextRotation = (rotation + dir + 4) % 4;
    for (const [kx, ky] of WALL_KICKS) {
      const nx = x + kx;
      const ny = y + ky;
      if (isValidPosition(this.board, type, nextRotation, nx, ny)) {
        this.current.rotation = nextRotation;
        this.current.x = nx;
        this.current.y = ny;
        if (this.isLocking) {
          if (isValidPosition(this.board, type, nextRotation, nx, ny + 1)) {
            this.isLocking = false;
          }
          this.lockTimer = 0;
        }
        return true;
      }
    }
    return false;
  }

  getGhostY() {
    if (!this.current) return 0;
    const { type, rotation, x, y } = this.current;
    return getDropY(this.board, type, rotation, x, y);
  }

  hardDrop() {
    if (this.gameOver || !this.current) return;
    this.current.y = this.getGhostY();
    this._lockCurrentPiece();
  }

  holdPiece() {
    if (this.gameOver || !this.current || !this.canHold) return;
    const currentType = this.current.type;
    if (this.hold === null) {
      this.hold = currentType;
      this._spawnPiece();
    } else {
      const holdType = this.hold;
      this.hold = currentType;
      this.current = { type: holdType, rotation: 0, x: SPAWN_X[holdType], y: SPAWN_Y };
      this.isLocking = false;
      this.lockTimer = 0;
      this.fallTimer = 0;
      if (!isValidPosition(this.board, holdType, 0, this.current.x, this.current.y)) {
        this.gameOver = true;
      }
    }
    this.canHold = false;
  }

  // 相手からの攻撃を保留キューに積む（即時挿入しない）
  receiveGarbage(lines) {
    this.garbageQueue.receive(lines);
  }

  _lockCurrentPiece() {
    const { type, rotation, x, y } = this.current;
    this.board = lockPiece(this.board, type, rotation, x, y, PIECE_COLOR_INDEX[type]);
    const fullLines = findFullLines(this.board);
    const cleared = fullLines.length;
    this.board = clearLines(this.board, fullLines);
    this.lastAttackSent = 0;

    if (cleared > 0) {
      this.combo += 1;
      this.totalLinesCleared += cleared;
      this.score += (LINE_SCORE[cleared] || 0) * this.level;
      const outgoing = calculateAttack(cleared, this.combo);
      this.lastAttackSent = this.garbageQueue.cancel(outgoing);
      this.level = 1 + Math.floor(this.totalLinesCleared / 10);
    } else {
      this.combo = -1;
      const pending = this.garbageQueue.consume();
      if (pending > 0) {
        this.board = insertGarbage(this.board, pending);
      }
    }

    this.canHold = true;
    this._spawnPiece();
  }

  update(deltaMs, softDropActive) {
    if (this.gameOver || !this.current) return;
    const gravity = gravityMsForLevel(this.level);
    const speed = softDropActive ? gravity / 15 : gravity;
    this.fallTimer += deltaMs;
    if (this.fallTimer >= speed) {
      this.fallTimer = 0;
      if (!this.tryMove(0, 1)) {
        this.isLocking = true;
      } else {
        this.isLocking = false;
        this.lockTimer = 0;
      }
    }
    if (this.isLocking) {
      this.lockTimer += deltaMs;
      if (this.lockTimer >= LOCK_DELAY_MS) {
        this._lockCurrentPiece();
      }
    }
  }

  getVisibleBoard() {
    return getVisibleBoard(this.board);
  }
}
