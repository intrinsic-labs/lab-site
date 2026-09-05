/* RUBBER STAMP — a verdict, laid onto the thing being judged.

   The third of the physical PRIMITIVES (Projects/bets/tycho/docs/
   primitives-thinking-2026-09-01.md §4), and it earns its place by §3's test:
   the bodily action leaves a trace a button would not.

   IT IS AN OBJECT, AND USING IT IS A PHYSICAL ACT (Asher, 2026-09-02). The
   first build was a row of handles you PRESSED, and it read as "weird
   buttons" — which is what it was: a segmented control wearing a drawing. A
   stamp is not pressed where it sits. You pick it up off the rest, carry it
   over the paper, and put it down where you want the mark. So:

     - each stamp is drawn side-on — a rounded handle (knob + neck) over a
       flat base block with the verdict word small on the base — standing on a
       STAMP REST beside the card;
     - a press that MOVES 8px picks it up (the same threshold and the same
       gesture shape as scene/drag.js and trays.js); it rides the pointer,
       tilted, and the card lights while it is over it;
     - the release lays the impression WHERE IT WAS DROPPED, clamped inside
       the card, with the thump and Sound.commit();
     - a release anywhere else springs the stamp home and writes nothing;
     - A TAP DOES NOTHING. A tap is not a press.

   Keys 1..9 still stamp, because a keyboard has no hands: that impression
   lands centred, and the trace says the drop point was never chosen.

     const st = Tycho.stamp({
       faces: [{ id: "y", label: "SAME DECISION", tone: "ok" },
               { id: "n", label: "DIFFERENT",     tone: "red" }],
       target: card.el,                  // what the impression lands ON
       area: () => card.body,            // optional: the part of it ink may
                                         //   land in (defaults to the target)
       guard: () => fair !== null,       // optional: may a mark land yet?
       onRefuse: () => pulse(),          // ...and what to say when it may not
       onStamp: (id, trace) => {},
     });
     st.el · st.reset() · st.value · st.ink(id) · st.lock()

   ONE ACTION. There is no pick-then-confirm: the drop IS the stamp, and
   stamping is what calls `onStamp`. A second drop with a different stamp
   lifts the old impression and lays a new one — until the PROGRAM says the
   verdict is final, which it does by calling `lock()`. That split is
   deliberate: whether a verdict is reversible is the program's business
   (REPLAY and CALIBRATE write the corpus, so they lock at the write).

   `guard` is the PROGRAM's precondition, never the primitive's: REPLAY will
   not accept a mark until the fair-test question has been answered. A refused
   drop springs the stamp home exactly as a drop on the desk would, calls
   `onRefuse`, and leaves no trace entry — nothing happened.

   `ink(id)` lays an impression with NO trace and NO callback: that is how a
   program shows a verdict recorded before this screen existed. It lands
   centred, because where the hand put it that day was never written down. It
   matches the face id case-insensitively and answers whether it found one.

   `reset()` and `lock()` both PUT THE STAMP DOWN first: a carry outlives the
   card it started on otherwise, and its commit would land on the next one. */
"use strict";

const STAMP_THRESHOLD = 8;   /* the same 8px that makes a carry a carry */
const STAMP_SPRING_MS = 180;
const INK_EDGE = 10;         /* an impression never touches the paper's edge */

