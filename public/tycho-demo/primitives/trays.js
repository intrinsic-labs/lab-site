/* IN / OUT TRAYS — sort by carrying, not by tapping.

   The fourth physical PRIMITIVE (Projects/bets/tycho/docs/
   primitives-thinking-2026-09-01.md §4), and the doc calls it "the cheapest
   strong instrument we can build" for a reason: a tap into a two-button
   segmented control and a drag into one of two trays record the same ANSWER,
   but only the drag records the path — the pull toward the wrong tray, the
   dwell over it, the pull-back. §3's test in its purest form.

     const t = Tycho.trays({
       trays: [{ id: "in", label: "IN" }, { id: "out", label: "OUT" }],
       onDrop: (trayId, item, trace) => {},
     });
     t.el · t.feed(itemEl) · t.reset()

   `feed` hands it the thing to be sorted — any element the program builds (a
   document icon, a small index card). The primitive owns none of that; it
   owns the carry.

   THE CARRY IS FLAT DOM, not the scene. `scene/drag.js` carries a file across
   a CSS3D stage and hands the drop back to the item's own verb; this is the
   same gesture in a program's body, so the two share the shape — a press with
   the primary button that MOVES 8px is a drag, and anything short of that is
   a plain press the caller's own handlers still see — and share no code, since
   nothing in that module is about a 2D box. */
"use strict";

const TRAY_THRESHOLD = 8;
const TRAY_SAMPLE_MS = 40;

Tycho.trays = function trays(o = {}) {
  const defs = o.trays || [];
  let item = null, drag = null;

  const boxes = defs.map(d => T.el("div", { class: "t-tray", "data-tray": d.id },
    T.el("span", { class: "mouth" }),
    T.el("span", { class: "lab" }, d.label)));
  const row = T.el("div", { class: "t-tray-row" }, ...boxes);
  const perch = T.el("div", { class: "t-tray-perch" });
  const el = T.el("div", { class: "t-trays" }, perch, row);

  /* which tray, if any, is under a point — hit-tested against the boxes' own
     rects rather than elementFromPoint, because the carried item is under the
     pointer and would answer every time */
  function trayAt(x, y) {
    for (let i = 0; i < boxes.length; i++) {
      const r = boxes[i].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
    }
    return -1;
  }

  function highlight(n) {
    boxes.forEach((b, i) => b.classList.toggle("hot", i === n));
  }

  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.on) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < TRAY_THRESHOLD) return;
      drag.on = true;
      item.classList.add("carried");
    }
    e.preventDefault();
    const now = Date.now();
    item.style.transform =
      `translate(${e.clientX - drag.x0}px, ${e.clientY - drag.y0}px)`;
    const n = trayAt(e.clientX, e.clientY);
    if (n !== drag.over) {
      /* close the dwell on the tray being left, and count a REVERSAL when the
         hand comes back to a tray it has already been over */
      if (drag.over >= 0 && drag.overAt != null) {
        const id = defs[drag.over].id;
        drag.dwell[id] = (drag.dwell[id] || 0) + (now - drag.overAt);
      }
      if (n >= 0) {
        const id = defs[n].id;
        if (drag.visited.includes(id)) drag.reversals++;
        else drag.visited.push(id);
      }
      drag.over = n; drag.overAt = n >= 0 ? now : null;
      highlight(n);
    }
    if (now - drag.lastSample >= TRAY_SAMPLE_MS) {
      drag.lastSample = now;
      drag.path.push([now - drag.t0,
                      Math.round(e.clientX - drag.x0), Math.round(e.clientY - drag.y0)]);
    }
  }

  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    stop();
    if (!d.on) return;
    const now = Date.now();
    if (d.over >= 0 && d.overAt != null) {
      const id = defs[d.over].id;
      d.dwell[id] = (d.dwell[id] || 0) + (now - d.overAt);
    }
    if (d.over < 0) return void spring();   /* dropped on nothing: it goes home */
    const landed = item;
    Sound?.commit?.();
    landed.classList.add("landed");
    o.onDrop?.(defs[d.over].id, landed, {
      path: d.path, dwell_ms: d.dwell, reversals: d.reversals,
      total_ms: now - d.t0, pointer: d.pointer,
    });
  }

  /* a release over nothing is not a decision — the item goes back to its
     perch, and the trip is still in the trace of the NEXT drop */
  function spring() {
    if (!item) return;
    item.classList.add("home");
    item.style.transform = "";
    setTimeout(() => item?.classList.remove("home"), 220);
  }

  function onCancel(e) { if (drag && e.pointerId === drag.id) { stop(); spring(); } }

  function stop() {
    if (!drag) return;
    drag = null;
    item?.classList.remove("carried");
    highlight(-1);
    removeEventListener("pointermove", onMove, true);
    removeEventListener("pointerup", onUp, true);
    removeEventListener("pointercancel", onCancel, true);
  }

  function begin(e) {
    if (e.button !== 0 || !item) return;
    stop();
    drag = {
      id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: Date.now(),
      on: false, over: -1, overAt: null, dwell: {}, visited: [], reversals: 0,
      path: [], lastSample: 0, pointer: e.pointerType || null,
    };
    addEventListener("pointermove", onMove, true);
    addEventListener("pointerup", onUp, true);
    addEventListener("pointercancel", onCancel, true);
  }

  return {
    el,
    /* put one thing on the perch. Replaces whatever was there — this is a
       one-at-a-time instrument; a pile would be a different primitive. */
    feed(node) {
      stop();
      item = node;
      item.classList.add("t-tray-item");
      item.style.transform = "";
      item.addEventListener("pointerdown", begin);
      perch.replaceChildren(item);
      return item;
    },
    reset() { stop(); item = null; perch.replaceChildren(); highlight(-1); },
    get item() { return item; },
  };
};
