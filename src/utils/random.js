// ============================================================
// Seeded PRNG — Mulberry32
// Deterministic random number generation for reproducible worlds.
// ============================================================

/**
 * Hash a string to a 32-bit integer.
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

/**
 * Creates a seeded pseudo-random number generator (mulberry32).
 * @param {number|string} seed
 * @returns {function} Returns next random float in [0, 1)
 */
export function createRng(seed) {
  let s = typeof seed === 'string' ? hashString(seed) : seed;

  return function () {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Random float in [min, max).
 */
export function randRange(rng, min, max) {
  return min + rng() * (max - min);
}

/**
 * Random integer in [min, max] (inclusive).
 */
export function randInt(rng, min, max) {
  return Math.floor(randRange(rng, min, max + 1));
}

/**
 * Pick a random element from an array.
 */
export function randPick(rng, array) {
  return array[Math.floor(rng() * array.length)];
}

/**
 * Random boolean with given probability of true.
 */
export function randBool(rng, probability = 0.5) {
  return rng() < probability;
}
