// =======================================================
// MAIN — the app entry point and orchestrator.
// Builds the model + the three block services, wires every button, and owns
// the day-flow (footwork -> strength -> AMRAP -> done). The services don't
// know about each other; main is the only place that chains them together.
// =======================================================
import { state } from "./state/AppState.js";
import { DrillService } from "./services/DrillService.js";
import { StrengthService } from "./services/StrengthService.js";
import { AmrapService } from "./services/AmrapService.js";
import { renderHome, renderDone } from "./ui/render.js";
import { $ } from "./ui/screens.js";
import { sound } from "./utils/audio.js";
import { stopSpeech } from "./utils/speech.js";
import { debug } from "./data/config.js";
import { installCheats } from "./cheats.js";

// Carries each block's result into the done screen.
let progress = { cycles: 0, amrap: null };

const drill = new DrillService(state);
const strength = new StrengthService(state);
const amrap = new AmrapService(state);

// ---- the day flow ----
function startDay() {
  progress = { cycles: 0, amrap: null };
  drill.start();
}
drill.onComplete = (cycles) => { progress.cycles = cycles; strength.start(); };
strength.onComplete = () => { amrap.start(); };
amrap.onComplete = (result) => {
  progress.amrap = result;
  const day = state.completeDay();
  renderDone({ day, cycles: progress.cycles, amrap: progress.amrap });
};

// Quit from any block: stop everything, count nothing, back to home.
function abandonDay() {
  drill.stop();
  strength.stop();
  amrap.stop();
  stopSpeech();
  renderHome(state);
}

// Cheat console "jump straight to the done screen" helper.
function completeDayNow() {
  progress = { cycles: 0, amrap: null };
  const day = state.completeDay();
  renderDone({ day, cycles: 0, amrap: null });
}

// ---- one sound toggle shared by every screen ----
const soundBtnIds = ["soundBtn", "strSoundBtn", "amSoundBtn"];
function renderSoundBtns() {
  soundBtnIds.forEach((id) => { const b = $(id); if (b) b.textContent = sound.on ? "🔊" : "🔇"; });
}
function toggleSound() { sound.toggle(); renderSoundBtns(); }

// ---- footwork level override (testing) ----
// Tap the pill / press 0-3 to cycle Auto -> L1 -> L2 -> L3.
// PHASES is ordered [L3, L2, L1], so L1=2, L2=1, L3=0.
const FORCE_CYCLE = [null, 2, 1, 0];
function setForced(val) { debug.forced = val; drill.updatePill(); }
function setSpeed(x) { debug.speed = x > 0 ? x : 1; }

// ---- wire up the DOM ----
const QUIT_MSG = "Quit now? This day will NOT count and you'll have to start it over.";

$("startBtn").addEventListener("click", function () { if (!this.disabled) startDay(); });
$("quitBtn").addEventListener("click", () => { if (confirm(QUIT_MSG)) abandonDay(); });
$("strQuitBtn").addEventListener("click", () => { if (confirm(QUIT_MSG)) abandonDay(); });
$("amQuitBtn").addEventListener("click", () => { if (confirm(QUIT_MSG)) abandonDay(); });
$("strStartBtn").addEventListener("click", () => strength.begin());
$("amStartBtn").addEventListener("click", () => amrap.startAmrap());
$("amSaveBtn").addEventListener("click", () => amrap.save());
$("amInput").addEventListener("keydown", (e) => { if (e.key === "Enter") amrap.save(); });
$("doneHomeBtn").addEventListener("click", () => renderHome(state));
$("resetProgramBtn").addEventListener("click", () => {
  if (confirm("Start a brand new 30-day program? Your old progress will be cleared.")) {
    state.resetProgram();
    renderHome(state);
  }
});

soundBtnIds.forEach((id) => { const b = $(id); if (b) b.addEventListener("click", toggleSound); });
renderSoundBtns();

$("phasePill").addEventListener("click", () => {
  const i = FORCE_CYCLE.indexOf(debug.forced);
  setForced(FORCE_CYCLE[(i + 1) % FORCE_CYCLE.length]);
});
document.addEventListener("keydown", (e) => {
  if (e.target && e.target.tagName === "INPUT") return; // don't hijack rep entry
  if (e.key === "0") setForced(null);
  else if (e.key === "1") setForced(2);
  else if (e.key === "2") setForced(1);
  else if (e.key === "3") setForced(0);
});

// ---- debug console + boot ----
installCheats({
  state, drill, strength, amrap,
  startDay, abandonDay, completeDayNow, setForced, setSpeed,
  renderHome: () => renderHome(state)
});

renderHome(state);
