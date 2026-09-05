/* CHROME — the flat DOM around the scene. There are no ROWS: as of
   2026-09-02 nothing boxes the stage in top or bottom.

     · the caption (`.sc-cap`) — THE CABINET'S OWN NAME floating in space
       above the drawers, no rule, no bar. One bank is one cabinet, and since
       2026-09-03 a cabinet is a real DIRECTORY, so the word here is its
       directory's name — TYCHO, the system cabinet, being the one that is
       not on disk. Right-clicking the caption opens the cabinet's own menu
       (rename, new drawer, new cabinet, delete cabinet). It fades
       out as a drawer opens and back in as it closes, riding the same
       `dimmed` class that quiets the other drawers' fronts. In drawer mode
       nothing replaces it: the open drawer's own plate names it.
       Only the WORDS take a pointer — the caption's band spans the stage,
       and a full-width invisible strip eating taps across the top of the
       scene would be a bug rather than a feature.
     · the strata paddles (`.sc-pads`) — ▲▼ through an open drawer's pages,
       at the stage's right edge. DRAWER MODE ONLY as of 2026-09-02: they
       used to double as the cabinet's ◀▶ bank pads, which is why they had
       to be relabelled on every mode flip and why they once vanished when
       that landed in the wrong order. The banks moved into the band.
     · the hand (`.sc-hand`) — a second CSS3D surface over the FRAME, for
       the one file that is out of the drawer and in your hand (carry.js);
       it is out here because the stage clips and the trash can is below it.
     · the band (band.js) — the BIG verbs: the two bank pads in cabinet mode,
       the popped file's verbs in drawer mode, nothing when there is neither.
       It is NOT in the stage — it renders into the dock row's centre slot
       (kernel/dock.js), so every bottom-of-screen control is one row.

   It renders what it is told and calls back; it knows nothing about
   geometry. Opacity is legal here and nowhere in the scene: these are flat
   chrome, not solids. */
"use strict";

import { createBand } from "./band.js";

export function createChrome(host, on) {
  const cssRoot = T.el("div", { class: "sc-css" });
  const capName = T.el("span", { class: "sc-cap-name", role: "button",
    title: "right-click for this cabinet's menu",
    oncontextmenu: e => { e.preventDefault(); e.stopPropagation(); on.capMenu?.(e); } });
  const cap = T.el("div", { class: "sc-cap" }, capName);
  const stage = T.el("div", { class: "sc-stage" }, cssRoot, cap);
  /* ▲▼ only, and only in a drawer: the cabinet's banks are pills in the
     band now, so these never change their words */
  const padUp = T.el("button", { class: "sc-pad", "aria-label": "deeper in the drawer",
    onpointerup: () => on.page(1) }, "▲");
  const padDown = T.el("button", { class: "sc-pad", "aria-label": "back toward the front",
    onpointerup: () => on.page(-1) }, "▼");
  const paddles = T.el("div", { class: "sc-pads" }, padUp, padDown);
  const root = T.el("div", { class: "sc-root" }, stage, paddles);
  host.append(root);
  /* THE HAND — a second CSS3D surface, laid over the FRAME rather than
     inside the stage, and the reason is the trash can: the stage clips its
     own overflow (it has to — the cabinet's solids run past its edges) and
     the can sits in the dock row BELOW it. So a file carried to the can was
     cut off at the stage's foot exactly where it was being aimed. The flat
     drag ghost solved this by living in `#frame`, and the carried sheet
     (scene/carry.js) does the same, keeping its own renderer on the same
     camera. The box is synced to the stage's, so a point projects to the
     same pixel on both surfaces and the lift's first frame lands exactly on
     the sheet it was cut from. */
  const hand = T.el("div", { class: "sc-hand" });
  document.getElementById("frame")?.append(hand);
  function syncHand() {
    const f = hand.parentElement?.getBoundingClientRect();
    const r = stage.getBoundingClientRect();
    if (!f) return;
    hand.style.left = (r.left - f.left) + "px";
    hand.style.top = (r.top - f.top) + "px";
    hand.style.width = r.width + "px";
    hand.style.height = r.height + "px";
  }
  syncHand();
  paddles.style.display = "none";
  /* the band lives in the DOCK ROW, not in the stage (2026-09-02): one strip
     of controls along the very bottom, icons left, verbs centred, can right */
  const band = createBand(Tycho.dockSlot(), { bank: d => on.bank(d) });

  function strata(pages, page) {
    padUp.disabled = page >= pages.length - 1;
    padDown.disabled = page === 0;
    paddles.style.display = pages.length > 1 ? "" : "none";
  }

  return { root, stage, cssRoot, hand, syncHand, strata,
           /* the band is the one thing chrome puts outside its own root — it
              renders into the DOCK's centre slot — so it is the one thing a
              dispose has to take down by hand */
           dispose: () => { band.el.remove(); hand.remove(); root.remove(); },
           banks: band.banks,
           caption: text => { capName.textContent = text || ""; },
           actions: band.actions,
           /* the whole scene quiets while a drawer is out — a class rather
              than the mode, so it can be turned on the moment the drawer
              starts moving and off the moment it starts home, and the CSS
              transitions carry it */
           dim: yes => root.classList.toggle("dimmed", yes),
           /* the pads belong to an open drawer, so the cabinet never shows
              them — `strata` is what puts them back, from `mount` */
           mode: m => {
             root.dataset.mode = m;
             if (m !== "drawer") paddles.style.display = "none";
             band.mode(m);
           } };
}
