import { BOARD_WIDTH, BOARD_HEIGHT, BOARD_BUFFER, CELL_EMPTY } from '../shared/constants.js';
import { getPieceCells, PIECE_COLOR_INDEX } from '../core/pieces.js';

const COLORS = {
  0: '#1f2937',
  1: '#22d3ee',
  2: '#facc15',
  3: '#a855f7',
  4: '#22c55e',
  5: '#ef4444',
  6: '#3b82f6',
  7: '#f97316',
  8: '#6b7280',
};

function drawCell(ctx, col, row, cellSize, color) {
  const x = col * cellSize;
  const y = row * cellSize;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, cellSize, cellSize);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.strokeRect(x, y, cellSize, cellSize);
}

export function renderGame(ctx, engine, cellSize) {
  const width = BOARD_WIDTH * cellSize;
  const height = BOARD_HEIGHT * cellSize;
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, width, height);

  const visibleBoard = engine.getVisibleBoard();
  for (let r = 0; r < BOARD_HEIGHT; r++) {
    for (let c = 0; c < BOARD_WIDTH; c++) {
      const cell = visibleBoard[r][c];
      if (cell !== CELL_EMPTY) {
        drawCell(ctx, c, r, cellSize, COLORS[cell]);
      }
    }
  }

  if (engine.gameOver || !engine.current) return;

  const { type, rotation, x, y } = engine.current;
  const colorIndex = PIECE_COLOR_INDEX[type];
  const cells = getPieceCells(type, rotation);
  const ghostY = engine.getGhostY();

  ctx.globalAlpha = 0.3;
  for (const [cx, cy] of cells) {
    const row = ghostY + cy - BOARD_BUFFER;
    const col = x + cx;
    if (row >= 0) drawCell(ctx, col, row, cellSize, COLORS[colorIndex]);
  }
  ctx.globalAlpha = 1;

  for (const [cx, cy] of cells) {
    const row = y + cy - BOARD_BUFFER;
    const col = x + cx;
    if (row >= 0) drawCell(ctx, col, row, cellSize, COLORS[colorIndex]);
  }
}

export function renderRawBoard(ctx, board, cellSize) {
  const width = BOARD_WIDTH * cellSize;
  const height = BOARD_HEIGHT * cellSize;
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, width, height);
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const cell = board[r][c];
      if (cell !== CELL_EMPTY) {
        drawCell(ctx, c, r, cellSize, COLORS[cell]);
      }
    }
  }
}

export function renderPiecePreview(ctx, type, cellSize) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, width, height);
  if (!type) return;
  const cells = getPieceCells(type, 0);
  const colorIndex = PIECE_COLOR_INDEX[type];
  const maxX = Math.max(...cells.map(([cx]) => cx));
  const maxY = Math.max(...cells.map(([, cy]) => cy));
  const offsetX = (width / cellSize - (maxX + 1)) / 2;
  const offsetY = (height / cellSize - (maxY + 1)) / 2;
  for (const [cx, cy] of cells) {
    drawCell(ctx, cx + offsetX, cy + offsetY, cellSize, COLORS[colorIndex]);
  }
}
