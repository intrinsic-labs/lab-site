/* MOBILE SHELL — the keyboard-aware frame.

   Android's on-screen keyboard can cover the bottom of a full-height layout,
   which is exactly where the desk's action bar and a writing sheet's SEND
   live. `viewport` publishes the VISUAL viewport's height as `--vv-h` and the
   stylesheet sizes #frame off it, so every screen's flex column shortens by
   the keyboard's height with no per-screen work. (The viewport meta's
   `interactive-widget=resizes-content` asks Chrome to do the same; this is
   the belt to its braces on browsers that ignore it.)

   Kernel chrome: reads nothing, writes one custom property. */
"use strict";

Tycho.viewport = {
  sync() {
    const vv = window.visualViewport;
    const h = vv ? vv.height : innerHeight;
    document.documentElement.style.setProperty("--vv-h", Math.max(240, Math.round(h)) + "px");
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
