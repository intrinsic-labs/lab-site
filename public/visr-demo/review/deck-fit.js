/* REVIEW · deck fit — the home deck grows into the room it has.

   On a phone the deck is drawn at its tuned size (200 x 262). On a tablet
   that leaves it small in a lot of empty screen, so the deck is ZOOMED,
   proportionally, to a share of the box it sits in (the space above the
   paper in portrait, the left half in landscape), never below 1 and never
   past MAX. This file only measures and writes `--deck-fit`; the stylesheet
   decides where it applies (tablet widths), so a phone stays exactly as it
   was.

     DeckFit.watch(box, deck, below)   // box: the room · deck: what grows
                                       // below: what shares the room under it */
"use strict";

const DeckFit = {
  SHARE: 0.84, MAX: 2.4, GAP: 14,

  watch(box, deck, below) {
    const apply = () => {
      deck.style.setProperty("--deck-fit", "1");
      const w = deck.offsetWidth, h = deck.offsetHeight;
      const roomH = box.clientHeight - (below?.offsetHeight || 0) - this.GAP;
      if (!w || !h || roomH <= 0) return;
      const fit = Math.min(roomH * this.SHARE / h, box.clientWidth * this.SHARE / w, this.MAX);
      const v = String(Math.max(1, fit).toFixed(3));
      deck.style.setProperty("--deck-fit", v);
      box.style.setProperty("--deck-fit-room", v);   // what shares the room reads it too
    };
    if ("ResizeObserver" in window) new ResizeObserver(apply).observe(box);
    requestAnimationFrame(apply);
  },
};
