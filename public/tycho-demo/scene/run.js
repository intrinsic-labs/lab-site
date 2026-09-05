/* RUN — the popped file's verbs, as pills. Nothing else.

   It used to know where it sat: `place()` took the open drawer's projected
   footprint (rig.footprint) and hung the cluster under the drawer's front.
   That went 2026-09-02 (Asher) — THE BIG VERBS RUN ALONG THE BOTTOM OF THE
   SCREEN, in a fixed band (band.js), not under a rectangle that moves while
   the drawer rolls. So this file has no opinion about geometry at all any
   more: it owns one element and what is in it.

   It renders ONLY while a file is popped. Idle verbs are not drawn here;
   closing and putting back are taps on blank space, never buttons. */
"use strict";

export function createRun() {
  const el = T.el("div", { class: "sc-run" });
  let count = 0;

  function render(list, it) {
    count = list.length;
    el.replaceChildren(...list.map(a => T.el("button", {
      /* pills: the big hovering verbs are the one thing in this OS that is
         not square (tycho.css, `.t-btn.pill`) */
      class: "t-btn pill" + (a.primary ? " primary" : "") + (a.danger ? " danger" : ""),
      onpointerdown: e => e.stopPropagation(),
      onpointerup: e => { e.stopPropagation(); a.fn(it); },
    }, a.icon ? T.icon(a.icon) : null, a.label)));
  }

  return { el, render, get count() { return count; } };
}
