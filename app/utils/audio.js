// =======================================================
// AUDIO — beeps + vibration, and the single shared "sound on/off" flag.
// speech.js reads `sound.on` from here so there is ONE source of truth
// for muting every noise in the app.
// =======================================================
import { SOUND_KEY } from "../data/config.js";

function loadSoundPref() {
  try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch (e) { return true; }
}

// Web Audio context, created lazily on first use (browsers require a user
// gesture before audio can start — see sound.unlock()).
let ctx = null;
function getCtx() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  return ctx;
}

export const sound = {
  on: loadSoundPref(),

  // Flip mute on/off, persist it, and silence any in-flight speech when muting.
  toggle() {
    this.on = !this.on;
    try { localStorage.setItem(SOUND_KEY, this.on ? "on" : "off"); } catch (e) {}
    if (!this.on) {
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    }
    return this.on;
  },

  // Call from inside a click handler to satisfy the browser's autoplay gate.
  unlock() {
    const c = getCtx();
    if (c && c.state === "suspended") c.resume();
  },

  // Short square-wave blip at `freq` Hz to keep pace, hands-free.
  beep(freq) {
    if (!this.on) return;
    const c = getCtx();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.14);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.15);
  },

  // Phone vibration (where supported), gated by the same mute toggle.
  buzz(ms) {
    try { if (this.on && navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
  }
};
