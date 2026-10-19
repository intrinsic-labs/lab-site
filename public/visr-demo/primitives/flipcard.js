/* FLIP CARD — a card index you walk one card at a time.

   The first of the physical PRIMITIVES (Projects/meta/vault/docs/tycho/
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
       loop: true,                              // optional: the ends meet
     });
     deck.el · deck.next() · deck.prev() · deck.set(items, i) · deck.index

   THE CARDS ARE THE NAVIGATION (Asher, 2026-09-02) — there is no ◀ ▶ pair
   under the deck any more. You touch the PANEL YOU WANT TO MOVE: click the
   TOP card and the top card folds DOWN (forward, to the next item); click the
   BOTTOM card and the bottom card lifts UP (back). Until this the halves were
   the other way round — clicking the bottom flipped the top — which is the
   inversion that confused him, and it was wrong on the object's own terms:
   the panel you press should be the panel that moves. Arrow keys still work,
   and the caller adds whatever other keys it wants.

   THE RINGS ARE A SCRUBBER (Asher, 2026-10-05): drag either side's ticks
   and the deck moves by the distance travelled, faster for a faster swipe,
   and coasts on release (the hand is primitives/ring-scrub.js).

   THE FLAP IS DRAWN EACH FRAME, NEVER QUEUED. Every way of moving the deck
   only sets a GOAL card; one requestAnimationFrame loop turns the flap
   toward it. A flight runs from the card at rest straight to the goal, so
   when the goal runs ahead the cards between are dropped rather than
   flipped late. Its length follows the scrub's speed: the full 520ms flip
   when slow or tapped, down to a 50ms riffle when fast, and a flight
   already in the air is shortened when the goal moves on. The card on show
   is never more than one flight behind the finger, so nothing catches up
   after it stops. `onChange` fires once, when the deck has come to rest on
   the goal and no finger or coast is moving it. */
"use strict";

