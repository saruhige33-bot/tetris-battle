import { BOARD_WIDTH, CELL_EMPTY, CELL_GARBAGE, GARBAGE_TABLE, COMBO_BONUS_TABLE } from '../shared/constants.js';
import { cloneBoard } from './board.js';

export function calculateAttack(linesCleared, comboCount) {
  if (linesCleared === 0) return 0;
  const base = GARBAGE_TABLE[linesCleared] || 0;
  const comboIndex = Math.max(0, Math.min(comboCount, COMBO_BONUS_TABLE.length - 1));
  return base + COMBO_BONUS_TABLE[comboIndex];
}

export function insertGarbage(board, lineCount) {
  if (lineCount <= 0) return cloneBoard(board);
  const next = board.slice(lineCount).map((row) => row.slice());
  for (let i = 0; i < lineCount; i++) {
    const row = new Array(BOARD_WIDTH).fill(CELL_GARBAGE);
    row[Math.floor(Math.random() * BOARD_WIDTH)] = CELL_EMPTY;
    next.push(row);
  }
  return next;
}

export class GarbageQueue {
  constructor() {
    this.pending = 0;
  }

  receive(lines) {
    this.pending += lines;
  }

  // 自分の攻撃量(attackAmount)で保留中の受信ガベージを相殺し、
  // 相殺しきれず実際に相手へ送るべき量を返す
  cancel(attackAmount) {
    const canceled = Math.min(this.pending, attackAmount);
    this.pending -= canceled;
    return attackAmount - canceled;
  }

  // 相殺されなかった保留分を確定挿入として取り出す
  consume() {
    const lines = this.pending;
    this.pending = 0;
    return lines;
  }
}
