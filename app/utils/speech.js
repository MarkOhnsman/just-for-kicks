// =======================================================
// SPEECH — spoken cues so the session is hands-free.
// Gated by the same mute toggle as the beeps (sound.on).
// =======================================================
import { sound } from "./audio.js";

export function speak(text) {
  if (!sound.on) return;
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel(); // never let cues pile up
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.pitch = 1.0;
    u.volume = 1.0;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

// Stop anything currently being spoken (used on quit / mute).
export function stopSpeech() {
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
}
