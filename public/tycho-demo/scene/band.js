/* BAND — the big verbs, in the dock row.

   THE ONE PLACE A BIG VERB EVER APPEARS (Asher, 2026-09-02). Before this the
   run cluster hung under the open drawer's projected front and the bank pads
   floated at the stage's left and right edges: two different answers to
   "where is the thing I can press", both of them moving targets. It became
   one strip, centred, at the bottom of the STAGE — and after the tablet pass
   the same day, one strip in the DOCK ROW itself, because a band of pills
   hovering just above a row of dock icons is still two bottom-of-screen rows
   and read as weird. So there is now exactly one: HOME and the running
   programs at the left, these verbs centred, the trash can at the right.

   It holds at most one thing, decided by the mode:

     cabinet   the two bank pads (banks.js) — hidden when there is only one
               cabinet, because a dead pad is chrome for its own sake
     drawer    the popped file's verbs (run.js) — nothing popped, nothing here

   The ▲▼ strata pads are NOT in here: they page a drawer's folders in place,
   at the stage's right edge, and they stayed where they were.

   It knows nothing about geometry — the band is a CSS box, not a projection —
   and nothing about files or drawers. It is handed rendered content, a host
   to render into, and a mode, and shows exactly one of them. */
"use strict";

import { createRun } from "./run.js";
import { createBanks } from "./banks.js";

export function createBand(host, on) {
  const run = createRun();
  const banks = createBanks(on.bank);
  const el = T.el("div", { class: "sc-band" }, banks.el, run.el);
  host?.append(el);
  let mode = "cabinet";

  /* one thing on screen at a time, and nothing at all when that thing is
     empty — `display`, so the band takes no space and eats no taps */
  function sync() {
    const showBanks = mode === "cabinet" && banks.count > 1;
    const showRun = mode === "drawer" && run.count > 0;
    banks.el.style.display = showBanks ? "" : "none";
    run.el.style.display = showRun ? "" : "none";
    el.style.display = showBanks || showRun ? "" : "none";
  }
  sync();

  return {
    el,
    actions: (list, it) => { run.render(list, it); sync(); },
    banks: (n, bank) => { banks.set(n, bank); sync(); },
    mode: m => { mode = m; sync(); },
  };
}
