/* INPUT — what a pointer and a keyboard mean in the scene. Nothing here
   knows a folder or a file; it is handed verbs and calls them.

   A tap on blank space puts the popped sheet back, or shuts the drawer.
   Over the stack a vertical drag walks it, quantised to whole folders; over
   the drawer front (the bottom band) a downward drag shuts it, which is what
   a hand does to a real one. Horizontal walks strata. The solids that are
   buttons stop their own pointer events (labels.js), so what reaches the
   stage really is blank space. Keys are desktop convenience, never required. */
"use strict";

const FRONT_BAND = 0.24, WALK_STEP = 46;

export function installInput(stage, v) {
  let drag = null;
  /* NOTHING BLANK-TAPS OR ESCAPES MID-MOVE (2026-09-02). `closeDrawer` has
     always refused while the scene is busy; `unpop` never did, so an Escape
     pressed while a file was in flight to the trash can (scene/carry.js) put
     the sheet away underneath the carry that was about to put it back — the
     drawer then held a popped sheet the scene thought was down. Both key and
     pointer paths come through here, so one guard covers both. */
  const blank = () => {
    if (v.busy()) return;
    if (v.popped()) v.unpop(); else v.closeDrawer();
  };

  stage.addEventListener("pointerdown", e => {
    if (v.mode() !== "drawer" || e.button !== 0) return;
    const r = stage.getBoundingClientRect();
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, steps: 0, axis: "",
             onFront: (e.clientY - r.top) > r.height * (1 - FRONT_BAND) };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.axis && Math.hypot(dx, dy) > 10) drag.axis = Math.abs(dx) > Math.abs(dy) * 1.4 ? "x" : "y";
    if (drag.axis !== "y" || drag.onFront) return;
    const want = Math.round(-dy / WALK_STEP);
    if (want !== drag.steps) { v.walk(want - drag.steps); drag.steps = want; }
  });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    const flick = dy / Math.max(1, e.timeStamp - drag.t);
    if (!drag.axis) blank();
    else if (drag.axis === "x" && Math.abs(dx) > 60) v.goPage(dx < 0 ? 1 : -1);
    else if (drag.axis === "y" && ((drag.onFront && dy > 44) || flick > 1.1)) blank();
    drag = null;
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", e => { if (drag?.id === e.pointerId) drag = null; });
  stage.addEventListener("contextmenu", e => e.preventDefault());
  stage.style.touchAction = "none";

  function onkey(e) {
    /* a program's own keys are its own — the scene only listens while it is
       the thing on screen */
    if (document.querySelector("#apps.on")) return;
    const k = e.key;
    if (v.mode() === "cabinet") {
      const n = parseInt(k, 10);
      if (n >= 1 && n <= v.drawerCount()) { e.preventDefault(); return v.openDrawer(n - 1); }
      if (k === "Enter" && v.drawerCount()) { e.preventDefault(); return v.openDrawer(0); }
      if (k === "ArrowRight") { e.preventDefault(); return v.goBank(1); }
      if (k === "ArrowLeft") { e.preventDefault(); return v.goBank(-1); }
      return;
    }
    if (k === "ArrowUp" || k === "ArrowLeft") { e.preventDefault(); return v.walk(1); }
    if (k === "ArrowDown" || k === "ArrowRight") { e.preventDefault(); return v.walk(-1); }
    if (k === "PageUp") { e.preventDefault(); return v.goPage(1); }
    if (k === "PageDown") { e.preventDefault(); return v.goPage(-1); }
    if (k === "Home") { e.preventDefault(); return v.walk(v.count()); }
    if (k === "End") { e.preventDefault(); return v.walk(-v.count()); }
    if (k === "Enter" || k === " ") { e.preventDefault(); return v.primary(); }
    if (k === "Escape") { e.preventDefault(); e.stopPropagation(); return blank(); }
  }
  addEventListener("keydown", onkey, true);

  return { dispose: () => removeEventListener("keydown", onkey, true) };
}
