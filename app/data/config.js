// =======================================================
// CONFIG — all the tunable numbers and lookup tables.
// Pure data only: no logic lives in this file.
// =======================================================

export const TOTAL_DAYS = 30;

// localStorage keys (kept the same as the original so old saves still load).
export const STORAGE_KEY = "tkd_footwork_v1"; // progress + scores
export const SOUND_KEY   = "tkd_sound_v1";    // sound on/off

// ---- Footwork drill (block 1) ----
export const SESSION_MS = 10 * 60 * 1000; // 10-minute session (the completion gate)

// Levels, checked newest-first by elapsed session time. Each level sets its own
// pace (cue ms + jitter) and difficulty (max BACK / IN repeats).
// `doubleKick` lets a cycle sometimes call DOUBLE KICK (two kicks off) instead
// of a single kick — trains landing a combo in sparring, not just one shot.
export const PHASES = [
  { at: 7 * 60000, label: "LEVEL 3", cue: 850,  jitter: 300, backMax: 3, inMax: 2, doubleKick: true },
  { at: 3 * 60000, label: "LEVEL 2", cue: 1300, jitter: 0,   backMax: 2, inMax: 2 },
  { at: 0,         label: "LEVEL 1", cue: 2000, jitter: 0,   backMax: 1, inMax: 1 }
];

// One cue = one move the student follows. tone is the beep pitch (Hz).
export const CUE = {
  BACK:       { arrow: "⬇️", text: "STEP BACK",  sub: "DEFEND",         color: "var(--back)",  tone: 330 },
  IN:         { arrow: "⬆️", text: "STEP IN",    sub: "RE-ENTER",       color: "var(--in)",    tone: 440 },
  KICK_LEFT:  { arrow: "left-kick.png",  text: "KICK LEFT",  sub: "ATTACK", color: "var(--kick)", tone: 660 },
  KICK_RIGHT: { arrow: "right-kick.png", text: "KICK RIGHT", sub: "ATTACK", color: "var(--kick)", tone: 660 },
  // No graphic on purpose — the big "DOUBLE KICK" word is its own thing.
  DOUBLE_KICK:{ arrow: "",  text: "DOUBLE KICK", sub: "TWO KICKS!", color: "var(--kick)", tone: 660 },
  RESET:      { arrow: "🎯", text: "RESET",      sub: "BACK TO CENTER", color: "var(--reset)", tone: 520 }
};

export const COUNTDOWN = ["3", "2", "1", "GO!"];
export const COUNTDOWN_MS = 700;

// ---- Strength (block 2): guided plyometric circuit, equipment-free ----
export const STR_WORK_MS = 30000; // work per move
export const STR_REST_MS = 18000; // rest between moves
export const STR_ROUNDS  = 2;     // times through the day's moves
export const STR_PICK    = 5;     // moves chosen for the day

// ---- Conditioning AMRAP (block 3): one move, go for a high score ----
export const AMRAP_MS = 5 * 60 * 1000; // 5-minute AMRAP

// ---- Scoreboard / diamonds ----
// A light "parent gate" on manual diamond edits — just enough to stop the kid
// from topping up their own balance. Not real security.
export const PARENT_PASSWORD = "diamond";

// =======================================================
// DEBUG knobs (the ONLY mutable export here).
// The cheat console (window.kc) flips these to test faster:
//   speed  — timer multiplier (1 = normal; higher = everything runs faster)
//   forced — footwork level override (null = auto-by-time, else PHASES index)
// Services read these wherever they schedule a timer, so set them BEFORE
// starting a phase for the cleanest effect.
// =======================================================
export const debug = { speed: 1, forced: null };
