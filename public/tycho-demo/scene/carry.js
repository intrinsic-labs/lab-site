/* CARRY — the file coming out of the drawer, and going back in.

   ONE CONTINUOUS OBJECT (Asher, 2026-09-02: "animate that whole thing —
   the file comes out of the drawer with you and shrinks into that little
   icon, and if you decide not to you drop it back in the drawer and it
   shows back up as a file"). Before this a carry spawned a flat DOM ghost
   over the frame while the sheet sat untouched in its slot: two objects,
   and the file you were dragging was never the file you were looking at.

   So there is exactly ONE thing in flight, and it is a CSS3DObject in the
   scene like everything else — the same space the drawer is in, so the lift
   out of the slot, the shrink, and the flight to the can are one motion
   with nothing to hand over to. It starts as the sheet, at the sheet's own
   world transform and the sheet's own size, and ends as the little document
   the trash view wears (kernel/doc-icon.js). The hanging folder it left
   stays in the drawer as a dashed outline: a real hanging folder does not
   leave the box, the paper does.

   THE SCREEN SIZE IS DRIVEN, NOT THE SCALE. A CSS3DObject's apparent size
   is `w · scale · fov / depth`, so a card flying toward the camera grows
   even as it shrinks. What is tweened here is what the eye actually reads —
   the card's height IN SCREEN PIXELS, from whatever the sheet occupies now
   down to the document's 44 — and the scale is solved for each frame from
   the depth it happens to be at. That is what makes the shrink continuous
   through a move that also changes distance.

   The proportions morph too: the element's own width and height tween from
   the sheet's (470 × its popped height) to the document's 34:44, and the
   CONTENT swaps once at `SWAP`, where the card is small enough that the
   sheet's type is already illegible — a swap the eye cannot catch. Going
   back, it swaps at exactly the same place, so the return is the lift run
   backwards rather than a second animation.

   IT IS DRAWN ON A SURFACE OF ITS OWN — a second CSS3DRenderer on the same
   camera, over the frame rather than in the stage (`.sc-hand`, chrome.js).
   Not for looks: the stage clips its own overflow, and the trash can sits in
   the dock row BELOW it, so a file carried to the can was cut off at the
   stage's foot exactly where it was being aimed. The flat ghost lived in
   `#frame` for the same reason. Same camera, same box, so the lift's first
   frame lands on the pixel the sheet was occupying a frame earlier — and
   what is in your hand is now always in front of the cabinet, which is
   where a thing in your hand belongs.

   Framed on the scene's own tween clock (anim.js) and applied from
   index.js's rAF, never as a CSS transition: the renderer rewrites this
   element's `transform` every frame and a transition would fight it.

   It knows nothing about files, the trash, or what a drop means — it is
   handed a folder to lift, a point to fly to, and a callback. */
"use strict";

import * as THREE from "../vendor/three/three.module.min.js";
import { CSS3DRenderer, CSS3DObject } from "../vendor/three/CSS3DRenderer.js";
import { DIM, TIME, CAM } from "./dims.js";
import { Ease } from "./anim.js";

/* the document icon's own drawing, in screen px — kernel/doc-icon.js draws
   a 34 × 44 sheet, and that is exactly what the card shrinks to */
const DOC_W = 34, DOC_H = 44;
/* …and the element size it wears while it is that document: big enough for
   the name to be real type, scaled down to DOC_H on screen */
const DOC_EL_W = 102, DOC_EL_H = 132;
/* where the sheet becomes the document, on the lift's own 0→1 — late,
   because by then the card is under ~70 screen px and the sheet's type on
   it is illegible mush, which is the only place a content swap can hide */
const SWAP = 0.78;
/* the arc out of the slot: a bump toward the viewer at the middle of the
   lift, so the paper comes out OVER the folders in front of it rather than
   through them (the browser sorts these solids honestly, so a straight line
   from a back slot would be seen to pass behind them) */
const ARC_Z = 110;
/* the card rides above the pointer for the reason the old ghost did: the
   thing being aimed at is a 40px glyph in a corner, and a card centred on
   the finger covers exactly the target it is being carried to. Enough to
   clear the document's own name, which hangs below the drawing. */
const AIM_UP = 70;
/* …and never flush against the glass: at the corner an uncorrected card
   hangs half off the frame, which is what the old ghost clamped for */
const EDGE_X = 56, EDGE_TOP = 40;

const lerp = (a, b, t) => a + (b - a) * t;

