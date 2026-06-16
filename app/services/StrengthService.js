// =======================================================
// STRENGTH SERVICE — block 2: an auto-running plyometric circuit.
// The day's moves run WORK -> REST -> WORK ... for STR_ROUNDS rounds.
// Hands-free: emoji + spoken move name + a per-interval countdown bar.
//
// Starts behind a "ready" gate so the kid catches their breath, then taps to
// begin. Lifecycle: start() (ready screen) -> begin() -> ... -> onComplete().
// =======================================================
import {
  STR_WORK_MS, STR_REST_MS, STR_ROUNDS, STR_PICK, COUNTDOWN, COUNTDOWN_MS, debug
} from "../data/config.js";
import { STRENGTH_POOL } from "../data/exercises.js";
import { pickN } from "../utils/rng.js";
import { sound } from "../utils/audio.js";
import { speak } from "../utils/speech.js";
import { $, show } from "../ui/screens.js";
import { setBar, paintStage, startCountdown } from "../ui/render.js";

const STAGE = { arrow: "strArrow", text: "strText", sub: "strSub", fill: "strFill" };

export class StrengthService {
  constructor(state) {
    this.state = state;
    this.sess = null;
    this.onComplete = function () {};
  }

  // Show the ready/breather screen with the day's circuit summary.
  start() {
    const moves = pickN(STRENGTH_POOL, STR_PICK, this.state.currentDay * 101 + 7);
    this.sess = {
      moves,
      total: moves.length * STR_ROUNDS, // total work intervals
      done: 0,                          // work intervals finished
      round: 1,
      idx: 0,
      phase: "ready",                   // "ready" | "lead" | "work" | "rest"
      numId: null,
      stepTimeout: null
    };
    $("strRounds").textContent = STR_ROUNDS;
    $("strMoves").textContent = moves.length;
    $("strRound").textContent = 1;
    $("strMove").textContent = 1;
    setBar("strTimeFill", 0);

    show("strength");
    $("strArrow").textContent = "💪";
    $("strText").textContent = "STRENGTH";
    $("strText").style.color = "var(--ink)";
    $("strSub").textContent = moves.length + " moves × " + STR_ROUNDS + " rounds — tap when ready";
    $("strTimer").textContent = "--";
    $("strFill").style.transition = "none";
    $("strFill").style.width = "100%";
    $("strStartBtn").style.display = "inline-block";
    speak("Footwork done. Strength next. Tap start when you are ready.");
  }

  // The kid tapped "Start Strength" — kick off the circuit.
  begin() {
    if (!this.sess) return;
    this.sess.phase = "lead";
    $("strStartBtn").style.display = "none";
    this.leadIn(0);
  }

  // Paint a strength frame + its countdown bar and numeric timer.
  paint(info, ms, tone) {
    const color = this.sess && this.sess.phase === "work" ? "var(--kick)" : "var(--muted)";
    paintStage(STAGE, { icon: info.emoji, text: info.name, sub: info.sub, color }, ms);
    if (tone) sound.beep(tone);

    if (this.sess) clearInterval(this.sess.numId);
    if (ms > 0 && this.sess) {
      this.sess.numId = startCountdown("strTimer", ms);
    } else {
      $("strTimer").textContent = "--";
    }
  }

  leadIn(i) {
    if (!this.sess) return;
    if (i >= COUNTDOWN.length) { this.startWork(); return; }
    const cms = COUNTDOWN_MS / debug.speed;
    this.paint({ emoji: "⛏️", name: COUNTDOWN[i], sub: "GET READY" }, cms,
               i < COUNTDOWN.length - 1 ? 440 : 660);
    if (i === 0) speak("Get ready");
    this.sess.stepTimeout = setTimeout(() => this.leadIn(i + 1), cms);
  }

  startWork() {
    if (!this.sess) return;
    const ex = this.sess.moves[this.sess.idx];
    const w = STR_WORK_MS / debug.speed;
    this.sess.phase = "work";
    $("strRound").textContent = this.sess.round;
    $("strMove").textContent = this.sess.idx + 1;
    this.paint(ex, w, 660);
    speak(ex.say);
    this.sess.stepTimeout = setTimeout(() => {
      this.sess.done++;
      setBar("strTimeFill", (this.sess.done / this.sess.total) * 100);
      sound.beep(440);
      // No rest after the final work interval — go straight to conditioning.
      if (this.sess.round === STR_ROUNDS && this.sess.idx === this.sess.moves.length - 1) {
        this.finish();
        return;
      }
      this.startRest();
    }, w);
  }

  startRest() {
    if (!this.sess) return;
    // Work out the next move so we can preview it during the rest.
    let nIdx = this.sess.idx + 1;
    let nRound = this.sess.round;
    if (nIdx >= this.sess.moves.length) { nIdx = 0; nRound++; }
    const next = this.sess.moves[nIdx];

    const r = STR_REST_MS / debug.speed;
    this.sess.phase = "rest";
    this.paint({ emoji: "😮‍💨", name: "REST", sub: "Next: " + next.name }, r, 0);
    speak("Rest. Next, " + next.say);
    this.sess.stepTimeout = setTimeout(() => {
      this.sess.idx = nIdx;
      this.sess.round = nRound;
      this.startWork();
    }, r);
  }

  finish() {
    this.stop();
    speak("Strength done. Conditioning next.");
    this.onComplete();
  }

  stop() {
    if (!this.sess) return;
    clearInterval(this.sess.numId);
    clearTimeout(this.sess.stepTimeout);
    this.sess = null;
  }
}
