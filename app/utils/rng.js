// =======================================================
// Small pure helpers: randomness, deterministic picking, dates.
// No DOM, no app state — safe to use anywhere.
// =======================================================

// Random integer in [min, max] (inclusive).
export function ri(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Pick `n` items from `pool` deterministically from a numeric `seed`.
// Same seed -> same picks, so a given day always chooses the same moves,
// but different days differ. (Mulberry32 PRNG + Fisher-Yates shuffle.)
export function pickN(pool, n, seed) {
  const arr = pool.slice();
  let s = seed >>> 0;
  function rand() {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(n, arr.length));
}

// Today as "YYYY-MM-DD" in local time (used for the one-day-per-day lock).
export function todayStr() {
  const d = new Date();
  return (
    d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
