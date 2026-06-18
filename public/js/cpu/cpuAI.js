import { isValidPosition, lockPiece, getDropY, getColumnHeights, countHoles, getBumpiness } from '../core/board.js';
import { findFullLines, clearLines } from '../core/lineClear.js';
import { PIECE_COLOR_INDEX } from '../core/pieces.js';
import { BOARD_WIDTH, DIFFICULTY_PRESETS } from '../shared/constants.js';

const WEIGHTS = {
  lines: 3.0,
  height: 0.8,
  holes: 6.5,
  bumpiness: 0.4,
  maxHeight: 1.5,
};

// 積み上がるほどミスを減らし、危険水域では必ず最善手を選ぶ(自滅防止)。
// SAFE_HEIGHT以下では難易度どおりのミス率、DANGER_HEIGHT以上ではミス率0、
// その間は線形に下げる。
const SAFE_HEIGHT = 4;
const DANGER_HEIGHT = 9;

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

  // 積み上がるほどミスをしなくなるようにする。どの難易度でも自滅は避け、
  // 強さの差は余裕がある場面でのミス率/ノイズだけで表現する。
  const heights = getColumnHeights(board);
  const maxHeight = Math.max(...heights);
  const dangerFactor = Math.max(0, Math.min(1, (maxHeight - SAFE_HEIGHT) / (DANGER_HEIGHT - SAFE_HEIGHT)));
  const effectiveMistakeRate = preset.mistakeRate * (1 - dangerFactor);

  if (Math.random() < effectiveMistakeRate && candidates.length > 1) {
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

  // CPUが思考中は呼び出し側でengine.update()自体を止めるべきか判定するためのフラグ。
  // 思考中も重力が進むと、考え終わる前にミノが勝手にロックされてしまい、
  // 本来の評価関数によらない劣化した配置が積み重なって不自然に自滅する。
  isThinking() {
    return this.state === 'idle' || this.state === 'thinking';
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
