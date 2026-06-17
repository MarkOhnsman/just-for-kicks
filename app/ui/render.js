// =======================================================
// RENDER — the "view" layer. Everything that paints pixels lives here so the
// services can stay focused on timing/logic. Functions here only READ state;
// they never change it.
// =======================================================
import { $, show } from "./screens.js";
import { TOTAL_DAYS } from "../data/config.js";
import { todayStr } from "../utils/rng.js";

// ---- shared formatting ----

// Milliseconds -> "m:ss" (clamped at 0).
export function fmt(ms) {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

// Set a horizontal progress bar's width (0–100%).
export function setBar(id, pct) {
  $(id).style.width = Math.min(100, Math.max(0, pct)) + "%";
}

// ---- shared "cue stage" painter ----
// The footwork and strength screens both show: an emoji, a big word (in a
// colour), a sub-line, and a countdown bar that drains over `ms`. This paints
// all of that in one place.
//   els:   { arrow, text, sub, fill } element ids
//   frame: { icon, text, sub, color }
//   ms:    bar duration; 0 = no animation (bar stays full)
export function paintStage(els, frame, ms) {
  // `icon` is normally an emoji, but a ".png"/image path is shown as a picture.
  const arrowEl = $(els.arrow);
  if (/\.(png|jpe?g|gif|svg|webp)$/i.test(frame.icon)) {
    arrowEl.innerHTML = '<img class="cue-img" src="' + frame.icon + '" alt="' + frame.text + '">';
  } else {
    arrowEl.textContent = frame.icon;
  }
  const textEl = $(els.text);
  textEl.textContent = frame.text;
  if (frame.color) textEl.style.color = frame.color;
  $(els.sub).textContent = frame.sub;

  const bar = $(els.fill);
  bar.style.transition = "none";
  bar.style.width = "100%";
  void bar.offsetWidth; // force reflow so the next transition actually runs
  if (ms > 0) {
    bar.style.transition = "width " + ms + "ms linear";
    bar.style.width = "0%";
  }
}

// Build a "here's what's coming" preview list for a block's ready screen:
// each move as emoji + name + its short description, so the kid (and parent)
// knows the moves before starting instead of guessing them mid-set.
export function renderMoveList(id, moves) {
  const el = $(id);
  if (!el) return;
  el.innerHTML = moves
    .map(
      (m) =>
        '<li class="move-item">' +
        '<span class="move-emoji">' + m.emoji + "</span>" +
        '<span class="move-info">' +
        '<span class="move-name">' + m.name + "</span>" +
        '<span class="move-desc">' + m.sub + "</span>" +
        "</span></li>"
    )
    .join("");
}

// Drive a numeric "m:ss" countdown inside one element. Returns the interval id
// so the caller can stop it early; it also clears itself when it hits zero.
export function startCountdown(timerId, ms) {
  const endAt = Date.now() + ms;
  $(timerId).textContent = fmt(ms);
  const id = setInterval(function () {
    const rem = endAt - Date.now();
    $(timerId).textContent = fmt(rem);
    if (rem <= 0) clearInterval(id);
  }, 200);
  return id;
}

// ---- HOME screen ----

// Render the whole home screen for the current state, then show it.
// Returns true if the day is locked (already trained today) so callers can
// react if needed.
export function renderHome(state) {
  if (state.currentDay > TOTAL_DAYS) {
    show("allDone");
    return false;
  }

  const day = state.currentDay;
  $("homeDay").textContent = day;
  $("homeDayLabel").textContent = "DAY " + day + " / " + TOTAL_DAYS;

  // Locked until tomorrow if a day was already completed today.
  const locked = state.lastCompletedDate === todayStr();
  const btn = $("startBtn");
  const note = $("homeNote");
  btn.disabled = locked;

  if (locked) {
    btn.textContent = "✅ Done for today";
    note.className = "note warn";
    note.innerHTML =
      "You finished today's training. <b>Day " + day +
      "</b> unlocks tomorrow — come back and keep the streak going!";
  } else {
    btn.textContent = "Start Training";
    note.className = "note";
    note.innerHTML =
      "Three blocks (~25 min): <b>footwork</b> → <b>plyo strength</b> → " +
      "<b>AMRAP</b>. Finish all three to complete the day — <b>one block per day</b>.";
  }

  renderDiamonds(state);
  renderScores(state);
  renderDots(state, day);
  show("home");
  return locked;
}

// Paint the 💎 tally into the given element (home + scoreboard share this).
function paintDiamonds(el, state) {
  if (!el) return;
  const n = state.diamonds || 0;
  el.innerHTML =
    '<span class="dia-gem">💎</span> ' + n + " diamond" + (n === 1 ? "" : "s");
}

function renderDiamonds(state) {
  paintDiamonds($("homeDiamonds"), state);
}

// Build the AMRAP high-score markup, best first. `limit` of 0 = show all.
function scoresHtml(state, limit) {
  const bests = state.amrapBests || {};
  const names = Object.keys(bests);
  if (!names.length) return "";

  names.sort((a, b) => bests[b] - bests[a]);
  const rows = (limit ? names.slice(0, limit) : names)
    .map((n) => {
      // Find the unit this move was last logged with (defaults to "reps").
      let unit = "reps";
      for (let i = state.amrapHistory.length - 1; i >= 0; i--) {
        if (state.amrapHistory[i].name === n) {
          unit = state.amrapHistory[i].unit;
          break;
        }
      }
      return (
        '<div class="score-row"><span class="score-name">' + n + "</span>" +
        '<span class="score-val">🏆 ' + bests[n] + " " + unit + "</span></div>"
      );
    })
    .join("");
  return '<div class="scores-title">⚡ AMRAP HIGH SCORES</div>' + rows;
}

// Top 5 AMRAP personal bests on the home screen.
export function renderScores(state) {
  const el = $("homeScores");
  if (el) el.innerHTML = scoresHtml(state, 5);
}

// ---- SCOREBOARD screen ----
// Full records list + the diamond tally with the parent-gated edit buttons.
export function renderScoreboard(state) {
  paintDiamonds($("sbDiamonds"), state);
  $("diaEditor").classList.remove("show"); // never reopen pre-filled
  const el = $("sbScores");
  if (el) {
    el.innerHTML =
      scoresHtml(state, 0) ||
      '<div class="scores-title">No records yet — finish an AMRAP!</div>';
  }
  show("scoreboard");
}

function renderDots(state, day) {
  const dots = $("dots");
  dots.innerHTML = "";
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const dot = document.createElement("div");
    dot.className = "dot";
    if (state.completedDays[d]) {
      dot.classList.add("done");
      dot.textContent = "✓";
    } else if (d === day) {
      dot.classList.add("current");
      dot.textContent = d;
    } else {
      dot.textContent = d;
    }
    dots.appendChild(dot);
  }
}

// ---- DONE screen ----
// `result` = { day, cycles, amrap } gathered across the three blocks.
export function renderDone(result) {
  let html =
    "Day " + result.day + " done · " + result.day + " / " + TOTAL_DAYS + " ⛏️" +
    "<br>" + result.cycles + " footwork cycles";

  const am = result.amrap;
  if (am) {
    html += "<br>🔥 " + am.reps + " " + am.unit + " · " + am.name;
    html += am.isPB ? " 🏆 NEW HIGH SCORE!" : " (best " + am.best + ")";
    if (am.isPB) html += "<br>💎 Diamond earned! · " + am.diamonds + " total";
  }
  $("doneStreak").innerHTML = html;
  show("done");
}
