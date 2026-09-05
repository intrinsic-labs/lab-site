/* DRAG — picking a file up out of an open drawer and carrying it somewhere.

   The gesture only, and nothing about what it is carrying, what that looks
   like in flight, or where it may land: it says when a press has become a
   carry (`start`), where the pointer is (`move`, which answers whether a
   release here would be a drop), and how the carry ended (`end(i, hit)`).
   The choreography is scene/carry.js's and the target is the kernel's.

   IT MUST NOT COST A TAP (2026-09-02). A folder tab and a popped sheet are
   already buttons: a press pops, a second press opens, a right-press opens
   the menu. So a drag is a press that MOVES — 8px with the primary button —
   and until it crosses that line nothing has happened at all. The press is
   still swallowed before the stage sees it (labels.js), so this never fights
   the blank-tap, the stack walk or the shut-the-drawer drag in input.js;
   those all begin on the stage, and a solid's press never reaches it.

   EVERY CARRY ENDS, AND ENDS ONCE. A release, Escape, a pointercancel and
   the window losing focus all land on the same `end(i, hit)` — the last
   three with `hit` false, which is what makes cancelling identical to
   dropping on blank space: the file goes back in the drawer. Nothing else
   may end a carry, because the thing on the other side of that call is a
   folder standing empty until it is told the paper is coming back.

   `dragged` is how a release that WAS a carry stops being read as a tap: the
   window's capture-phase pointerup runs before the element's own handler, so
   the flag is true by the time labels.js asks. */
"use strict";

const THRESHOLD = 8;

export function createDrag(v) {
  let d = null, dragged = false;

  function onMove(e) {
    if (!d || e.pointerId !== d.id) return;
    if (!d.on) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < THRESHOLD) return;
      d.on = true;
      v.start(d.i, e.clientX, e.clientY);
    }
    e.preventDefault();
    d.hit = v.move(e.clientX, e.clientY);
  }

  function onUp(e) {
    if (!d || e.pointerId !== d.id) return;
    dragged = d.on;
    finish(d.hit);
  }

  function onCancel(e) { if (d && e.pointerId === d.id) finish(false); }
  function onBlur() { if (d) finish(false); }
  function onKey(e) {
    if (!d || e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    dragged = d.on;
    finish(false);
  }

  /* the one exit: the listeners come down FIRST, so nothing the callback
     starts can be interrupted by a stray event from the gesture it ended */
  function finish(hit) {
    if (!d) return;
    const was = d;
    stop();
    if (was.on) v.end(was.i, !!hit);
  }

  function stop() {
    if (!d) return;
    d = null;
    removeEventListener("pointermove", onMove, true);
    removeEventListener("pointerup", onUp, true);
    removeEventListener("pointercancel", onCancel, true);
    removeEventListener("keydown", onKey, true);
    removeEventListener("blur", onBlur);
  }

  return {
    /* a primary press on a draggable solid — labels.js calls this from its
       own pointerdown, after it has stopped the event reaching the stage */
    begin(e, i) {
      dragged = false;
      if (e.button !== 0 || !v.allowed(i)) return;
      finish(false);
      d = { id: e.pointerId, i, x: e.clientX, y: e.clientY, on: false, hit: false };
      addEventListener("pointermove", onMove, true);
      addEventListener("pointerup", onUp, true);
      addEventListener("pointercancel", onCancel, true);
      addEventListener("keydown", onKey, true);
      addEventListener("blur", onBlur);
    },
    /* true for exactly the release that ended a carry */
    get dragged() { return dragged; },
    /* true from the press until the carry ends, whether or not it has passed
       the 8px yet — Android fires a contextmenu inside that window and a menu
       must not open under a file being picked up (labels.js) */
    get armed() { return !!d; },
    dispose() { finish(false); },
  };
}
