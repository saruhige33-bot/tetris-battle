export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const BOARD_BUFFER = 4;
export const BOARD_TOTAL_HEIGHT = BOARD_HEIGHT + BOARD_BUFFER;

export const CELL_EMPTY = 0;
export const CELL_GARBAGE = 8;

export const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export const GARBAGE_TABLE = {
  1: 0,
  2: 1,
  3: 2,
  4: 4,
};

export const COMBO_BONUS_TABLE = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5];

export const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;

export const DIFFICULTY_PRESETS = {
  easy: { mistakeRate: 0.35, noiseSigma: 2.5, thinkDelayMs: [400, 800] },
  normal: { mistakeRate: 0.18, noiseSigma: 1.6, thinkDelayMs: [250, 600] },
  hard: { mistakeRate: 0.08, noiseSigma: 1.0, thinkDelayMs: [120, 300] },
};
