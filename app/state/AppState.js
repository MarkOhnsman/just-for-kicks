// =======================================================
// APP STATE — the "model". Owns all saved data (progress, high scores,
// diamonds) and the only methods allowed to change it. Persistence to
// localStorage is built in: every mutator calls save() for you.
//
// Exported as a single shared instance (`state`) used across the app.
// =======================================================
import { STORAGE_KEY } from "../data/config.js";
import { todayStr } from "../utils/rng.js";

function freshProgram() {
  return {
    startDate: null,
    currentDay: 1,
    completedDays: {},      // { "1": "2026-06-16", ... }
    lastCompletedDate: null // "YYYY-MM-DD"
  };
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch (e) {
    return null;
  }
}

class AppState {
  constructor() {
    Object.assign(this, freshProgram(), load() || {});

    // Forward-compatible defaults — older saves won't have the score fields.
    if (!this.amrapBests) this.amrapBests = {};     // { "SQUAT JUMPS": 24, ... } best ever
    if (!this.amrapHistory) this.amrapHistory = []; // [{ day, name, reps, unit }]
    if (typeof this.diamonds !== "number") this.diamonds = 0; // 💎 for new high scores
    if (!this.diamondLog) this.diamondLog = [];     // [{ day, name, reps, count }]
  }

  save() {
    try {
      // Only persist the data fields (skip any methods/instance cruft).
      const { startDate, currentDay, completedDays, lastCompletedDate,
              amrapBests, amrapHistory, diamonds, diamondLog } = this;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        startDate, currentDay, completedDays, lastCompletedDate,
        amrapBests, amrapHistory, diamonds, diamondLog
      }));
    } catch (e) {}
  }

  // Stamp the program start date the first time the kid trains.
  ensureStarted() {
    if (!this.startDate) {
      this.startDate = new Date().toISOString();
      this.save();
    }
  }

  // Record an AMRAP result and return a summary for the done screen.
  // A "new high score" (PB) means beating an EXISTING best — a first-ever
  // score just sets the bar, so it earns no diamond.
  recordAmrap(reps, ex) {
    reps = Math.max(0, reps | 0);
    const prev = this.amrapBests[ex.name] || 0;
    const beat = reps > prev;
    const isPB = beat && prev > 0;

    this.amrapHistory.push({ day: this.currentDay, name: ex.name, reps, unit: ex.unit });
    if (beat) this.amrapBests[ex.name] = reps;
    if (isPB) {
      this.diamonds += 1;
      this.diamondLog.push({ day: this.currentDay, name: ex.name, reps, count: this.diamonds });
    }
    this.save();

    return {
      name: ex.name,
      reps,
      unit: ex.unit,
      best: this.amrapBests[ex.name] || reps,
      isPB,
      diamonds: this.diamonds
    };
  }

  // ---- diamonds: a spendable reward (earned in recordAmrap above) ----
  // The kid earns 💎 by beating high scores; a parent deducts them when they
  // get spent in real life (screen time, a treat, whatever you've agreed on).

  // Add diamonds by hand. Returns the new balance.
  addDiamonds(n) {
    this.diamonds += Math.max(0, n | 0);
    this.save();
    return this.diamonds;
  }

  // Deduct diamonds when they're spent. Never drops below zero.
  spendDiamonds(n) {
    this.diamonds = Math.max(0, this.diamonds - Math.max(0, n | 0));
    this.save();
    return this.diamonds;
  }

  // Wipe the diamond balance back to zero (keeps high scores + day progress).
  resetDiamonds() {
    this.diamonds = 0;
    this.save();
    return this.diamonds;
  }

  // Mark today's day finished and advance. Returns the day that was completed.
  completeDay() {
    const day = this.currentDay;
    this.completedDays[day] = todayStr();
    this.lastCompletedDate = todayStr();
    this.currentDay = day + 1;
    this.save();
    return day;
  }

  // Clear the one-day-per-day lock so Start is enabled again (testing/new day).
  reopenToday() {
    this.lastCompletedDate = null;
    this.save();
  }

  // ---- program-level resets ----

  // Start a fresh 30 days but KEEP lifetime high scores + diamonds.
  resetProgram() {
    Object.assign(this, freshProgram());
    this.startDate = new Date().toISOString();
    this.save();
  }

  // Wipe everything, including high scores and diamonds (cheat only).
  wipe() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    Object.assign(this, freshProgram(), {
      amrapBests: {}, amrapHistory: [], diamonds: 0, diamondLog: []
    });
    this.save();
  }
}

export const state = new AppState();
