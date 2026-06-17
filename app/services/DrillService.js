// =======================================================
// DRILL SERVICE — block 1: the footwork engine (auto-running).
// Cues play on their own timers; the student follows along. Every cycle is
// generated in valid order: BACK(1+) -> IN(1+) -> KICK(L/R) -> RESET, which
// trains: defend back, re-enter, THEN kick, then reset.
//
// Difficulty ramps by elapsed time through PHASES (LEVEL 1 -> 3).
//
// Lifecycle: start() ... runs itself ... -> onComplete(cycles) when the clock
// runs out. Quitting is handled by the caller via stop() + onQuit.
// =======================================================
import {
  SESSION_MS, PHASES, CUE, COUNTDOWN, COUNTDOWN_MS, debug
} from "../data/config.js";
import { ri } from "../utils/rng.js";
import { sound } from "../utils/audio.js";
import { $, show } from "../ui/screens.js";
import { fmt, setBar, paintStage } from "../ui/render.js";

// The footwork screen's cue elements (fed to paintStage).
const STAGE = { arrow: "cueArrow", text: "cueText", sub: "cueSub", fill: "cueFill" };

export class DrillService {
  constructor(state) {
    this.state = state;
    this.session = null;
    this.onComplete = function () {}; // set by main: receives cycle count
  }

  start() {
    this.state.ensureStarted();
    sound.unlock(); // we're inside the Start click, so audio can begin now

    this.session = {
      startTime: 0, endsAt: 0, queue: [], cycles: 0,
      tickId: null, cueTimeout: null, finished: false
    };
    $("cycleCount").textContent = "0";
    $("timer").textContent = "10:00";
    setBar("timeFill", 0);
    $("phasePill").textContent = "GET READY";
    show("train");
    this.runCountdown(0);
  }

  // 3 · 2 · 1 · GO! lead-in, then the drill begins.
  runCountdown(i) {
    if (!this.session) return;
    if (i >= COUNTDOWN.length) { this.beginDrill(); return; }
    const cms = COUNTDOWN_MS / debug.speed;
    paintStage(STAGE, { icon: "⛏️", text: COUNTDOWN[i], sub: "GET READY", color: "var(--accent)" }, cms);
    sound.beep(i < COUNTDOWN.length - 1 ? 440 : 660);
    this.session.cueTimeout = setTimeout(() => this.runCountdown(i + 1), cms);
  }

  beginDrill() {
    this.session.startTime = Date.now();
    this.session.endsAt = this.session.startTime + SESSION_MS / debug.speed;
    this.tick();
    this.session.tickId = setInterval(() => this.tick(), 250);
    this.nextCue();
  }

  elapsed() {
    return Date.now() - this.session.startTime;
  }

  // Which level applies right now (forced override wins; else by elapsed time).
  phaseFor(elapsed) {
    if (debug.forced !== null) return PHASES[debug.forced];
    const e = elapsed * debug.speed; // keep transitions proportional under speed
    for (let i = 0; i < PHASES.length; i++) {
      if (e >= PHASES[i].at) return PHASES[i];
    }
    return PHASES[PHASES.length - 1];
  }

  // Build one valid cycle of cues for the given level. On levels that allow it,
  // the kick is sometimes a DOUBLE KICK (combo) instead of a single kick.
  generateCycle(p) {
    const cues = [];
    for (let n = ri(1, p.backMax); n > 0; n--) cues.push("BACK");
    for (let n = ri(1, p.inMax); n > 0; n--) cues.push("IN");
    if (p.doubleKick && Math.random() < 0.5) {
      cues.push("DOUBLE_KICK");
    } else {
      cues.push(Math.random() < 0.5 ? "KICK_LEFT" : "KICK_RIGHT");
    }
    cues.push("RESET");
    return cues;
  }

  updatePill() {
    const p = this.session ? this.phaseFor(this.elapsed()) : PHASES[PHASES.length - 1];
    $("phasePill").textContent = (debug.forced !== null ? "🔒 " : "") + p.label;
  }

  // The 250ms heartbeat: update the clock + bar, and end when time's up.
  tick() {
    if (!this.session) return;
    const remaining = this.session.endsAt - Date.now();
    $("timer").textContent = fmt(remaining);
    setBar("timeFill", (this.elapsed() / (SESSION_MS / debug.speed)) * 100);
    this.updatePill();

    if (remaining <= 0 && !this.session.finished) {
      this.session.finished = true;
      this.finish();
    }
  }

  // Show the next cue, refilling the queue with a fresh cycle when empty.
  nextCue() {
    if (!this.session || this.session.finished) return;

    const p = this.phaseFor(this.elapsed());
    if (!this.session.queue.length) this.session.queue = this.generateCycle(p);

    const name = this.session.queue.shift();
    if (name === "RESET") $("cycleCount").textContent = ++this.session.cycles;

    const dur = (p.cue + (p.jitter ? ri(0, p.jitter) : 0)) / debug.speed;
    const cue = CUE[name];
    paintStage(STAGE, { icon: cue.arrow, text: cue.text, sub: cue.sub, color: cue.color }, dur);
    sound.beep(cue.tone);
    this.session.cueTimeout = setTimeout(() => this.nextCue(), dur);
  }

  finish() {
    const cycles = this.session.cycles;
    this.stop();
    this.onComplete(cycles);
  }

  // Halt all timers (used on natural finish and on quit).
  stop() {
    if (!this.session) return;
    clearInterval(this.session.tickId);
    clearTimeout(this.session.cueTimeout);
    this.session = null;
  }
}
