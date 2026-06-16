# KickCraft ⛏️

A Minecraft-themed, hands-free, 30-day daily training app. Each day is three
auto-running blocks (~25 min): **footwork** → **plyo strength** → **AMRAP**.

## Running it

It's plain HTML/CSS/JS — no build step — but it uses ES modules, so it must be
served over HTTP (opening `index.html` with `file://` won't load the modules):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## How the code is organized

The code follows a light MVC-style split. Each file is small and does one job.

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

  cheats.js           window.kc dev console (testing only — type kc.help())
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
