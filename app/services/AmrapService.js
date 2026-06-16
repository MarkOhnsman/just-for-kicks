// =======================================================
// AMRAP SERVICE — block 3: conditioning "as many reps as possible".
// One countable move per day; do as many reps as you can in AMRAP_MS, then
// type the count. AppState records the high score + any diamond earned.
//
// Starts behind a "ready" gate (start), then: startAmrap() -> countdown ->
// clock -> rep entry -> save() -> onComplete(result).
// =======================================================
import { AMRAP_MS, COUNTDOWN, COUNTDOWN_MS, debug } from "../data/config.js";
import { AMRAP_POOL } from "../data/exercises.js";
import { pickN } from "../utils/rng.js";
import { sound } from "../utils/audio.js";
import { speak } from "../utils/speech.js";
import { $, show } from "../ui/screens.js";
import { fmt, setBar } from "../ui/render.js";

export class AmrapService {
  constructor(state) {
    this.state = state;
    this.sess = null;
    this.onComplete = function () {}; // set by main: receives the score summary
  }

  // Show the ready screen with today's move and its current high score.
  start() {
    const ex = pickN(AMRAP_POOL, 1, this.state.currentDay * 211 + 13)[0];
    const best = this.state.amrapBests[ex.name] || 0;
    this.sess = { ex, best, running: false, finished: false, endsAt: 0, dur: 0, tickId: null, cdTimeout: null };

    show("condition");
    $("amArrow").textContent = ex.emoji;
    $("amText").textContent = ex.name;
    $("amText").classList.remove("count");
    $("amText").style.color = "var(--ink)";
    $("amSub").textContent = ex.sub;
    $("amBeat").textContent = best > 0
      ? "High score: " + best + " " + ex.unit
      : "First time — set a record!";
    $("amTimer").textContent = fmt(AMRAP_MS);
    setBar("amTimeFill", 0);
    $("amStartBtn").style.display = "inline-block";
    $("amEntry").classList.remove("show");
  }

  // The kid tapped "Start AMRAP".
  startAmrap() {
    if (!this.sess || this.sess.running) return;
    $("amStartBtn").style.display = "none";
    this.countdown(0);
  }

  countdown(i) {
    if (!this.sess) return;
    if (i >= COUNTDOWN.length) { this.begin(); return; }
    $("amText").classList.add("count");
    $("amText").style.color = "var(--gold)";
    $("amText").textContent = COUNTDOWN[i];
    $("amSub").textContent = "GET READY";
    sound.beep(i < COUNTDOWN.length - 1 ? 523 : 784);
    speak(i < COUNTDOWN.length - 1 ? COUNTDOWN[i] : "Go");
    this.sess.cdTimeout = setTimeout(() => this.countdown(i + 1), COUNTDOWN_MS / debug.speed);
  }

  begin() {
    if (!this.sess) return;
    this.sess.running = true;
    this.sess.dur = AMRAP_MS / debug.speed; // scaled clock length
    this.sess.endsAt = Date.now() + this.sess.dur;
    $("amText").classList.remove("count");
    $("amText").style.color = "var(--ink)";
    $("amArrow").textContent = this.sess.ex.emoji;
    $("amText").textContent = this.sess.ex.name;
    $("amSub").textContent = this.sess.ex.sub;
    this.tick();
    this.sess.tickId = setInterval(() => this.tick(), 200);
  }

  tick() {
    if (!this.sess) return;
    const rem = this.sess.endsAt - Date.now();
    $("amTimer").textContent = fmt(rem);
    setBar("amTimeFill", ((this.sess.dur - rem) / this.sess.dur) * 100);
    if (rem <= 0 && !this.sess.finished) {
      this.sess.finished = true;
      clearInterval(this.sess.tickId);
      this.end();
    }
  }

  // Time's up — switch to the rep-entry prompt.
  end() {
    sound.beep(440);
    sound.buzz(200);
    speak("Time! How many " + this.sess.ex.unit + "?");
    $("amArrow").textContent = "✅";
    $("amText").textContent = "TIME!";
    $("amText").style.color = "var(--gold)";
    $("amSub").textContent = "Enter your " + this.sess.ex.unit;
    $("amPrompt").textContent = "HOW MANY " + this.sess.ex.unit.toUpperCase() + "?";
    $("amTimer").textContent = "0:00";
    const inp = $("amInput");
    inp.value = "";
    $("amEntry").classList.add("show");
    inp.focus();
  }

  // Record the typed score and hand the summary back to main.
  save() {
    if (!this.sess) return;
    const ex = this.sess.ex;
    const reps = parseInt($("amInput").value, 10) || 0;
    const result = this.state.recordAmrap(reps, ex);
    if (result.isPB) speak("New high score! You earned a diamond!");
    this.sess = null;
    this.onComplete(result);
  }

  stop() {
    if (!this.sess) return;
    clearInterval(this.sess.tickId);
    clearTimeout(this.sess.cdTimeout);
    this.sess = null;
  }
}