Tycho.stamp = function stamp(o = {}) {
  const faces = o.faces || [];
  let born = Date.now();
  let value = null, locked = false, impression = null;
  let restamps = 0, lastPointer = null;
  /* the trace: where the hand went before it came down */
  let hover = [], dwell = {}, enteredAt = null, entered = null;
  let carry = null, lastDrop = null, lastCarryMs = null;

  const el = T.el("div", { class: "t-stamps" });

  /* the object, drawn side-on: knob, neck, base block, and the rubber die
     under it. Line only — the depth is the eye's, not a shadow's. */
  const stamps = faces.map((f, n) => {
    const s = T.el("div", {
      class: "t-stamp" + (f.tone ? " " + f.tone : ""),
      "data-face": f.id, title: `${f.label} — pick it up and drop it on the card`,
    },
      T.el("span", { class: "knob" }),
      T.el("span", { class: "neck" }),
      T.el("span", { class: "base" }, f.label),
      T.el("span", { class: "die" }));
    const slot = T.el("div", { class: "t-stamp-slot" }, s);
    s.addEventListener("pointerenter", () => {
      if (locked) return;
      entered = f.id; enteredAt = Date.now();
      if (hover[hover.length - 1] !== f.id) hover.push(f.id);
    });
    s.addEventListener("pointerleave", () => {
      if (entered !== f.id || enteredAt == null) return;
      dwell[f.id] = (dwell[f.id] || 0) + (Date.now() - enteredAt);
      entered = null; enteredAt = null;
    });
    s.addEventListener("pointerdown", e => grab(e, f, n, s));
    el.append(slot);
    return s;
  });

  /* -- the carry ----------------------------------------------------------
     The stamp itself flies; its SLOT holds the space open, so the rest never
     collapses under the hand and the stamp has somewhere to spring back to. */
  function grab(e, f, n, s) {
    if (locked || e.button !== 0 || carry) return;
    lastPointer = e.pointerType || null;
    const r = s.getBoundingClientRect();
    carry = {
      id: e.pointerId, f, n, s, on: false, over: false,
      x0: e.clientX, y0: e.clientY, t0: Date.now(),
      dx: e.clientX - r.left, dy: e.clientY - r.top,
      w: r.width, h: r.height, home: null,
    };
    addEventListener("pointermove", onMove, true);
    addEventListener("pointerup", onUp, true);
    addEventListener("pointercancel", onCancel, true);
  }

  function lift() {
    const c = carry;
    /* A RE-GRAB CANCELS THE SPRING. Without this the old flight's cleanup
       timer still fired 180ms later and snapped the stamp back into its slot
       with the finger still down on it. The home is read off the SLOT, which
       holds the space open and never moves — the stamp's own rect is wherever
       the last flight had got to. */
    clearTimeout(c.s._springT);
    c.s.classList.remove("springing");
    const r = (c.s.parentElement || c.s).getBoundingClientRect();
    c.home = { left: r.left, top: r.top };
    c.on = true;
    c.s.style.width = c.w + "px";
    c.s.style.height = c.h + "px";
    c.s.style.left = Math.round(r.left) + "px";
    c.s.style.top = Math.round(r.top) + "px";
    c.s.classList.add("carried");
  }

  /* is the pointer over the paper? Hit-tested on the target's own rect, not
     elementFromPoint — the stamp is under the pointer and would answer. */
  function overTarget(x, y) {
    const t = o.target;
    if (!t) return false;
    const r = t.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function onMove(e) {
    if (!carry || e.pointerId !== carry.id) return;
    if (!carry.on) {
      if (Math.hypot(e.clientX - carry.x0, e.clientY - carry.y0) < STAMP_THRESHOLD) return;
      lift();
    }
    e.preventDefault();
    carry.s.style.left = Math.round(e.clientX - carry.dx) + "px";
    carry.s.style.top = Math.round(e.clientY - carry.dy) + "px";
    const over = overTarget(e.clientX, e.clientY);
    if (over !== carry.over) {
      carry.over = over;
      o.target?.classList.toggle("t-ink-hot", over);
    }
  }

  function onUp(e) {
    if (!carry || e.pointerId !== carry.id) return;
    const c = carry;
    detach();
    o.target?.classList.remove("t-ink-hot");
    if (!c.on) { carry = null; return; }        /* a tap is not a press */
    if (!c.over) return void spring(c);
    /* the program's own precondition — a refused drop is a drop on the desk */
    if (o.guard && !o.guard()) { spring(c); o.onRefuse?.(); return; }
    const r = o.target.getBoundingClientRect();
    lastDrop = { x: e.clientX - r.left, y: e.clientY - r.top,
                 w: r.width, h: r.height };
    lastCarryMs = Date.now() - c.t0;
    spring(c);
    press(c.f, c.n, lastDrop);
  }

  function onCancel(e) {
    if (!carry || e.pointerId !== carry.id) return;
    drop();
  }

  /* home again: it travels back to the rest rather than teleporting, because
     a stamp that vanishes out of your hand was never in it */
  function spring(c) {
    carry = null;
    if (!c.on) return;
    c.s.classList.add("springing");
    c.s.style.left = Math.round(c.home.left) + "px";
    c.s.style.top = Math.round(c.home.top) + "px";
    c.s._springT = setTimeout(() => {
      c.s.classList.remove("carried", "springing");
      c.s.style.left = c.s.style.top = c.s.style.width = c.s.style.height = "";
    }, STAMP_SPRING_MS);
  }

  function detach() {
    removeEventListener("pointermove", onMove, true);
    removeEventListener("pointerup", onUp, true);
    removeEventListener("pointercancel", onCancel, true);
  }

  /* PUT THE STAMP DOWN, WHOEVER IS ASKING. A carry holds window listeners and
     a `commit` closure that reads the program's CURRENT item, so a stamp still
     in the hand when the deck moves on would, on release, commit against the
     next card. `reset()` and `lock()` are the two moments a program says this
     screen is not the one that was picked up on, and both end the carry. */
  function drop() {
    if (!carry) return;
    const c = carry;
    detach();
    o.target?.classList.remove("t-ink-hot");
    if (c.on) spring(c); else carry = null;
  }

  /* -- the impression -----------------------------------------------------
     The word inked onto the target, off-square, landing with a scale-down
     thump. It is a CHILD of the target so it travels with it; the target is
     given a containing block if it hasn't one. A DROPPED impression sits
     where it was put, clamped so no part of it leaves the paper; a keyed or
     restored one sits in the middle, the honest default for a mark whose
     place nobody chose. */
  function lay(f, quiet, at) {
    const target = o.target;
    if (!target) return;
    if (getComputedStyle(target).position === "static") target.style.position = "relative";
    erase();
    impression = T.el("div",
      { class: "t-stamp-ink" + (f.tone ? " " + f.tone : "") + (quiet ? " quiet" : "") },
      T.el("span", {}, f.label));
    target.append(impression);
    if (at) {
      /* THE DROP POINT AND THE BOUNDS MUST BE IN ONE BOX. `at` is measured off
         the target's BORDER box (that is what a pointer rect gives you) and an
         absolutely-positioned child is placed from the PADDING box, so the two
         were 2px apart on a card with a 2px edge. And the region is the paper's
         BODY where the caller names one (`area`) — an impression clamped to the
         whole card could land across the title rule or the foot line, which is
         the one part of the paper that is not the item's words. */
      const tr = target.getBoundingClientRect();
      const cs = getComputedStyle(target);
      const bx = parseFloat(cs.borderLeftWidth) || 0;
      const by = parseFloat(cs.borderTopWidth) || 0;
      const ar = (o.area?.() || target).getBoundingClientRect();
      const x0 = ar.left - tr.left - bx, x1 = x0 + ar.width;
      const y0 = ar.top - tr.top - by, y1 = y0 + ar.height;
      const iw = impression.offsetWidth, ih = impression.offsetHeight;
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      impression.style.left = Math.round(clamp(at.x - bx,
        x0 + iw / 2 + INK_EDGE,
        Math.max(x0 + iw / 2, x1 - iw / 2 - INK_EDGE))) + "px";
      impression.style.top = Math.round(clamp(at.y - by,
        y0 + ih / 2 + INK_EDGE,
        Math.max(y0 + ih / 2, y1 - ih / 2 - INK_EDGE))) + "px";
    }
    if (!quiet) {
      Sound?.commit?.();
      requestAnimationFrame(() => impression?.classList.add("down"));
    } else {
      impression.classList.add("down");
    }
  }
  function erase() { impression?.remove(); impression = null; }

  function trace() {
    /* close the open dwell so the stamp the hand was ON when it lifted counts */
    if (entered && enteredAt != null) {
      dwell[entered] = (dwell[entered] || 0) + (Date.now() - enteredAt);
      enteredAt = Date.now();
    }
    return {
      hover_order: hover.slice(),
      dwell_ms: { ...dwell },
      commit_ms: Date.now() - born,
      restamps: restamps,
      pointer: lastPointer,
      /* WHERE ON THE PAPER it came down, as a FRACTION of the paper rather
         than in pixels: the card is a different size on a phone, a tablet and
         the Mac, so 210px means nothing across two devices while 0.48 means
         the middle everywhere. The size it was measured on rides along, so
         the px can always be recovered. Null for a keyed mark — a keyboard
         chose no place. */
      drop: lastDrop ? { x: +(lastDrop.x / Math.max(1, lastDrop.w)).toFixed(4),
                         y: +(lastDrop.y / Math.max(1, lastDrop.h)).toFixed(4) } : null,
      card_w: lastDrop ? Math.round(lastDrop.w) : null,
      card_h: lastDrop ? Math.round(lastDrop.h) : null,
      carry_ms: lastCarryMs,
    };
  }

  function press(f, n, at) {
    if (locked) return;
    if (value === f.id) return;          /* the same verdict twice is not a re-stamp */
    if (value !== null) restamps++;
    value = f.id;
    stamps.forEach((h, k) => h.classList.toggle("on", k === n));
    lay(f, false, at);
    o.onStamp?.(f.id, trace());
  }

  function onKey(e) {
    if (locked) return false;
    const n = "123456789".indexOf(e.key);
    if (n < 0 || n >= faces.length) return false;
    if (o.guard && !o.guard()) { o.onRefuse?.(); return true; }
    /* a key press has no hand, and the trace must say so rather than imply a
       hand that hovered and carried */
    lastPointer = lastPointer || "key";
    lastDrop = null; lastCarryMs = null;
    press(faces[n], n, null);
    return true;
  }

  return {
    el, key: onKey,
    get value() { return value; },
    get locked() { return locked; },
    /* show a verdict recorded elsewhere — no trace, no callback, no sound.
       CASE-INSENSITIVE, and it answers whether it found the face: the sheets
       carry their own vocabulary (`HIT`, `y`) and a caller passing a verdict
       straight off the wire must not silently ink nothing. */
    ink(id) {
      const want = String(id ?? "").toLowerCase();
      const n = faces.findIndex(f => String(f.id).toLowerCase() === want);
      if (n < 0) return false;
      value = faces[n].id;
      stamps.forEach((h, k) => h.classList.toggle("on", k === n));
      lay(faces[n], true, null);
      return true;
    },
    lock() { drop(); locked = true; el.classList.add("locked"); },
    reset() {
      drop();
      value = null; locked = false; restamps = 0; born = Date.now();
      hover = []; dwell = {}; entered = null; enteredAt = null;
      lastDrop = null; lastCarryMs = null;
      stamps.forEach(h => h.classList.remove("on"));
      el.classList.remove("locked");
      o.target?.classList.remove("t-ink-hot");
      erase();
    },
  };
};
