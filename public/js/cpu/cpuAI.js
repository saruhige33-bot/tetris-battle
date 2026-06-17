import { isValidPosition, lockPiece, getDropY, getColumnHeights, countHoles, getBumpiness } from '../core/board.js';
import { findFullLines, clearLines } from '../core/lineClear.js';
import { PIECE_COLOR_INDEX } from '../core/pieces.js';
import { BOARD_WIDTH, DIFFICULTY_PRESETS } from '../shared/constants.js';

const WEIGHTS = {
  lines: 3.0,
  height: 0.5,
  holes: 4.0,
  bumpiness: 0.3,
  maxHeight: 1.0,
};

function gaussianNoise(mean, sigma) {
  const u1 = Math.max(Math.random(), 1e-9);
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + sigma * z0;
}

function evaluateBoard(board, linesCleared) {
  const heights = getColumnHeights(board);
  const aggregateHeight = heights.reduce((a, b) => a + b, 0);
  const maxHeight = Math.max(...heights);
  const holes = countHoles(board);
  const bumpiness = getBumpiness(heights);
  return (
    WEIGHTS.lines * linesCleared -
    WEIGHTS.height * aggregateHeight -
    WEIGHTS.holes * holes -
    WEIGHTS.bumpiness * bumpiness -
    WEIGHTS.maxHeight * maxHeight
  );
}

function enumeratePlacements(board, type) {
  const placements = [];
  const rotationCount = type === 'O' ? 1 : 4;
  for (let rotation = 0; rotation < rotationCount; rotation++) {
    for (let x = -2; x < BOARD_WIDTH + 2; x++) {
      if (!isValidPosition(board, type, rotation, x, 0)) continue;
      const dropY = getDropY(board, type, rotation, x, 0);
      placements.push({ type, rotation, x, y: dropY });
    }
  }
  return placements;
}

function scorePlacement(board, placement) {
  const { type, rotation, x, y } = placement;
  const locked = lockPiece(board, type, rotation, x, y, PIECE_COLOR_INDEX[type]);
  const fullLines = findFullLines(locked);
  const cleared = clearLines(locked, fullLines);
  return evaluateBoard(cleared, fullLines.length);
}

export function decideMove(board, currentType, holdType, difficultyName = 'normal') {
  const preset = DIFFICULTY_PRESETS[difficultyName] || DIFFICULTY_PRESETS.normal;
  const candidates = [];

  for (const placement of enumeratePlacements(board, currentType)) {
    candidates.push({ ...placement, useHold: false, score: scorePlacement(board, placement) });
  }

  if (holdType) {
    for (const placement of enumeratePlacements(board, holdType)) {
      candidates.push({ ...placement, useHold: true, score: scorePlacement(board, placement) });
    }
  }

  if (candidates.length === 0) return null;

  for (const c of candidates) {
    c.noisyScore = c.score + gaussianNoise(0, preset.noiseSigma);
  }
  candidates.sort((a, b) => b.noisyScore - a.noisyScore);

  if (Math.random() < preset.mistakeRate && candidates.length > 1) {
    const poolSize = Math.min(3, candidates.length);
    return candidates[Math.floor(Math.random() * poolSize)];
  }
  return candidates[0];
}

export class CpuController {
  constructor(engine, difficultyName = 'normal') {
    this.engine = engine;
    this.difficultyName = difficultyName;
    this.plan = null;
    this.thinkDelay = 0;
    this.state = 'idle';
  }

  update(deltaMs) {
    const engine = this.engine;
    if (engine.gameOver || !engine.current) return;

    if (this.state === 'idle') {
      this.state = 'thinking';
      const preset = DIFFICULTY_PRESETS[this.difficultyName] || DIFFICULTY_PRESETS.normal;
      const [minDelay, maxDelay] = preset.thinkDelayMs;
      this.thinkDelay = minDelay + Math.random() * (maxDelay - minDelay);
      this.plan = decideMove(engine.board, engine.current.type, engine.hold, this.difficultyName);
      return;
    }

    if (this.state === 'thinking') {
      this.thinkDelay -= deltaMs;
      if (this.thinkDelay <= 0) {
        this.state = 'executing';
      }
      return;
    }

    if (this.state === 'executing') {
      if (!this.plan) {
        this.state = 'idle';
        return;
      }
      this._executePlan();
    }
  }

  // 思考完了後、配置が決まったら移動・回転・ハードドロップを1フレームで完了させる。
  // 重力速度に左右されて操作が間に合わず自滅する、という不自然な弱さを避けるため。
  // CPUの強さは decideMove の評価ノイズ/ミス確率のみで表現する。
  _executePlan() {
    const engine = this.engine;
    const plan = this.plan;

    if (plan.useHold) {
      engine.holdPiece();
    }

    for (let guard = 0; guard < 4 && engine.current.rotation !== plan.rotation; guard++) {
      if (!engine.tryRotate(1)) break;
    }

    for (let guard = 0; guard < BOARD_WIDTH + 2 && engine.current.x !== plan.x; guard++) {
      if (!engine.tryMove(Math.sign(plan.x - engine.current.x), 0)) break;
    }

    engine.hardDrop();
    this.plan = null;
    this.state = 'idle';
  }
}