Tycho.flipCard = function flipCard(o) {
  const FLIP_MS = 520, RIFFLE_MS = 50, TICK_MS = 40;
  let items = o.items || [], i = Math.max(0, Math.min(items.length - 1, o.index || 0));
  const render = o.render || (it => ({ title: String(it), sub: "" }));
  /* shown: the card at rest (unwrapped, so a loop can run on forever) ·
     goal: where the deck is going · flight: the flap in the air */
  let shown = i, goal = i, flight = null, frame = 0, lastTick = 0;
  /* a finger caught the deck mid-riffle: the card under it comes up at once */
  let hurry = false;

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

  const n = () => items.length;
  const at = k => items[((k % n()) + n()) % n()];
  const wrap = k => n() ? ((k % n()) + n()) % n() : 0;
  /* a face is repainted only when its card changes: a riffle at 50ms must
     not rewrite four faces' text it already holds */
  function paint(f, it) {
    if (f._it === it && it !== undefined) return;
    f._it = it;
    const r = it == null ? { title: "", sub: "" } : render(it);
    f.querySelector(".t-flip-title").textContent = r.title || "";
    f.querySelector(".t-flip-sub").textContent = r.sub || "";
  }
  function show(k) {
    paint(topS, items[k]); paint(botS, items[k]);
    el.classList.toggle("empty", !items.length);
    el.dataset.index = String(k);
  }

  /* how long a flight takes at the scrub's speed (cards per ms): a little
     under the time between cards, the full flip when slow or still */
  const span = v => hurry ? RIFFLE_MS : v > 0 ? Math.max(RIFFLE_MS, Math.min(FLIP_MS, 0.9 / v)) : FLIP_MS;
  const speed = () => scrub.moving ? scrub.speed : 0;

  /* a flight leaves the card at rest for the goal. Forward, the top panel
     comes down: behind it the goal's top is already there, the flap's back
     carries the goal's bottom. Backward, the BOTTOM panel lifts: its front
     the current bottom, its back the goal's top; behind it the goal's bottom */
  function launch(now) {
    const dir = goal > shown ? 1 : -1, from = at(shown), to = at(goal);
    flight = { dir, to: goal, t0: now, dur: span(speed()) };
    if (dir > 0) {
      flapF.className = "t-flip-face top"; flapB.className = "t-flip-face bottom";
      paint(flapF, from); paint(flapB, to); paint(topS, to);
      flap.className = "t-flip-flap down";
    } else {
      flapF.className = "t-flip-face bottom"; flapB.className = "t-flip-face top";
      paint(flapF, from); paint(flapB, to); paint(botS, to);
      flap.className = "t-flip-flap up";
    }
    flap.style.transform = "rotateX(0deg)";
    /* a test can read every flight's start, length and cards */
    window.__flipTrace?.push({ t: now, dur: flight.dur, from: wrap(shown), to: wrap(goal) });
    if (now - lastTick >= TICK_MS) {
      lastTick = now;
      Sound?.flip?.();
      if (scrub.moving) navigator.vibrate?.(5);
    }
  }
  function land() {
    shown = flight.to; flight = null;
    flap.className = "t-flip-flap"; flap.style.transform = "";
    i = wrap(shown); show(i);
  }
  function tick(now) {
    frame = 0;
    if (flight) {
      /* the goal moved on: this flight hurries to the new speed */
      if (flight.to !== goal) flight.dur = Math.min(flight.dur, span(speed()));
      const p = Math.min(1, (now - flight.t0) / flight.dur);
      const e = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
      flap.style.transform = `rotateX(${flight.dir * -180 * e}deg)`;
      if (p >= 1) land();
    }
    if (!flight && goal !== shown) launch(now);
    if (!flight) hurry = false;
    if (flight) { frame = requestAnimationFrame(tick); return; }
    if (!scrub.moving && settled !== shown) { settled = shown; o.onChange?.(i, items[i]); }
  }
  let settled = shown;
  /* everything that moves the deck only says where to */
  function aim(k) {
    if (n() < 2) return false;
    if (!o.loop) k = Math.max(0, Math.min(n() - 1, k));
    goal = k;
    if (!frame) frame = requestAnimationFrame(tick);
    return true;
  }
  function flip(dir) {
    if (!o.loop && (goal + dir < 0 || goal + dir >= n())) return false;
    scrub.stop();
    scrub.at(goal + dir);
    return aim(goal + dir);
  }

  /* the rings: the hand's position, in cards, is the goal; zoomed decks
     (deck-fit.js on a tablet) take a longer step so it feels the same */
  const strips = [...el.querySelectorAll(".t-flip-ticks")];
  const scrub = Tycho.ringScrub({
    strips,
    enabled: () => n() > 1,
    scale: () => (card.getBoundingClientRect().height / card.offsetHeight) || 1,
    onStart: () => { hurry = !!flight; el.classList.add("scrubbing"); },
    onMove: p => aim(Math.round(p)),
    onSettle: p => { el.classList.remove("scrubbing"); aim(Math.round(p)); if (!frame) tick(performance.now()); },
  });

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
    /* a set takes any flight and coast with it, so neither lands an old
       index over the new list nor fires `onChange` for a card nobody sees */
    set(list, k = 0) {
      cancelAnimationFrame(frame); frame = 0; scrub.stop();
      if (flight) { flight = null; flap.className = "t-flip-flap"; flap.style.transform = ""; }
      el.classList.remove("scrubbing");
      items = list || [];
      for (const f of [topS, botS, flapF, flapB]) f._it = undefined;
      i = Math.max(0, Math.min(items.length - 1, k));
      shown = goal = settled = i; scrub.at(i);
      show(i);
    },
    get index() { return i; },
    /* the card at rest, unwrapped: how far a loop has run, for tests */
    get position() { return shown; },
    get item() { return items[i]; },
    get length() { return items.length; },
  };
};
