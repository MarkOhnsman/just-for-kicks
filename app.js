(function(){
  "use strict";

  /* =======================================================
     CONFIG
  ======================================================= */
  var SESSION_MS  = 10 * 60 * 1000;   // 10-minute session (the completion gate)
  var TOTAL_DAYS  = 30;
  var STORAGE_KEY = "tkd_footwork_v1";
  var SOUND_KEY   = "tkd_sound_v1";

  // Levels, checked newest-first by elapsed session time. Each level sets
  // its own pace (cue ms + jitter) and difficulty (max BACK / IN repeats).
  var PHASES = [
    { at: 7*60000, label:"LEVEL 3", cue:850,  jitter:300, backMax:3, inMax:2 },
    { at: 3*60000, label:"LEVEL 2", cue:1300, jitter:0,   backMax:2, inMax:2 },
    { at: 0,       label:"LEVEL 1", cue:2000, jitter:0,   backMax:1, inMax:1 }
  ];

  var COUNTDOWN = ["3","2","1","GO!"];
  var COUNTDOWN_MS = 700;

  /* =======================================================
     STATE / STORAGE  (localStorage only)
  ======================================================= */
  function todayStr(){
    var d = new Date();
    return d.getFullYear() + "-" +
           String(d.getMonth()+1).padStart(2,"0") + "-" +
           String(d.getDate()).padStart(2,"0");
  }

  function loadState(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch(e){}
    return null;
  }
  function saveState(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e){}
  }

  var state = loadState() || {
    startDate: null,
    currentDay: 1,
    completedDays: {},        // { "1": "2026-06-16", ... }
    lastCompletedDate: null   // "YYYY-MM-DD"
  };

  var soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "off"; } catch(e){}

  /* =======================================================
     SCREENS
  ======================================================= */
  var screens = ["home","train","done","allDone"];
  function show(name){
    screens.forEach(function(s){
      document.getElementById(s).classList.toggle("active", s===name);
    });
  }
  function $(id){ return document.getElementById(id); }

  /* =======================================================
     HOME
  ======================================================= */
  function renderHome(){
    if(state.currentDay > TOTAL_DAYS){ show("allDone"); return; }

    var day = state.currentDay;
    $("homeDay").textContent = day;
    $("homeDayLabel").textContent = "DAY " + day + " / " + TOTAL_DAYS;

    // Locked until tomorrow if a day was already completed today.
    var locked = (state.lastCompletedDate === todayStr());
    var btn = $("startBtn"), note = $("homeNote");
    btn.disabled = locked;

    if(locked){
      btn.textContent = "✅ Done for today";
      note.className = "note warn";
      note.innerHTML = "You finished today's training. <b>Day " + day +
        "</b> unlocks tomorrow — come back and keep the streak going!";
    } else {
      btn.textContent = "Start 10-Min Training";
      note.className = "note";
      note.innerHTML = "Follow the cues for the full <b>10 minutes</b> to complete the day. " +
        "You can only do <b>one day per day</b>.";
    }

    var dots = $("dots");
    dots.innerHTML = "";
    for(var d=1; d<=TOTAL_DAYS; d++){
      var dot = document.createElement("div");
      dot.className = "dot";
      if(state.completedDays[d]){ dot.classList.add("done"); dot.textContent = "✓"; }
      else if(d === day){ dot.classList.add("current"); dot.textContent = d; }
      else { dot.textContent = d; }
      dots.appendChild(dot);
    }
    show("home");
  }

  /* =======================================================
     DRILL ENGINE (auto-running)
     Cues play on their own timers; the student follows along.
     Every cycle is generated in valid order:
        BACK (1+) -> IN (1+) -> KICK(L/R) -> RESET
     which trains: defend back, re-enter, THEN kick, then reset.
  ======================================================= */
  var CUE = {
    BACK:       { arrow:"⬇️", text:"STEP BACK",  sub:"DEFEND",         color:"var(--back)",  tone:330 },
    IN:         { arrow:"⬆️", text:"STEP IN",    sub:"RE-ENTER",       color:"var(--in)",    tone:440 },
    KICK_LEFT:  { arrow:"🦵", text:"KICK LEFT",  sub:"ATTACK",         color:"var(--kick)",  tone:660 },
    KICK_RIGHT: { arrow:"🦵", text:"KICK RIGHT", sub:"ATTACK",         color:"var(--kick)",  tone:660 },
    RESET:      { arrow:"🎯", text:"RESET",      sub:"BACK TO CENTER", color:"var(--reset)", tone:520 }
  };

  function ri(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

  // Manual level override for testing: null = auto (by elapsed time),
  // otherwise an index into PHASES.
  var forced = null;

  function phaseFor(elapsed){
    if(forced !== null) return PHASES[forced];
    for(var i=0;i<PHASES.length;i++){ if(elapsed >= PHASES[i].at) return PHASES[i]; }
    return PHASES[PHASES.length-1];
  }

  function generateCycle(p){
    var cues = [], n;
    for(n=ri(1,p.backMax); n>0; n--) cues.push("BACK");
    for(n=ri(1,p.inMax);   n>0; n--) cues.push("IN");
    cues.push(Math.random()<0.5 ? "KICK_LEFT" : "KICK_RIGHT");
    cues.push("RESET");
    return cues;
  }

  /* =======================================================
     AUDIO (optional beeps to keep pace, hands-free)
  ======================================================= */
  var audioCtx = null;
  function getCtx(){
    if(!audioCtx){
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
    }
    return audioCtx;
  }
  function beep(freq){
    var ctx = soundOn && getCtx();
    if(!ctx) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
    o.connect(g); g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.15);
  }

  /* =======================================================
     SESSION
  ======================================================= */
  var session = null;

  function elapsed(){ return Date.now() - session.startTime; }

  function startSession(){
    if(!state.startDate){ state.startDate = new Date().toISOString(); saveState(); }

    var ctx = getCtx();                 // unlock audio inside the click gesture
    if(ctx && ctx.state === "suspended") ctx.resume();

    session = { startTime:0, endsAt:0, queue:[], cycles:0, tickId:null, cueTimeout:null, finished:false };
    $("cycleCount").textContent = "0";
    $("timer").textContent = "10:00";
    $("timeFill").style.width = "0%";
    $("phasePill").textContent = "GET READY";
    show("train");
    runCountdown(0);
  }

  function runCountdown(i){
    if(!session) return;
    if(i >= COUNTDOWN.length){ beginDrill(); return; }
    paintCue({ arrow:"🥋", text:COUNTDOWN[i], color:"var(--accent)", sub:"GET READY" }, COUNTDOWN_MS);
    beep(i < COUNTDOWN.length-1 ? 440 : 660);
    session.cueTimeout = setTimeout(function(){ runCountdown(i+1); }, COUNTDOWN_MS);
  }

  function beginDrill(){
    session.startTime = Date.now();
    session.endsAt    = session.startTime + SESSION_MS;
    tick();
    session.tickId = setInterval(tick, 250);
    nextCue();
  }

  function endSession(complete){
    if(!session) return;
    clearInterval(session.tickId);
    clearTimeout(session.cueTimeout);
    var cycles = session.cycles;
    session = null;
    if(complete) markDayComplete(cycles);
    else renderHome();
  }

  function fmt(ms){
    var s = Math.ceil(Math.max(0,ms)/1000);
    return Math.floor(s/60) + ":" + String(s%60).padStart(2,"0");
  }

  function updatePill(){
    var p = (forced !== null) ? PHASES[forced] : (session ? phaseFor(elapsed()) : PHASES[PHASES.length-1]);
    $("phasePill").textContent = (forced !== null ? "🔒 " : "") + p.label;
  }

  function tick(){
    if(!session) return;
    var remaining = session.endsAt - Date.now();
    $("timer").textContent = fmt(remaining);
    $("timeFill").style.width = Math.min(100, (elapsed()/SESSION_MS)*100) + "%";
    updatePill();

    if(remaining <= 0 && !session.finished){
      session.finished = true;
      endSession(true);
    }
  }

  // paint a cue and run its countdown bar over `ms`
  function paintCue(info, ms){
    $("cueArrow").textContent = info.arrow;
    $("cueText").textContent  = info.text;
    $("cueText").style.color  = info.color;
    $("cueSub").textContent   = info.sub;
    var bar = $("cueFill");
    bar.style.transition = "none";
    bar.style.width = "100%";
    void bar.offsetWidth;                 // reflow
    bar.style.transition = "width " + ms + "ms linear";
    bar.style.width = "0%";
  }

  function nextCue(){
    if(!session || session.finished) return;

    var p = phaseFor(elapsed());
    if(!session.queue.length) session.queue = generateCycle(p);

    var name = session.queue.shift();
    if(name === "RESET") $("cycleCount").textContent = ++session.cycles;

    var dur = p.cue + (p.jitter ? ri(0,p.jitter) : 0);
    paintCue(CUE[name], dur);
    beep(CUE[name].tone);
    session.cueTimeout = setTimeout(nextCue, dur);
  }

  /* =======================================================
     COMPLETION
  ======================================================= */
  function markDayComplete(cycles){
    var day = state.currentDay;
    state.completedDays[day] = todayStr();
    state.lastCompletedDate  = todayStr();
    state.currentDay = day + 1;
    saveState();

    $("doneStreak").innerHTML = "Day " + day + " done · " +
      day + " / " + TOTAL_DAYS + " · " + cycles + " cycles 🦵";
    show("done");
  }

  /* =======================================================
     EVENTS / BOOT
  ======================================================= */
  $("startBtn").addEventListener("click", function(){ if(!this.disabled) startSession(); });

  var soundBtn = $("soundBtn");
  function renderSoundBtn(){ soundBtn.textContent = soundOn ? "🔊" : "🔇"; }
  soundBtn.addEventListener("click", function(){
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off"); } catch(e){}
    renderSoundBtn();
  });
  renderSoundBtn();

  $("quitBtn").addEventListener("click", function(){
    if(confirm("Quit now? This day will NOT count and you'll have to start it over.")) endSession(false);
  });

  // --- Manual level override (testing) ---
  // Tap the level pill to cycle Auto -> L1 -> L2 -> L3 -> Auto.
  // PHASES is ordered [L3, L2, L1], so L1=2, L2=1, L3=0.
  var FORCE_CYCLE = [null, 2, 1, 0];
  function setForced(val){ forced = val; updatePill(); }
  $("phasePill").addEventListener("click", function(){
    var i = FORCE_CYCLE.indexOf(forced);
    setForced(FORCE_CYCLE[(i + 1) % FORCE_CYCLE.length]);
  });
  document.addEventListener("keydown", function(e){
    if(e.key === "0") setForced(null);
    else if(e.key === "1") setForced(2);
    else if(e.key === "2") setForced(1);
    else if(e.key === "3") setForced(0);
  });

  $("doneHomeBtn").addEventListener("click", renderHome);

  $("resetProgramBtn").addEventListener("click", function(){
    if(confirm("Start a brand new 30-day program? Your old progress will be cleared.")){
      state = { startDate:new Date().toISOString(), currentDay:1, completedDays:{}, lastCompletedDate:null };
      saveState();
      renderHome();
    }
  });

  renderHome();
})();
