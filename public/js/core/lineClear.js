import { BOARD_WIDTH, BOARD_TOTAL_HEIGHT, CELL_EMPTY } from '../shared/constants.js';

export function findFullLines(board) {
  const fullLines = [];
  for (let r = 0; r < BOARD_TOTAL_HEIGHT; r++) {
    if (board[r].every((cell) => cell !== CELL_EMPTY)) {
      fullLines.push(r);
    }
  }
  return fullLines;
}

export function clearLines(board, lineIndices) {
  if (lineIndices.length === 0) return board.map((row) => row.slice());
  const lineSet = new Set(lineIndices);
  const remaining = board.filter((_, idx) => !lineSet.has(idx));
  const cleared = lineIndices.map(() => new Array(BOARD_WIDTH).fill(CELL_EMPTY));
  return [...cleared, ...remaining];
}
