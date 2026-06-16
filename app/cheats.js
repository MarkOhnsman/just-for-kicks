// =======================================================
// CHEATS — the window.kc test console. Testing only: skip/jump phases, edit
// progress, fast-forward timers. Type kc.help() in the dev console.
//
// installCheats() receives the live app pieces from main so this file stays a
// thin debug layer over the real services/state — it adds no game logic.
// =======================================================
import { debug, STR_PICK, TOTAL_DAYS } from "./data/config.js";
import { STRENGTH_POOL, AMRAP_POOL } from "./data/exercises.js";
import { pickN, todayStr } from "./utils/rng.js";
import { $, show, screens } from "./ui/screens.js";

export function installCheats(app) {
  const { state, drill, strength, amrap, startDay, abandonDay, completeDayNow, setForced, setSpeed, renderHome } = app;

  const kc = {
    // --- where am I ---
    get state() { return state; },
    get day() { return state.currentDay; },
    phase() {
      if (drill.session) return "footwork";
      if (strength.sess) return "strength";
      if (amrap.sess) {
        return "amrap" + (amrap.sess.finished ? " (awaiting reps)"
          : amrap.sess.running ? " (running)" : " (ready)");
      }
      return "none (home/done)";
    },

    // --- flow: skip the current phase to the next one, instantly ---
    nextPhase() {
      if (drill.session) { drill.finish(); return "footwork → strength"; }
      if (strength.sess) { strength.finish(); return "strength → conditioning"; }
      if (amrap.sess) {
        if (!amrap.sess.running) { amrap.startAmrap(); return "amrap: countdown started"; }
        if (!amrap.sess.finished) {
          amrap.sess.finished = true;
          clearInterval(amrap.sess.tickId);
          amrap.end();
          return "amrap → rep entry";
        }
        return "amrap waiting on reps — use kc.logAmrap(n)";
      }
      return "no active phase — kc.go('footwork')";
    },
    skip() { return this.nextPhase(); },

    // --- jump straight into a phase from anywhere ---
    go(which, arg) {
      state.reopenToday();
      switch (String(which)) {
        case "footwork": case "foot": startDay(); if (arg != null) kc.level(arg); return "footwork started";
        case "strength": case "str": strength.start(); return "strength started";
        case "conditioning": case "amrap": case "cond": amrap.start(); return "AMRAP ready — kc.startAmrap() or press Start";
        case "done": completeDayNow(); return "done screen (day marked complete)";
        case "home": abandonDay(); return "home";
        default: return "unknown. try: footwork | strength | amrap | done | home";
      }
    },

    // --- phase start helpers ---
    startStrength() { strength.begin(); return "strength circuit started"; },
    startAmrap() { amrap.startAmrap(); return "AMRAP countdown started"; },
    endAmrap() {
      if (!amrap.sess || !amrap.sess.running) return "AMRAP not running — kc.go('amrap') then kc.startAmrap()";
      if (!amrap.sess.finished) {
        amrap.sess.finished = true;
        clearInterval(amrap.sess.tickId);
        amrap.end();
      }
      return "AMRAP ended — enter reps or kc.logAmrap(n)";
    },
    logAmrap(n) {
      if (!amrap.sess) return "no AMRAP active — kc.go('amrap') first";
      if (amrap.sess.running && !amrap.sess.finished) {
        amrap.sess.finished = true;
        clearInterval(amrap.sess.tickId);
      }
      if (!$("amEntry").classList.contains("show")) amrap.end();
      $("amInput").value = n == null ? Math.floor(Math.random() * 25) + 10 : n;
      amrap.save();
      return "logged AMRAP score";
    },

    // --- footwork level (1=easy … 3=hard, 0/null=auto) ---
    level(n) {
      const map = { "0": null, "1": 2, "2": 1, "3": 0 };
      setForced(n == null ? null : map[String(n)]);
      return "level → " + (n == null || n === 0 ? "auto" : n);
    },

    // --- fast-forward all timers (1 = normal). Set BEFORE starting a phase. ---
    speed(x) { setSpeed(x); return "SPEED = " + debug.speed + "× (restart the current phase to apply fully)"; },

    // --- just display a screen (no logic/side-effects) ---
    screen(name) { show(name); return "showing #" + name + " — screens: " + screens.join(", "); },

    // --- day / progress management ---
    setDay(n) {
      n = Math.max(1, Math.min(TOTAL_DAYS, n | 0));
      state.currentDay = n;
      state.reopenToday();
      renderHome();
      return "currentDay = " + n;
    },
    openToday() { state.reopenToday(); renderHome(); return "today's lock cleared — Start enabled"; },
    completeDay() { completeDayNow(); return "current day marked complete"; },
    completeAll() {
      for (let d = 1; d <= TOTAL_DAYS; d++) state.completedDays[d] = todayStr();
      state.currentDay = TOTAL_DAYS + 1;
      state.lastCompletedDate = todayStr();
      state.save();
      renderHome();
      return "all " + TOTAL_DAYS + " days complete → allDone screen";
    },
    fakeScores() {
      [["SQUAT JUMPS", 28, "jumps"], ["BURPEES", 19, "reps"], ["HIGH KNEES", 55, "knees"], ["STAR JUMPS", 34, "jumps"]]
        .forEach((s) => {
          state.amrapBests[s[0]] = s[1];
          state.amrapHistory.push({ day: 1, name: s[0], reps: s[1], unit: s[2] });
        });
      state.save();
      renderHome();
      return "sample high scores added";
    },
    reset() { state.wipe(); renderHome(); return "progress wiped"; },

    // --- peek at the day's chosen exercises without running ---
    preview(day) {
      const d = day || state.currentDay;
      return {
        day: d,
        strength: pickN(STRENGTH_POOL, STR_PICK, d * 101 + 7).map((e) => e.name),
        amrap: pickN(AMRAP_POOL, 1, d * 211 + 13)[0].name
      };
    },

    help() {
      console.log([
        "%cKickCraft cheats — window.kc", "font-weight:bold;font-size:13px;color:#6aa121",
        "\n  kc.phase()              what phase is active",
        "  kc.nextPhase() / skip() finish current phase now → next",
        "  kc.go('footwork'|'strength'|'amrap'|'done'|'home')",
        "  kc.startStrength()      begin the strength circuit (from its ready screen)",
        "  kc.startAmrap()         begin the AMRAP countdown",
        "  kc.endAmrap()           stop the AMRAP clock → reps entry",
        "  kc.logAmrap(n)          enter n reps & save (random if omitted)",
        "  kc.level(1|2|3|0)       force footwork difficulty (0=auto)",
        "  kc.speed(x)             fast-forward ALL timers x× (set before a phase)",
        "  kc.screen('done')       just show a screen: " + screens.join(", "),
        "  kc.setDay(n)            jump to day n (unlocks it)",
        "  kc.openToday()          clear today's one-per-day lock",
        "  kc.completeDay()        mark current day done",
        "  kc.completeAll()        finish all 30 → allDone screen",
        "  kc.fakeScores()         populate the high-score board",
        "  kc.preview(day)         see a day's chosen exercises",
        "  kc.reset()              wipe all progress (incl. 💎)",
        "  kc.state / kc.day       inspect live state (state.diamonds = 💎 count)",
        "\n  💎 a diamond is awarded each time an AMRAP beats a stored high score.",
        "     test it: beat a score twice — e.g. kc.logAmrap(5) one day, kc.logAmrap(50) next."
      ].join("\n"));
      return "see console ↑";
    }
  };

  window.kc = kc;
  try { console.log("%cKickCraft loaded — type kc.help() for test cheats", "color:#f7c948"); } catch (e) {}
}
