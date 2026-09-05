/* ============================================================================
   MOBILE SHELL — TychoOS at a phone width (≤ 760px, the breakpoint that was
   already `Tycho.small()`).

   Since the cabinet (2026-09-01) the phone runs the SAME scene as the desktop
   — one cabinet, framed closer — and the same fullscreen programs, so the
   only thing left here is the one mechanism the shape genuinely needs:

     · a KEYBOARD-AWARE FRAME — the layout viewport does not shrink when the
       on-screen keyboard opens, so a full-frame window's own footer (the chat
       composer, the editor's save state) would sit underneath it. `viewport`
       publishes the VISUAL viewport's height as `--vv-h` and the mobile
       stylesheet sizes #frame off it, so every program's flex column shortens
       by exactly the keyboard's height with no per-program work.

   Kernel chrome, not a program: nothing here is Tycho.register()'d. Everything
   else about the phone is CSS in tycho.css's MOBILE section. */
"use strict";

/* -- the keyboard-aware frame ---------------------------------------------
   One writer, three sources: visualViewport's own resize/scroll, and the
   soft-keyboard toolbar telling us it appeared (soft-keyboard.js calls sync()
   from show()/hide() — the bar is `position: fixed` outside the frame, so its
   height has to come off the frame's too or it covers the last row of
   whatever is open). Reads nothing, writes one custom property; the mobile
   stylesheet decides whether to care. */
Tycho.viewport = {
  sync() {
    const vv = window.visualViewport;
    let h = vv ? vv.height : innerHeight;
    const bar = document.querySelector(".sk-bar.show");
    if (bar) h -= bar.offsetHeight;
    document.documentElement.style.setProperty("--vv-h",
      Math.max(240, Math.round(h)) + "px");
  },

  install() {
    const sync = () => this.sync();
    sync();
    if (window.visualViewport) {
      visualViewport.addEventListener("resize", sync);
      visualViewport.addEventListener("scroll", sync);
    }
    addEventListener("resize", sync);
    addEventListener("orientationchange", () => setTimeout(sync, 200));
  },
};

addEventListener("DOMContentLoaded", () => Tycho.viewport.install());
