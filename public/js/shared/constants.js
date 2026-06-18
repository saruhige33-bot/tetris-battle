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
  easy: { mistakeRate: 0.3, noiseSigma: 2.5, thinkDelayMs: [350, 700] },
  normal: { mistakeRate: 0.08, noiseSigma: 1.0, thinkDelayMs: [200, 500] },
  hard: { mistakeRate: 0.03, noiseSigma: 0.5, thinkDelayMs: [80, 200] },
};
