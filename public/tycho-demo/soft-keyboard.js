/* ============================================================================
   SOFT-KEYBOARD TOOLBAR — a Tycho-styled key row for the keys a tablet's own
   on-screen keyboard doesn't have: ESC, TAB, CTRL, ALT, and arrows. It docks
   itself against the visualViewport (riding above the keyboard, not the
   layout viewport, which does not shrink when the keyboard opens) and shows
   itself only on a coarse-pointer device while an editable element is
   focused and the keyboard has visibly eaten screen space.

   Kernel-level chrome, not a program — it has no window, mounts nothing, and
   is not Tycho.register()'d. One instance, one global: `SoftKB`.

   CTRL and ALT are STICKY: tapping one visually latches it (same "on" idiom
   as the dock and the attach pill) and it applies to the very next key,
   whether that key comes from this toolbar (an arrow tap) or from the real
   soft keyboard (a typed letter). One key consumes the latch; it does not
   linger.

   Two delivery paths, because TERM and everything else work differently:
     - TERM: routed through the same door its own status-bar quick keys use
       (Tycho.term.send, wired up in programs/term.js) for ESC/TAB/arrows, and
       through `filterTermData` — called from term.js's xterm onData — for a
       real keystroke typed while CTRL/ALT is latched. Both land as the exact
       control bytes a real terminal emulator would send (Ctrl-C = \x03, the
       xterm CSI modifier parameter for Ctrl/Alt-arrow), never synthetic DOM
       events, because xterm's input model is bytes on a socket, not keydowns.
     - Everything else (plain <input>/<textarea>/[contenteditable]): synthetic
       KeyboardEvents, for any field that listens for one (projField's Escape,
       calibrate/golden's Enter-shortcuts, …) — PLUS manual caret/text edits
       for the two things a synthetic, untrusted event cannot do by itself:
       Tab inserts a literal tab in a textarea (mirrors EDIT's own Tab
       handling), and the arrows move the caret directly, because Chrome does
       not run the native "move the caret" default action for an untrusted
       dispatched event. */
"use strict";

