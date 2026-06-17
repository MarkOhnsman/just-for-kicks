// =======================================================
// DIAMOND SERVICE — the parent-gated manual diamond editor.
// Diamonds are earned automatically (a new AMRAP high score), but a parent also
// adjusts them by hand when they're spent or awarded in real life.
//
// Editing happens in an inline panel on the scoreboard (not browser prompts):
// an amount field + a MASKED password field, so a kid looking over your
// shoulder can't read the password. The gate only exists to stop the kid from
// quietly editing their own balance — it isn't real security.
// =======================================================
import { PARENT_PASSWORD } from "../data/config.js";
import { $ } from "../ui/screens.js";

export class DiamondService {
  constructor(state) {
    this.state = state;
    this.mode = null;                 // "add" | "remove" while the editor is open
    this.onChange = function () {};   // set by main: re-render the scoreboard
  }

  get balance() {
    return this.state.diamonds;
  }

  // Reveal the inline editor for the given mode and reset its fields.
  open(mode) {
    this.mode = mode;
    $("diaEditorTitle").textContent = mode === "add" ? "ADD 💎" : "REMOVE 💎";
    $("diaAmount").value = "";
    $("diaPass").value = "";
    this.message("");
    $("diaEditor").classList.add("show");
    $("diaAmount").focus();
  }

  // Hide and reset the editor.
  cancel() {
    this.mode = null;
    $("diaAmount").value = "";
    $("diaPass").value = "";
    this.message("");
    $("diaEditor").classList.remove("show");
  }

  // Inline feedback (validation errors). `ok` flips it to the success colour.
  message(text, ok) {
    const el = $("diaMsg");
    if (!el) return;
    el.textContent = text;
    el.className = "dia-editor-msg" + (text ? (ok ? " ok" : " err") : "");
  }

  // Validate amount + password, then apply the change.
  apply() {
    if (!this.mode) return;

    const n = Math.floor(Number($("diaAmount").value));
    if (!Number.isFinite(n) || n <= 0) {
      this.message("Enter a whole number greater than 0.");
      $("diaAmount").focus();
      return;
    }
    if ($("diaPass").value.trim().toLowerCase() !== PARENT_PASSWORD) {
      this.message("Wrong password.");
      $("diaPass").value = "";
      $("diaPass").focus();
      return;
    }

    if (this.mode === "add") this.state.addDiamonds(n);
    else this.state.spendDiamonds(n);

    this.cancel();
    this.onChange();
  }
}
