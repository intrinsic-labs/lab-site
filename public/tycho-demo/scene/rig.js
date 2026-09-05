/* RIG — the cabinet as an object in space, and nothing about files.

   EVERYTHING IS DOM (rebuilt 2026-09-01 after the first build's occlusion
   bugs). The first build drew edges in WebGL and hung DOM labels on them, and
   the two could not occlude each other: WebGL sits on a canvas beneath the
   whole CSS3D layer, so a shut drawer's caption showed through the tab in
   front of it. So now every face of the cabinet — the carcass's five sides,
   a drawer's front and its thickness, the box's floor and walls, a folder's
   body, its tab, the sheet — is an OPAQUE DOM ELEMENT with its edges as CSS
   borders, a CSS3DObject in one scene graph, transformed by one camera. The
   browser's own `preserve-3d` depth-sorts them against each other: a tab
   behind a sheet is hidden by the sheet, with no per-frame test and no way
   to get it wrong. The type on them is real DOM text with the browser's
   hinting, which canvas text at a 2x tablet DPR never is.

   three.js is here for the camera and CSS3DRenderer only; nothing is drawn
   into a canvas. (If a tablet's compositor fights this, the fallback is
   textured quads in WebGL, and it replaces this file alone.)

   Type is placed here, never written here: the DOM content of every element
   is labels.js's business. PERSPECTIVE camera, straight on.
   THE PALETTE IS CSS, so the scene cannot drift from the design system.

   FAUX 3D (Asher, 2026-09-02, off the Severance card): at rest this is a
   flat line drawing — one line colour, one weight, no shading, no frame —
   and the depth is only given away by motion. The solids are still opaque
   and still sorted by the browser, which is what draws the hidden lines
   removed for free. */
"use strict";

import * as THREE from "../vendor/three/three.module.min.js";
import { CSS3DRenderer, CSS3DObject } from "../vendor/three/CSS3DRenderer.js";
import { DIM, CAM } from "./dims.js";

const HALF = Math.PI / 2;

/* a CSS3DObject wrapping a fresh element of the given class, sized in world
   units (= CSS px), placed at (x, y, z) in its parent's space */
function label(cls, w, h, x, y, z) {
  const el = document.createElement("div");
  el.className = cls;
  el.style.width = w + "px";
  el.style.height = h + "px";
  const o = new CSS3DObject(el);
  o.position.set(x, y, z);
  return o;
}
/* the six orientations a solid can take; `face` names which way its front
   points, and the element is placed by its centre */
function solid(cls, w, h, x, y, z, face) {
  const o = label(cls, w, h, x, y, z);
  if (face === "up") o.rotation.x = -HALF;
  else if (face === "down") o.rotation.x = HALF;
  else if (face === "right") o.rotation.y = HALF;
  else if (face === "left") o.rotation.y = -HALF;
  return o;
}

