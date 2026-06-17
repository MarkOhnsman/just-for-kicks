// =======================================================
// SCREENS — the tiny "view router". Only one <section> is visible at a time.
// =======================================================

export const screens = ["home", "train", "strength", "condition", "done", "allDone", "scoreboard"];

// Shorthand for document.getElementById — used everywhere we touch the DOM.
export function $(id) {
  return document.getElementById(id);
}

// Show one screen by id, hide the rest (CSS .active controls visibility).
export function show(name) {
  screens.forEach((s) => $(s).classList.toggle("active", s === name));
}