const SoftKB = {
  ctrl: false,
  alt: false,

  /* -- detection ------------------------------------------------------------
     Coarse pointer + no hover is "this is a touch device", not merely "the
     viewport is narrow" — a resized desktop Chrome window must never show a
     bar for a keyboard that isn't there. The keyboard itself is read off the
     gap between the LAYOUT viewport (window.innerHeight — CSS vh/vmin sizing,
     which does not shrink when Chrome opens the on-screen keyboard under the
     default viewport meta this OS ships) and the VISUAL viewport (shrinks by
     exactly the keyboard's height). No focus, no gap: neither alone means the
     keyboard is up — a focused-but-untouched field before the keyboard
     animates in, or a shrink from the browser's own UI chrome with nothing
     focused, would each false-positive alone. */
  COARSE: "(pointer: coarse) and (hover: none)",
  SHRINK_PX: 120,

  coarse() {
    try { return matchMedia(this.COARSE).matches; } catch { return false; }
  },

  editableFocused() {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    if (el.closest?.(".xterm-helper-textarea")) return true;
    if (el.tagName === "TEXTAREA") return true;
    if (el.tagName === "INPUT")
      return !["hidden", "checkbox", "radio", "range", "button", "submit",
                "reset", "color", "file"].includes(el.type);
    return Boolean(el.isContentEditable);
  },

  /* set by forceShow() for the ui-shot harness, which has no real keyboard to
     shrink a viewport with: bypasses the heuristic entirely, in either
     direction, until cleared with forceShow(null) */
  forced: null,

  check() {
    if (this.forced !== null) return this.forced ? this.show() : this.hide();
    if (!this.coarse() || !this.editableFocused()) return this.hide();
    const vv = window.visualViewport;
    const shrink = vv ? innerHeight - vv.height : 0;
    if (shrink > this.SHRINK_PX) this.show(); else this.hide();
  },

  forceShow(on) { this.forced = on; this.check(); },

  /* -- visibility + positioning ----------------------------------------------
     Fixed to the window (not #frame — #frame's overflow:hidden would clip a
     bar riding outside its own vmin-sized box), then clamped horizontally to
     #frame's own rect so it reads as OS chrome docked to the screen rather
     than a stray full-width web bar spanning the letterbox bezel. Vertically
     it is purely visualViewport math, per the brief: top rides
     `offsetTop + height`, the bottom edge of what's actually visible. */
  show() {
    this.build();
    if (!this.bar.classList.contains("show")) Sound?.click?.();
    this.bar.classList.add("show");
    this.reposition();
    /* this bar is `position: fixed` OUTSIDE #frame, so at a phone width the
       frame has to give up its height too or the bar covers the last row of
       whatever is open. Tycho.viewport is the one writer of that number. */
    Tycho.viewport?.sync?.();
  },

  hide() {
    if (!this.bar) return;
    this.bar.classList.remove("show");
    Tycho.viewport?.sync?.();
  },

  reposition() {
    if (!this.bar || !this.bar.classList.contains("show")) return;
    const frame = document.getElementById("frame");
    const fr = frame ? frame.getBoundingClientRect() : { left: 0, width: innerWidth };
    const vv = window.visualViewport;
    const barH = this.bar.offsetHeight || 40;
    const top = vv ? vv.offsetTop + vv.height - barH : innerHeight - barH;
    this.bar.style.top = Math.round(top) + "px";
    this.bar.style.left = Math.round(fr.left) + "px";
    this.bar.style.width = Math.round(fr.width) + "px";
  },

  /* -- the bar itself --------------------------------------------------------
     Built once, lazily, on first need. Plain text labels — TERM's own
     status-bar quick keys (ESC/TAB/^C/↑/↓) already set the precedent that
     this OS doesn't need pixel icons for keyboard glyphs. */
  build() {
    if (this.bar) return;
    const key = (label, fn, cls = "") => {
      const b = document.createElement("span");
      b.className = "sk-key " + cls;
      b.textContent = label;
      /* preventDefault on POINTERDOWN, not click: that is the event whose
         default behavior would shift focus (and with it, the keyboard) to
         this element. The action fires here too, so a tap is one event, not
         a pointerdown/click pair that could disagree under a fast tap. */
      b.addEventListener("pointerdown", e => { e.preventDefault(); fn(); });
      return b;
    };
    const spacer = document.createElement("span");
    spacer.className = "sk-spacer";

    this.ctrlKey = key("CTRL", () => this.toggle("ctrl"), "mod");
    this.altKey = key("ALT", () => this.toggle("alt"), "mod");

    const bar = document.createElement("div");
    bar.className = "sk-bar";
    bar.append(
      key("ESC", () => this.tapEsc()),
      key("TAB", () => this.tapTab()),
      this.ctrlKey, this.altKey,
      spacer,
      key("◀", () => this.tapArrow("left"), "arrow"),
      key("▼", () => this.tapArrow("down"), "arrow"),
      key("▲", () => this.tapArrow("up"), "arrow"),
      key("▶", () => this.tapArrow("right"), "arrow"),
    );
    document.body.append(bar);
    this.bar = bar;
    this.render();
  },

  toggle(which) {
    this[which] = !this[which];
    this.render();
  },

  clearMods() {
    this.ctrl = false; this.alt = false;
    this.render();
  },

  render() {
    if (!this.bar) return;
    this.ctrlKey.classList.toggle("on", this.ctrl);
    this.altKey.classList.toggle("on", this.alt);
  },

  modParam() {                  /* the xterm CSI modifier parameter */
    if (this.ctrl && this.alt) return 7;
    if (this.ctrl) return 5;
    if (this.alt) return 3;
    return 0;
  },

  /* -- TERM delivery ----------------------------------------------------- */
  ctrlByte(ch) {
    const c = ch.toUpperCase();
    if (c >= "A" && c <= "Z") return String.fromCharCode(c.charCodeAt(0) - 64);
    const map = { "@": "\x00", "[": "\x1b", "]": "\x1d", "\\": "\x1c",
                  "^": "\x1e", "_": "\x1f", "?": "\x7f", " ": "\x00" };
    return map[ch] ?? ch;
  },

  /* called from programs/term.js's xterm onData for every byte the tablet's
     keyboard actually produced. Only a single plain character is ever
     transformed — a multi-byte string is xterm's own CSI encoding of a real
     hardware key (arrows, function keys) or an IME/paste, and mangling that
     would corrupt it, so it passes through untouched and the latch stays
     armed for the keystroke that actually was one. */
  filterTermData(d) {
    if ((!this.ctrl && !this.alt) || d.length !== 1) return d;
    let out = this.ctrl ? this.ctrlByte(d) : d;
    if (this.alt) out = "\x1b" + out;
    this.clearMods();
    return out;
  },

  /* `Tycho` is a top-level `const` in tycho.js — shared lexical script scope
     across every plain <script> tag in this page, same as every program
     accesses it, but (unlike a `var`) never a `window` property, hence the
     bare reference rather than `window.Tycho`. */
  termFocused() { return Boolean(Tycho.term?.focused?.()); },

  tapEsc() {
    if (this.termFocused()) return Tycho.term.send("\x1b");
    this.domKey("Escape", "Escape", 27);
  },

  tapTab() {
    if (this.termFocused()) return Tycho.term.send("\t");
    const f = this.activeField();
    this.domKey("Tab", "Tab", 9);
    if (f && f.tagName === "TEXTAREA") this.insertTab(f);
  },

  ARROW_SEQ: { left: "D", right: "C", up: "A", down: "B" },
  ARROW_KEY: { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown" },

  tapArrow(dir) {
    if (this.termFocused()) {
      const mod = this.modParam();
      Tycho.term.send(mod
        ? `\x1b[1;${mod}${this.ARROW_SEQ[dir]}`
        : `\x1b[${this.ARROW_SEQ[dir]}`);
      this.clearMods();
      return;
    }
    const f = this.activeField();
    const key = this.ARROW_KEY[dir];
    this.domKey(key, key, { left: 37, up: 38, right: 39, down: 40 }[dir]);
    if (f) this.moveCaret(f, dir);
    this.clearMods();
  },

  /* -- ordinary DOM field delivery ----------------------------------------- */
  activeField() {
    const el = document.activeElement;
    return el && el !== document.body ? el : null;
  },

  domKey(key, code, keyCode) {
    const f = this.activeField() || document;
    f.dispatchEvent(new KeyboardEvent("keydown", {
      key, code, keyCode, which: keyCode, bubbles: true, cancelable: true,
      ctrlKey: this.ctrl, altKey: this.alt,
    }));
  },

  insertTab(f) {
    if (!("setRangeText" in f)) return;
    const s = f.selectionStart ?? f.value.length, e = f.selectionEnd ?? s;
    f.setRangeText("\t", s, e, "end");
    f.dispatchEvent(new Event("input", { bubbles: true }));
  },

  /* caret movement a synthetic keydown does not perform on its own — Chrome
     runs the native "move the caret" default action only for a trusted,
     user-generated event. Up/down is line-based within the field's own text,
     not the rendered soft-wrap — a reasonable approximation for the short
     fields (chat, notes, story) this toolbar actually appears over. */
  moveCaret(f, dir) {
    if (!("selectionStart" in f)) return;
    const v = f.value ?? "";
    let pos = f.selectionEnd ?? 0;
    if (dir === "left") pos = Math.max(0, pos - 1);
    else if (dir === "right") pos = Math.min(v.length, pos + 1);
    else if (dir === "up" || dir === "down") {
      const lineStart = v.lastIndexOf("\n", pos - 1) + 1;
      const col = pos - lineStart;
      if (dir === "up") {
        const prevEnd = lineStart - 1;
        if (prevEnd < 0) return;
        const prevStart = v.lastIndexOf("\n", prevEnd - 1) + 1;
        pos = Math.min(prevStart + col, prevEnd);
      } else {
        const lineEnd = v.indexOf("\n", pos);
        if (lineEnd === -1) return;
        const nextStart = lineEnd + 1;
        const nextEnd = v.indexOf("\n", nextStart);
        pos = Math.min(nextStart + col, nextEnd === -1 ? v.length : nextEnd);
      }
    }
    f.selectionStart = f.selectionEnd = pos;
    f.focus();
  },

  /* -- CTRL/ALT applied to a REAL keystroke from the soft keyboard --------
     TERM's own path is filterTermData (byte-level, called from onData).
     Everywhere else there is no post-hoc hook — a plain <input>/<textarea>
     inserts the character as the native default action of the very keydown
     we'd want to transform — so it has to be caught and replaced here,
     before that default action runs. Best-effort: the replacement keydown
     carries ctrlKey/altKey for any listener that reads them, but being
     untrusted it cannot trigger the BROWSER's own ctrl/alt shortcuts (copy,
     find, …) — only this OS's own JS ever sees the modifier. */
  installRealKeyIntercept() {
    document.addEventListener("keydown", e => {
      if (!this.ctrl && !this.alt) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;   /* a real combo — not ours to touch */
      if (e.key.length !== 1) return;                   /* Backspace, Enter, … pass through */
      if (this.termFocused()) return;                   /* xterm's onData handles TERM */
      const f = e.target?.closest?.('input, textarea, [contenteditable="true"]');
      if (!f) return;
      e.preventDefault();
      const ctrl = this.ctrl, alt = this.alt;
      this.clearMods();
      f.dispatchEvent(new KeyboardEvent("keydown", {
        key: e.key, code: e.code, bubbles: true, cancelable: true,
        ctrlKey: ctrl, altKey: alt,
      }));
    }, true);
  },

  /* -- wiring --------------------------------------------------------------- */
  install() {
    this.installRealKeyIntercept();
    const recheck = () => this.check();
    document.addEventListener("focusin", recheck);
    /* the keyboard's own dismiss (a soft-keyboard back-gesture, or the field
       losing focus) fires focusout before the viewport has necessarily
       finished animating shut — a short delay matches intake.js's own
       onblur-vs-pointerup race for the same reason */
    document.addEventListener("focusout", () => setTimeout(recheck, 60));
    if (window.visualViewport) {
      visualViewport.addEventListener("resize", recheck);
      visualViewport.addEventListener("scroll", () => this.reposition());
    }
    addEventListener("orientationchange", () => setTimeout(recheck, 200));
  },
};

addEventListener("DOMContentLoaded", () => SoftKB.install());