export function createRig(cssRoot) {
  const css3d = new CSS3DRenderer({ element: cssRoot });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAM.fov, 1, 20, 9000);
  const D = DIM;
  const root = new THREE.Group();
  scene.add(root);

  /* -- the cabinet ---------------------------------------------------------
     NO CARCASS (Asher, 2026-09-02): the drawers hover in a stack. A frame
     around them was a box drawn for its own sake, and in a line drawing every
     line has to be earning its place. Built once per drawer count.

     n = 0 IS A REAL STATE since cabinets became directories (2026-09-03): a
     cabinet you just made has no drawers yet, and it still has to stand there
     with its caption and its NEW DRAWER menu rather than throw. It draws
     nothing and reports a height of zero, which the cabinet pose floors at
     `minFitH` anyway — so an empty cabinet is framed exactly like a full one,
     with nothing in it. */
  const drawers = [];

  function buildCabinet(n) {
    /* CSS3DRenderer never removes an element it placed; a dropped object's
       element must be taken off the page by hand */
    for (const d of drawers) { root.remove(d.g); d.g.traverse(o => o.element?.remove()); }
    /* the folders are POOLED, so they are not removed — they are stood down
       through `ensure`, which is the one path that also hides their DOM.
       Taking them out of the graph alone left every tab and sheet painted on
       the page forever: CSS3DRenderer only removes an element on its own
       object's `removed` event, and a detached object never fires one. */
    ensure(0, null);
    drawers.length = 0;

    const pitch = D.frontH + D.gap;
    const stackH = Math.max(0, n * pitch - D.gap);
    for (let i = 0; i < n; i++) {
      const y = (n - 1) / 2 * pitch - i * pitch;
      drawers.push(makeDrawer(y));
    }
    return { height: stackH };
  }

  /* -- one drawer ----------------------------------------------------------
     The front panel is a slab: its face (`sc-front`, which labels.js fills
     with the pull and the plate) plus four thin sides for its thickness.
     Behind it the box — floor, two walls, a back — whose borders are the
     rims you look down over. */
  function makeDrawer(y) {
    const g = new THREE.Group();
    g.position.set(0, y, 0);
    root.add(g);
    const hw = D.frontW / 2, hh = D.frontH / 2, zf = D.frontThick, zm = zf / 2;
    const front = label("sc-front", D.frontW, D.frontH, 0, 0, zf);
    g.add(front,
      solid("sc-edge", D.frontW, zf, 0, hh, zm, "up"),
      solid("sc-edge", D.frontW, zf, 0, -hh, zm, "down"),
      solid("sc-edge", zf, D.frontH, -hw, 0, zm, "left"),
      solid("sc-edge", zf, D.frontH, hw, 0, zm, "right"));

    const bw = D.boxW / 2, bh = D.wallTop - D.floorY, by = (D.wallTop + D.floorY) / 2, bz = -D.boxDepth / 2;
    const box = [
      solid("sc-box", D.boxW, D.boxDepth, 0, D.floorY, bz, "up"),
      solid("sc-box", D.boxW, bh, 0, by, -D.boxDepth, "front"),
      solid("sc-box", D.boxDepth, bh, -bw, by, bz, "right"),
      solid("sc-box", D.boxDepth, bh, bw, by, bz, "left")];
    g.add(...box);

    const centre = new THREE.Object3D(); centre.position.set(0, 0, zf); g.add(centre);
    return { g, front: front.element, box: box.map(o => o.element), centre, open: 0, sink: 1 };
  }

  /* -- hanging folders -------------------------------------------------------
     POOLED, never rebuilt: a page turn re-labels and re-slots the same nine
     objects, re-parented into whichever drawer is open. A folder is a body
     (stays put), a sheet that grows UPWARD out of the body when popped (its
     bottom never leaves the drawer, so the folders in front cover it), and a
     tab that rides the sheet's top edge. */
  const folders = [];
  function makeFolder(lane) {
    const g = new THREE.Group();
    const c = D.lanes[lane];
    const bodyY = (D.folderTop + D.folderBot) / 2, tabY = D.folderTop + D.tabH / 2;
    const body = label("sc-body", D.folderW, D.bodyH, 0, bodyY, 0);
    const face = label("sc-face", D.folderW, D.bodyH, 0, bodyY, D.popZ);
    face.visible = false;
    const lift = new THREE.Group();
    const tab = label("sc-tab", D.tabW, D.tabH, c, tabY, D.popZ + 0.3);
    lift.add(tab);
    g.add(body, face, lift);
    return { g, lift, tabObj: tab, faceObj: face, bodyObj: body,
             body: body.element, tab: tab.element, face: face.element,
             lane, pop: 0, slot: 0, state: "" };
  }

  function ensure(count, drawer) {
    while (folders.length < count) folders.push(makeFolder(folders.length % D.lanes.length));
    for (let i = 0; i < folders.length; i++) {
      const f = folders[i];
      const on = i < count;
      f.g.visible = on;
      /* an object out of the graph is never traversed, so it hides itself */
      f.body.style.display = f.tab.style.display = f.face.style.display = on ? "" : "none";
      if (!on) { f.g.removeFromParent(); continue; }
      /* whatever a carry left behind is undone HERE, so the reset exists in
         the one place every re-mount goes through rather than only on the
         path that puts the paper back (scene/carry.js) */
      f.tabObj.visible = true;
      f.body.classList.remove("gone");
      if (drawer && f.g.parent !== drawer.g) drawer.g.add(f.g);
      /* a folder's lane is a function of its position, not its identity */
      if (f.lane !== i % D.lanes.length) {
        f.lane = i % D.lanes.length;
        f.tabObj.position.x = D.lanes[f.lane];
      }
      f.slot = -(D.slotFront + i * D.slotStep);
      f.pop = 0;
      f.g.position.set(0, 0, f.slot);
    }
    return folders.slice(0, count);
  }

  /* `state` is "" | "hover" | "hot"; writing it is the only way the rig is
     told anything about selection */
  function paintFolder(f) {
    for (const el of [f.tab, f.body]) {
      el.classList.toggle("hot", f.state === "hot");
      el.classList.toggle("hover", f.state === "hover");
    }
  }

  function apply() {
    for (const d of drawers) {
      d.g.position.z = d.open * D.travel;
      /* a shut drawer's box is not drawn: with no carcass its walls would
         show through the gaps between the fronts as stray lines */
      const out = d.open > 0.02;
      if (out !== d._out) { d._out = out; for (const el of d.box) el.classList.toggle("out", out); }
    }
    for (const f of folders) {
      if (!f.g.visible) continue;
      /* the folder's bottom never moves: a pop grows it upward, a sink
         shrinks it down into the box, so nothing ever shows beneath the
         drawer floor or above a shut front */
      const d = f.g.parent ? drawers.find(x => x.g === f.g.parent) : null;
      const rise = f.pop * D.popY - (d ? d.sink : 0) * D.sinkY;
      const bh = D.bodyH + Math.min(0, rise), fh = D.bodyH + rise;
      f.lift.position.y = rise;
      f.bodyObj.position.y = D.folderBot + bh / 2;
      f.body.style.height = bh + "px";
      f.faceObj.position.y = D.folderBot + fh / 2;
      f.face.style.height = fh + "px";
      f.faceObj.visible = f.pop > 0.02;
      paintFolder(f);
    }
  }

  let cw = 1, ch = 1;
  function resize(w, h) {
    cw = Math.max(1, w); ch = Math.max(1, h);
    css3d.setSize(cw, ch);
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
  }

  /* the camera is written from a pose bag each frame, never tweened itself */
  function look(p) {
    camera.position.set(p.x, p.y, p.z);
    camera.lookAt(p.tx, p.ty, p.tz);
  }

  function render() {
    apply();
    scene.updateMatrixWorld(true);
    css3d.render(scene, camera);
  }

  /* the renderer never takes an element off the page by itself, so every
     solid this rig ever placed is removed by hand */
  function dispose() {
    ensure(0, null);
    for (const d of drawers) { root.remove(d.g); d.g.traverse(o => o.element?.remove()); }
    drawers.length = 0;
    for (const f of folders) f.g.traverse(o => o.element?.remove());
    folders.length = 0;
  }

  return { camera, drawers, folders, buildCabinet, ensure, resize,
           look, render, dispose, DIM: D,
           /* the whole stack slides sideways when the cabinet pages — the
              old bank leaves, the next arrives — as a flipbook would draw it */
           get shift() { return root.position.x; },
           set shift(x) { root.position.x = x; },
           get size() { return { w: cw, h: ch }; } };
}
