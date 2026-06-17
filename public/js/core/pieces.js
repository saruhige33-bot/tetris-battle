import { PIECE_TYPES } from '../shared/constants.js';

const BASE_SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [0, 0, 0, 0],
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

function rotateMatrixCW(matrix) {
  const n = matrix.length;
  const result = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      result[c][n - 1 - r] = matrix[r][c];
    }
  }
  return result;
}

function buildRotations(shape) {
  const rotations = [shape];
  for (let i = 0; i < 3; i++) {
    rotations.push(rotateMatrixCW(rotations[rotations.length - 1]));
  }
  return rotations;
}

function shapeToCells(shape) {
  const cells = [];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) cells.push([c, r]);
    }
  }
  return cells;
}

export const PIECE_COLOR_INDEX = Object.fromEntries(PIECE_TYPES.map((t, i) => [t, i + 1]));

const ROTATION_CELLS = {};
for (const type of PIECE_TYPES) {
  ROTATION_CELLS[type] = buildRotations(BASE_SHAPES[type]).map(shapeToCells);
}

export function getPieceCells(type, rotation) {
  return ROTATION_CELLS[type][((rotation % 4) + 4) % 4];
}

export const WALL_KICKS = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, -1],
  [1, -1],
  [-1, -1],
  [2, 0],
  [-2, 0],
];

export const SPAWN_X = { I: 3, O: 3, T: 3, S: 3, Z: 3, J: 3, L: 3 };
export const SPAWN_Y = 0;
