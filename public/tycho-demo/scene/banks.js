/* BANKS — paging the cabinet, as two round pads in the dock row.

   A BANK of three drawers is one named cabinet, and stepping between them
   used to be the same ▲▼ pads that page a drawer's folders, relabelled ◀▶
   and floated at the stage's edges (chrome.js). That went 2026-09-02
   (Asher): the big verbs run along the bottom of the screen, so the two
   bank pads became two pills sharing the band — same place, same shape,
   because they are the same KIND of thing (the one big move available on
   this screen right now).

   ROUND, AND WORDLESS, on every viewport (Asher, 2026-09-02, tablet pass).
   They were "◀ PREV CABINET" / "NEXT CABINET ▶" on a desk and bare glyphs on
   a phone; two thirds of the band spent saying what an arrow already says.
   A circle also tells them apart from the drawer's verbs, which are the same
   pill shape but rectangular and carry words — a different kind of button
   doing a different kind of thing in the same slot.

   Hidden outright when there is only one cabinet: a pair of dead pads is
   chrome drawn for its own sake, and this drawing has none. */
"use strict";

export function createBanks(go) {
  const pad = (d, glyph, label) => T.el("button", {
    class: "t-btn pill sc-bank", "aria-label": label, title: label,
    onpointerdown: e => e.stopPropagation(),
    onpointerup: e => { e.stopPropagation(); go(d); },
  }, glyph);

  const prev = pad(-1, "◀", "previous cabinet");
  const next = pad(1, "▶", "next cabinet");
  const el = T.el("div", { class: "sc-banks" }, prev, next);
  let count = 1;

  function set(n, bank) {
    count = n;
    prev.disabled = bank <= 0;
    next.disabled = bank >= n - 1;
  }

  return { el, set, get count() { return count; } };
}
