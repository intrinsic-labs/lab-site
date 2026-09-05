/* FLIP CARD — a card index you walk one card at a time.

   The first of the physical PRIMITIVES (Projects/bets/tycho/docs/
   primitives-thinking-2026-09-01.md §4): an object that earns its place
   because the action it demands leaves a trace a button would not. This one
   is for ORDER — a sequence with a front — and the trace is the time spent
   on each card and every flip back.

   The form is the split-flap index card off the reference (assets/refs/
   severance-cold-harbor-card.jpg): two panels on a centre hinge with two
   pins, spiral ticks down both sides, a nub on top and a tab at the foot.
   Drawn as a flat line drawing; the depth exists only while a flap is
   turning, which is the whole faux-3D rule.

   The mechanics are a real split-flap: the top panel folds down over the
   hinge, showing the next card's top behind it and landing as the next
   card's bottom. No 3D scene — plain CSS transforms, so any program (2D or
   the cabinet) can hold one.

     const deck = Tycho.flipCard({
       items, render: it => ({ title, sub }),   // what a card says
       onChange: (i, it) => {},                 // after a flip lands
     });
     deck.el · deck.next() · deck.prev() · deck.set(items, i) · deck.index

   THE CARDS ARE THE NAVIGATION (Asher, 2026-09-02) — there is no ◀ ▶ pair
   under the deck any more. You touch the PANEL YOU WANT TO MOVE: click the
   TOP card and the top card folds DOWN (forward, to the next item); click the
   BOTTOM card and the bottom card lifts UP (back). Until this the halves were
   the other way round — clicking the bottom flipped the top — which is the
   inversion that confused him, and it was wrong on the object's own terms:
   the panel you press should be the panel that moves. Arrow keys still work,
   and the caller adds whatever other keys it wants. */
"use strict";

Tycho.flipCard = function flipCard(o) {
  const FLIP_MS = 520;
  let items = o.items || [], i = Math.max(0, Math.min(items.length - 1, o.index || 0));
  let busy = false;
  const render = o.render || (it => ({ title: String(it), sub: "" }));
  /* the pending landing of the flip in the air, so a `set` mid-flip can take
     it back rather than let it write an index over the one it just installed */
  let landing = 0;

  const face = (cls) => T.el("div", { class: "t-flip-face " + cls },
    T.el("div", { class: "t-flip-title" }), T.el("div", { class: "t-flip-sub" }));
  const ticks = side => T.el("div", { class: "t-flip-ticks " + side },
    ...Array.from({ length: 7 }, () => T.el("i")));

  const topS = face("top"), botS = face("bottom");
  const flapF = face("top"), flapB = face("bottom");
  const flap = T.el("div", { class: "t-flip-flap" },
    T.el("div", { class: "t-flip-side front" }, flapF),
    T.el("div", { class: "t-flip-side back" }, flapB));
  const card = T.el("div", { class: "t-flip-card" },
    T.el("i", { class: "t-flip-nub" }),
    topS, botS, flap,
    T.el("i", { class: "t-flip-pin l" }), T.el("i", { class: "t-flip-pin r" }),
    T.el("i", { class: "t-flip-foot" }));
  const el = T.el("div", { class: "t-flip" + (items.length ? "" : " empty") },
    ticks("l"), card, ticks("r"));

  function paint(f, it) {
    const r = it == null ? { title: "", sub: "" } : render(it);
    f.querySelector(".t-flip-title").textContent = r.title || "";
    f.querySelector(".t-flip-sub").textContent = r.sub || "";
  }
  function show(k) {
    paint(topS, items[k]); paint(botS, items[k]);
    el.classList.toggle("empty", !items.length);
    el.dataset.index = String(k);
  }

  /* a forward flip: the top panel comes down. Behind it the next card's top
     is already there; the flap's back carries the next card's bottom */
  function flip(dir) {
    const k = i + dir;
    if (busy || k < 0 || k >= items.length) return false;
    busy = true;
    Sound?.flip?.();
    if (dir > 0) {
      flapF.className = "t-flip-face top"; flapB.className = "t-flip-face bottom";
      paint(flapF, items[i]); paint(flapB, items[k]);
      paint(topS, items[k]);
      flap.className = "t-flip-flap down";
    } else {
      /* backward: the flap is the BOTTOM panel lifting up — its front is the
         current card's bottom, its back the previous card's top; behind it
         the previous card's bottom is already there */
      flapF.className = "t-flip-face bottom"; flapB.className = "t-flip-face top";
      paint(flapF, items[i]); paint(flapB, items[k]);
      paint(botS, items[k]);
      flap.className = "t-flip-flap up";
    }
    /* the flap is placed at rest, then turned on the next frame so the
       transition runs */
    requestAnimationFrame(() => requestAnimationFrame(() => flap.classList.add("turn")));
    landing = setTimeout(() => {
      landing = 0;
      i = k; show(i);
      flap.className = "t-flip-flap";
      busy = false;
      o.onChange?.(i, items[i]);
    }, FLIP_MS + 30);
    return true;
  }

  /* the panel you press is the panel that moves: top folds down (forward),
     bottom lifts up (back).

     IT IS A CLICK, NOT A RELEASE. `pointerup` alone fired on ANY release over
     the card, so pressing the top half and letting go over the bottom flipped
     BACKWARD, and a rubber stamp carried off its rest and released over the
     deck flipped it. So the press is recorded and the release has to match it:
     same pointer, and within the same 8px that tells a tap from a carry
     everywhere else in this OS. */
  const TAP = 8;
  let down = null;
  card.addEventListener("pointerdown", e => {
    down = e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY } : null;
  });
  card.addEventListener("pointerup", e => {
    const d = down;
    down = null;
    if (!d || e.pointerId !== d.id) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) >= TAP) return;
    const r = card.getBoundingClientRect();
    flip(e.clientY - r.top > r.height / 2 ? -1 : 1);
  });

  show(i);
  return {
    el,
    next: () => flip(1), prev: () => flip(-1),
    /* a set DURING a flip takes the flip's landing with it: the pending
       timeout would otherwise write the old index back over this one and fire
       `onChange` for an item nobody is looking at */
    set(list, at = 0) {
      if (landing) { clearTimeout(landing); landing = 0; flap.className = "t-flip-flap"; busy = false; }
      items = list || [];
      i = Math.max(0, Math.min(items.length - 1, at));
      show(i);
    },
    get index() { return i; },
    get item() { return items[i]; },
    get length() { return items.length; },
  };
};
