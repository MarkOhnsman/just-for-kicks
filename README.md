# KickCraft ⛏️

**A 30-day, hands-free footwork and conditioning game for kids.**

KickCraft turns daily martial-arts footwork training into a Minecraft-themed
quest. Each day is one short session (about 25 minutes) of three auto-running
blocks. Finish all three to complete the day, build a high-score streak, and
collect diamonds — **one day per day**, so it builds a real habit.

It's built to be **hands-free**: prop the phone up, and it calls every move
aloud, beeps the pace, and counts the clock for you — so a kid can train on
their own without staring at a screen.

---

## What a day looks like

Every day runs the same three blocks, in order. The app walks through each one
and chains straight into the next.

| | Block | What it is |
|---|---|---|
| ⛏️ | **Footwork** | A 10-minute auto-running drill. The app calls moves — *step back → step in → kick left/right → reset* — and you follow along to the beat. It speeds up and gets harder as the session goes (Level 1 → 3). |
| 💪 | **Plyo Strength** | A guided plyometric circuit (squat jumps, tuck jumps, skater hops…). It runs work → rest → work for a couple of rounds, calling each move aloud. |
| ⚡ | **AMRAP** | One move for the day — do *as many reps as possible* before the timer runs out, then type your count and try to beat your high score. |

The footwork calls get faster and the moves get harder over the 30 days.

---

## How to use it

1. **Open the app** (see *Running it* below).
2. **Make some space**, prop the phone up where you can hear it, and tap
   **Start Training**.
3. **Follow the voice.** It tells you each move, beeps the pace, runs the
   timers, and asks you to type in your AMRAP count. Just listen and move.
4. **Come back tomorrow** for the next day — one day per day keeps the streak.

Tap the 🔊 button any time to mute or unmute the sound.

---

## Tracking progress

- The **home screen** shows the current day, a row of dots for the 30-day
  streak, and the **AMRAP high-score board**.
- High scores are personal bests for each move, so you can watch the numbers
  climb over the month.

Progress is saved automatically **on the device** — no account, no internet, no
data leaves the phone.

### Diamonds 💎 — a spendable reward

Every time an AMRAP **beats an existing high score**, the kid earns a diamond (a
first-ever score just sets the bar — beat it later to earn the diamond).
Diamonds are meant to be spent in real life, so a parent can run a "store":
agree on what diamonds buy (screen time, a treat, an outing) and deduct them
when they're spent.

**Parent console** — open the browser's developer console (on a computer:
right-click → Inspect → Console) and use the `kc` console:

```js
kc.diamonds          // see the current balance
kc.spend(2)          // deduct 2 diamonds when they're spent in real life
kc.giveDiamonds(3)   // add 3 by hand
kc.resetDiamonds()   // set diamonds to 0 (keeps high scores + day progress)
kc.help()            // the full command list
```

---

## Running it

KickCraft is a plain web app (HTML, CSS, and JavaScript) — nothing to install
and no build step. Because it's split into modules, it must be *served* over a
local web address rather than opened straight from a file:

```bash
python3 -m http.server 8000
```

Then open **http://localhost:8000** in a browser (a phone on the same Wi-Fi can
open it using the computer's address). On a phone, "Add to Home Screen" makes it
feel like a real app.

---

## For developers

The code follows a light MVC-style split — small files, each doing one job.

```
index.html            the screens (markup) + <script type="module" src="app/main.js">
style.css             all styling
app/
  main.js             entry point: builds everything, wires buttons, owns the
                      day-flow (footwork → strength → AMRAP → done)

  data/               pure data — no logic
    config.js           timings, levels (PHASES), cue table, storage keys, debug knobs
    exercises.js        the strength + AMRAP move pools

  state/              the "model"
    AppState.js         all saved data (day, high scores, diamonds) + the only
                        methods allowed to change it; saves to localStorage itself

  services/           one engine per block (the "controllers")
    DrillService.js     footwork drill (cue loop + time-based levels)
    StrengthService.js  plyometric circuit (work/rest rounds)
    AmrapService.js     AMRAP clock + rep entry + scoring

  ui/                 the "view"
    screens.js          show one screen at a time; the $ id helper
    render.js           paints the home screen, the done screen, and the shared
                        "cue stage" (emoji + word + countdown bar) used by blocks

  utils/              reusable helpers (no app knowledge)
    rng.js              random int, deterministic per-day picking, today's date
    audio.js            beeps/vibration + the single shared sound on/off flag
    speech.js           spoken cues (muted by the same flag)

  cheats.js           window.kc dev + parent console (type kc.help())
```

### The main idea

- **data** never changes and holds no logic.
- **AppState** is the single source of truth for saved progress. Only its
  methods change saved data, and they persist for you.
- **services** run the timers and game logic for one block each. They don't know
  about each other — `main.js` chains them via each service's `onComplete`.
- **ui** only paints; it reads state but never changes it.
- **utils** are small and dependency-free (well, `speech` shares the mute flag).

So the flow reads top-down in `main.js`:
`startDay()` → `drill` → `strength` → `amrap` → `state.completeDay()` → done.