export function createCarry(rig, tw, v) {
  /* v: host — the `.sc-hand` element · rect() — the stage in client coords ·
     face(i) — the sheet's contents as nodes · done() — a carry ended */
  let c = null;
  const css3d = new CSS3DRenderer({ element: v.host });
  /* the renderer sets `overflow: hidden` on whatever element it is handed,
     which is the ONE thing this surface exists not to do — the can it is
     carrying to sits below the stage's foot. Undone here rather than in the
     stylesheet because it is an inline style. */
  v.host.style.overflow = "visible";
  const scene = new THREE.Scene();

  /* CSS3DRenderer's own `fov`: an element of W px at camera depth d renders
     at W · scale · fov / d screen px */
  const fov = () => rig.size.h / (2 * Math.tan(CAM.fov * Math.PI / 360));
  const depth = p => -(p.x * m.elements[2] + p.y * m.elements[6] +
                       p.z * m.elements[10] + m.elements[14]);
  /* the camera's own inverse, borrowed rather than built: `begin` and `apply`
     both point this at `camera.matrixWorldInverse` before anything reads it */
  let m;

  /* a point on the client glass → a world point at `dist` in front of the eye */
  /* `loose` skips the clamp: it is there to keep the card on the glass while
     it follows a pointer, and the can is deliberately in the corner — a
     clamped fall would land beside it rather than in it */
  function world(x, y, dist, loose) {
    const r = v.rect(), cam = rig.camera;
    const cx = loose ? x : Math.max(r.left + EDGE_X, Math.min(r.right - EDGE_X, x));
    const cy = loose ? y : Math.max(r.top + EDGE_TOP, y);
    const n = new THREE.Vector3(
      ((cx - r.left) / Math.max(1, r.width)) * 2 - 1,
      -((cy - r.top) / Math.max(1, r.height)) * 2 + 1, 0.5).unproject(cam);
    const dir = n.sub(cam.position).normalize();
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    return cam.position.clone().addScaledVector(dir, dist / Math.max(0.05, dir.dot(fwd)));
  }

  /* the two faces the card can wear. `sheet` is the real sheet's own markup,
     so at full size the carried thing is indistinguishable from what was in
     the drawer a frame ago. */
  function shape(name) {
    if (c.shape === name) return;
    c.shape = name;
    if (name === "doc") {
      c.el.className = "sc-carry doc";
      c.el.replaceChildren(Tycho.docArt(),
        T.el("span", { class: "lab" }, c.name));
    } else {
      c.el.className = "sc-face sc-carry";
      c.el.replaceChildren(...v.face(c.i));
    }
    paint();
  }
  function paint() { c.el.classList.toggle("bad", !!c.bad); }

  /* -- the lift ------------------------------------------------------------
     Captured BEFORE the folder is emptied, so the card's first frame is the
     sheet's last one: same world transform, same size, same words. */
  function begin(i, f, name, x, y) {
    end();
    const h0 = parseFloat(f.face.style.height) || DIM.bodyH;
    const from = f.faceObj.getWorldPosition(new THREE.Vector3());
    const fromQ = f.faceObj.getWorldQuaternion(new THREE.Quaternion());
    rig.camera.updateMatrixWorld();
    m = rig.camera.matrixWorldInverse;
    const el = document.createElement("div");
    el.style.width = DIM.folderW + "px";
    el.style.height = h0 + "px";
    /* the stylesheet cannot say this: CSS3DRenderer writes `pointer-events:
       auto` inline on every element it is handed, and an inline rule beats a
       class. A card under the finger that takes the pointer is a card that
       eats the release that was meant to drop it. */
    el.style.pointerEvents = "none";
    const obj = new CSS3DObject(el);
    scene.add(obj);

    c = { i, f, name, el, obj, from, fromQ, h0, shape: "", bad: false,
          t: 0, shrink: 1, locked: false,
          /* the sheet's apparent height right now — scale is 1 in the
             drawer, so this is the whole of it */
          screen0: h0 * fov() / Math.max(1, depth(from)),
          aim: world(x, y - AIM_UP, carryDist(from)) };
    shape("sheet");

    /* the folder is emptied where it stands: the sheet collapses into the
       body at the exact instant the card appears over it, and the tab goes
       with the paper. `pop` rather than a display flag because the renderer
       rewrites `display` on every visible object each frame. */
    c.wasPop = f.pop;
    tw.cancel(f, "pop");
    f.pop = 0;
    f.tabObj.visible = false;
    f.body.classList.add("gone");

    /* inOut, not out: the paper is drawn out of the slot rather than
       flicked out of it, and the whole shrink is legible instead of being
       over in the first fifty milliseconds */
    tw.to(c, "t", 1, TIME.lift, Ease.inOut);
    apply();
  }

  /* how far in front of the eye the carry plane sits — well clear of the
     drawer, so nothing in the cabinet can ever occlude what is in hand */
  const carryDist = from => Math.max(240, depth(from) * 0.46);

  function aim(x, y) {
    if (!c || c.locked) return;
    const p = world(x, y - AIM_UP, carryDist(c.from));
    c.aim.set(p.x, p.y, p.z);
  }

  function over(hit) {
    if (!c || c.bad === hit) return;
    c.bad = hit;
    paint();
  }

  /* -- every frame, from the scene's rAF ------------------------------------ */
  function apply() {
    if (!c) return;
    const cam = rig.camera;
    cam.updateMatrixWorld();
    m = cam.matrixWorldInverse;
    const e = c.t;
    const w = lerp(DIM.folderW, DOC_EL_W, e), h = lerp(c.h0, DOC_EL_H, e);
    c.el.style.width = w.toFixed(1) + "px";
    c.el.style.height = h.toFixed(1) + "px";
    const p = c.from.clone().lerp(c.aim, e);
    p.z += Math.sin(Math.PI * e) * ARC_Z;
    c.obj.position.copy(p);
    c.obj.quaternion.copy(c.fromQ).slerp(cam.quaternion, e);
    /* THE SHRINK RUNS AHEAD OF THE TRAVEL: an ease of its own on top of the
       lift's, so the paper is small while it is still on its way rather
       than a full-size sheet flying across the screen and collapsing at the
       end. It is also what puts the content swap somewhere the eye can't
       catch it. */
    const want = lerp(c.screen0, DOC_H, 1 - (1 - e) ** 1.5) * c.shrink;
    c.obj.scale.setScalar(want * Math.max(1, depth(p)) / (h * fov()));
    shape(e >= SWAP ? "doc" : "sheet");
    scene.updateMatrixWorld(true);
    css3d.render(scene, cam);
  }

  /* -- into the can --------------------------------------------------------
     The aim itself is tweened rather than a second position: the card is
     already flying to `aim` every frame, so moving the target IS the fall,
     and the two motions cannot disagree. */
  function toCan(pt, then) {
    if (!c) return then?.();
    c.locked = true;
    const to = world(pt.x, pt.y, carryDist(c.from), true);
    for (const k of ["x", "y", "z"]) tw.to(c.aim, k, to[k], TIME.canDrop, Ease.in);
    /* `then` FIRST, and the folder is not restored: the file is going in the
       can, so springing its sheet back into the drawer for the length of the
       server round-trip would show it undoing the thing it just did */
    tw.to(c, "shrink", 0.4, TIME.canDrop, Ease.in, () => { then?.(); end(false); });
  }

  /* -- back into the drawer -------------------------------------------------
     The lift, run backwards: the card grows into the sheet as it travels,
     swaps back to the paper at the same place it left it, and lands exactly
     on the transform it was cut from — so the re-seat is a swap, not a move. */
  function putBack(then) {
    if (!c) return then?.();
    c.locked = true;
    c.bad = false;
    paint();
    tw.to(c, "t", 0, TIME.back, Ease.inOut, () => {
      Sound?.click?.();
      end();
      then?.();
    });
  }

  /* the card leaves the page — CSS3DRenderer never removes an element it
     placed — and, unless the paper is not coming back, the folder is filled
     again. `restore` is false on exactly one path: the drop on the can, where
     the file has left the drawer for good (rig.ensure re-fills a folder on
     every re-mount, so the reset is not only here). */
  function end(restore = true) {
    if (!c) return;
    const { f } = c;
    tw.cancel(c, "t"); tw.cancel(c, "shrink");
    for (const k of ["x", "y", "z"]) tw.cancel(c.aim, k);
    c.obj.removeFromParent();
    c.el.remove();
    if (restore) {
      f.pop = c.wasPop;
      f.tabObj.visible = true;
      f.body.classList.remove("gone");
    }
    c = null;
    v.done?.();
  }

  return { begin, aim, over, apply, toCan, putBack, dispose: () => end(),
           resize: (w, h) => css3d.setSize(Math.max(1, w), Math.max(1, h)),
           get active() { return !!c; } };
}
