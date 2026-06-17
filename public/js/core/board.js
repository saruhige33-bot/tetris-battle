import { BOARD_WIDTH, BOARD_TOTAL_HEIGHT, BOARD_BUFFER, CELL_EMPTY } from '../shared/constants.js';
import { getPieceCells } from './pieces.js';

export function createEmptyBoard() {
  return Array.from({ length: BOARD_TOTAL_HEIGHT }, () => new Array(BOARD_WIDTH).fill(CELL_EMPTY));
}

export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export function getVisibleBoard(board) {
  return board.slice(BOARD_BUFFER);
}

export function isValidPosition(board, type, rotation, x, y) {
  const cells = getPieceCells(type, rotation);
  for (const [cx, cy] of cells) {
    const boardX = x + cx;
    const boardY = y + cy;
    if (boardX < 0 || boardX >= BOARD_WIDTH) return false;
    if (boardY >= BOARD_TOTAL_HEIGHT) return false;
    if (boardY < 0) continue;
    if (board[boardY][boardX] !== CELL_EMPTY) return false;
  }
  return true;
}

export function lockPiece(board, type, rotation, x, y, colorIndex) {
  const next = cloneBoard(board);
  const cells = getPieceCells(type, rotation);
  for (const [cx, cy] of cells) {
    const boardX = x + cx;
    const boardY = y + cy;
    if (boardY >= 0 && boardY < BOARD_TOTAL_HEIGHT) {
      next[boardY][boardX] = colorIndex;
    }
  }
  return next;
}

export function getDropY(board, type, rotation, x, y) {
  let dy = y;
  while (isValidPosition(board, type, rotation, x, dy + 1)) {
    dy++;
  }
  return dy;
}

export function getColumnHeights(board) {
  const heights = new Array(BOARD_WIDTH).fill(0);
  for (let c = 0; c < BOARD_WIDTH; c++) {
    for (let r = 0; r < BOARD_TOTAL_HEIGHT; r++) {
      if (board[r][c] !== CELL_EMPTY) {
        heights[c] = BOARD_TOTAL_HEIGHT - r;
        break;
      }
    }
  }
  return heights;
}

export function countHoles(board) {
  let holes = 0;
  for (let c = 0; c < BOARD_WIDTH; c++) {
    let foundBlock = false;
    for (let r = 0; r < BOARD_TOTAL_HEIGHT; r++) {
      if (board[r][c] !== CELL_EMPTY) {
        foundBlock = true;
      } else if (foundBlock) {
        holes++;
      }
    }
  }
  return holes;
}

export function getBumpiness(heights) {
  let bumpiness = 0;
  for (let i = 0; i < heights.length - 1; i++) {
    bumpiness += Math.abs(heights[i] - heights[i + 1]);
  }
  return bumpiness;
}
