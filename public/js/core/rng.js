import { PIECE_TYPES } from '../shared/constants.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SevenBagRandomizer {
  constructor(seed = Date.now() % 2147483647) {
    this.random = mulberry32(seed);
    this.bag = [];
  }

  fillBag() {
    const bag = [...PIECE_TYPES];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    this.bag = bag;
  }

  next() {
    if (this.bag.length === 0) this.fillBag();
    return this.bag.pop();
  }
}
