/* SCENE — the filing cabinet TychoOS boots into, and every move you can
   make in it. Supersedes the desktop, the window manager and drawer3d.

   ONE SCENE, TWO DISTANCES (Asher, 2026-09-01: "it's not like different
   scenes"). The cabinet stands in the room, seen dead level, so it reads as
   a flat drawing until a drawer gives the depth away. Tap a drawer and it
   rolls out while the camera dollies in to look down into it; the folders
   stand up out of the box once it is out. Tap a folder's tab and its sheet
   grows up out of the stack with the file on its face — and a second tap on
   that same TAB puts it back down, because a tab is a toggle and only the
   SHEET opens the file. Open it and the kernel dips the whole view to the
   screen's ground and brings the program up full-screen; closing the program
   dips back to the drawer with that sheet still up. Tap blank space to put a
   sheet back, and again to shut the drawer — there are no CLOSE or PUT BACK
   buttons.

   Composition (each file ignorant of the others' business):
     dims.js    every number
     cam.js     where the eye is, per mode and viewport
     rig.js     the object in space — DOM solids in a CSS3D scene graph
     labels.js  the words on the solids, and the hit layer
     anim.js    the tween clock
     this file  what a tap means, and when to move

   It knows nothing about files or programs: fs-cabinet.js hands it the
   CABINETS — `{cabinets: [{name, drawers}], cabinetMenu?(cabinet, e)}` — and
   one bank is one cabinet, standing on its own. (Before 2026-09-03 it was
   handed a flat drawer list and chopped it into banks of PER_BANK itself,
   which is why a bank was a group of three folders rather than a thing you
   could name or delete.) A cabinet's drawers are
   — `{label, meta, load: async () => ({title, items}), menu?}`
   — and items — `{label, meta, preview (string|async fn), actions:[{label,
   icon, primary, danger, fn}], onOpen, trash?, menu?(x, y)}` — and is called
   back. ONE DRAWER = ONE DIRECTORY: there are no subfolder items.

   The single rAF is scheduled ONLY while something is moving: a cabinet
   sitting there, or a drawer sitting open, costs zero frames.

   NO ROWS (2026-09-02): nothing boxes the stage in. The cabinet's caption
   floats above the drawers and fades away as one opens. Every BIG verb lives
   in one band along the bottom of the stage (band.js) — the two cabinet
   pills out here, the popped file's verbs in a drawer, nothing when there is
   neither. Idle verbs are not drawn at all. */
"use strict";

import { Tweens, Ease } from "./anim.js";
import { createRig } from "./rig.js";
import { createLabels } from "./labels.js";
import { TIME, PER_DRAWER, PER_BANK } from "./dims.js";
import { cabinetPose, drawerPose } from "./cam.js";
import { clip, paginate } from "./pages.js";
import { installInput } from "./input.js";
import { createChrome } from "./chrome.js";
import { createDrag } from "./drag.js";
import { createCarry } from "./carry.js";

function createScene(host, opts = {}) {
  const chrome = createChrome(host, {
    page: d => goPage(page + d),
    bank: d => goBank(bank + d),
    capMenu: e => cabs[bank] && cabMenu?.(cabs[bank], e),
  });
  const { root, stage, cssRoot } = chrome;

  /* -- state ---------------------------------------------------------------- */
  let mode = "cabinet";            /* cabinet | drawer */
  /* ONE BANK IS ONE CABINET (2026-09-03): the cabinets come in already
     grouped, each with its own name and at most PER_BANK drawers, so the
     scene neither chops nor names anything */
  let cabs = [];
  let cabMenu = null;
  let bank = 0;                    /* which cabinet stands in view */
  let di = -1;                     /* the open drawer, as an index INTO THE BANK */
  let all = [], pages = paginate([], PER_DRAWER), page = 0;
  let busy = false, dead = false, token = 0;
  let cabinetH = 0;
  const st = { pop: -1, hover: -1 };
  const cam = { x: 0, y: 0, z: 2000, tx: 0, ty: 0, tz: 0 };
  const tw = new Tweens();

  const rig = createRig(cssRoot);
  const items = () => pages[page]?.items || [];
  /* the rig holds one cabinet's drawers; `D(i)` is the drawer behind rig
     slot i. A cabinet never holds more than PER_BANK — the server refuses a
     fourth (files.py · PER_CABINET) — but the slice is kept so a directory
     that grew one in Finder draws three rather than throwing. */
  const banks = () => Math.max(1, cabs.length);
  const bankList = () => (cabs[bank]?.drawers || []).slice(0, PER_BANK);
  const D = i => bankList()[i];
  const labels = createLabels(rig, {
    /* a drawer's front: open it, shut it if it is the open one, or swap */
    drawer: i => mode === "cabinet" ? openDrawer(i) : i === di ? closeDrawer() : switchDrawer(i),
    drawerMenu: (i, e) => D(i)?.menu?.(e.clientX, e.clientY),
    hover: i => setHover(i),
    /* A TAB IS A TOGGLE, NEVER AN OPENER (Asher's wife's test, 2026-09-02):
       tapping a tab pops its sheet, and tapping the tab of the one already
       popped slides it back down. Opening is a tap on the SHEET — the paper
       you can actually read — which is why the face is the only surface that
       runs the primary verb. */
    tap: (i, on) => {
      const it = items()[i];
      if (!it || busy) return;
      if (i !== st.pop) return pop(i);
      if (on === "tab") { Sound?.click?.(); return unpop(); }
      return primary();
    },
    tabMenu: (i, e) => items()[i]?.menu?.(e.clientX, e.clientY),
    grab: (i, e) => drag.begin(e, i),
    dragged: () => drag.dragged,
    armed: () => drag.armed,
  });

  /* -- carrying a file out of the drawer ------------------------------------
     The gesture is drag.js's, the choreography is carry.js's, and WHERE it
     may land is the kernel's (the trash can, kernel/dock.js) and comes in as
     `opts.zone`. What a drop MEANS is the item's own business: its `trash`
     (or a `danger` verb, for an item that has one). So the scene still owns
     nothing about files.

     ONE OBJECT COMES OUT OF THE DRAWER (Asher, 2026-09-02). The kernel's
     flat DOM ghost is gone entirely, because the thing in flight is the sheet
     itself, lifted out of its slot as a CSS3DObject and shrunk into the
     document. The zone is still asked where a drop is legal and still lights
     the can; it draws nothing at all. */
  const carry = createCarry(rig, tw, {
    host: chrome.hand,
    rect: () => stage.getBoundingClientRect(),
    /* the carried card wears the sheet's own paper — the popped one's real
       contents, preview and all, so the handoff is invisible */
    face: i => {
      const f = rig.folders[i];
      if (st.pop === i && f.face.childNodes.length)
        return [...f.face.childNodes].map(n => n.cloneNode(true));
      return labels.faceContent(items()[i], pages.total);
    },
    done: () => { busy = false; renderActions(); invalidate(); },
  });

  const drag = createDrag({
    /* only a thing that can BE trashed may be picked up: the one place a
       carry can land is the can, so a PROGRAMS row lifted out of its drawer
       would fly the whole way across the screen and then do nothing at all */
    allowed: i => {
      if (mode !== "drawer" || busy || carry.active || !opts.zone) return false;
      const it = items()[i];
      return !!it && (!!it.trash || (it.actions || []).some(a => a.danger));
    },
    start: (i, x, y) => {
      busy = true;                 /* nothing else may move the drawer mid-carry */
      carry.begin(i, rig.folders[i], items()[i]?.label || "", x, y);
      opts.zone.start();
      renderActions();
      invalidate();
    },
    move: (x, y) => {
      carry.aim(x, y);
      const hit = !!opts.zone.move(x, y);
      carry.over(hit);
      invalidate();
      return hit;
    },
    /* A DROP ON THE CAN IS THE COMMIT — no dialog (Asher, 2026-09-02).
       Carrying a file the width of the screen and releasing it on a target
       IS the confirmation; a modal after that is asking the same question
       twice — and since 2026-09-03 the can is the ONLY way to delete: no
       DELETE pill, no MOVE TO TRASH menu item. The item hands over its own
       `trash`; a `danger` verb is the fallback for an item that has no `trash`.
       Anything else — blank space, Escape, a cancelled pointer — puts it
       BACK: the lift run backwards, and no server call at all. */
    end: (i, hit) => {
      const it = items()[i];
      const can = opts.zone.canRect?.();
      opts.zone.end();
      /* FIRST, and on every path: the rAF stops the moment nothing is
         moving, so a release that lands while the lift has already settled
         has to restart the clock or the return tween never gets a frame */
      invalidate();
      if (!hit || !it || !can) return carry.putBack(invalidate);
      carry.toCan({ x: (can.left + can.right) / 2, y: (can.top + can.bottom) / 2 }, () => {
        /* the file is in the can: nothing is popped any more, so OPEN goes
           with it rather than coming back for the length of the server
           round-trip */
        unpop();
        if (it.trash) return it.trash(it);
        const a = (it.actions || []).find(x => x.danger);
        if (a) a.fn(it);
      });
    },
  });

  /* -- the frame loop ------------------------------------------------------- */
  let raf = 0;
  const invalidate = () => { if (!raf && !dead) raf = requestAnimationFrame(frame); };
  function frame(now) {
    raf = 0;
    if (dead) return;
    const moving = tw.step(now);
    /* the carried file is solved from the tween's own numbers, between the
       clock and the render — never as a CSS transition, because the renderer
       rewrites that element's transform on this very line */
    carry.apply();
    rig.look(cam);
    rig.render();
    if (moving) invalidate();
  }

  const ro = new ResizeObserver(() => {
    rig.resize(stage.clientWidth, stage.clientHeight);
    /* the hand is a surface of its own over the frame, so it is squared up
       with the stage by hand rather than by the layout (chrome.js) */
    chrome.syncHand();
    carry.resize(stage.clientWidth, stage.clientHeight);
    if (!busy) moveCam(poseNow(), 0);
    invalidate();
  });

  /* -- camera --------------------------------------------------------------- */
  const aspect = () => rig.size.w / rig.size.h;
  function poseNow() {
    if (mode === "cabinet" || di < 0) return cabinetPose(cabinetH, aspect());
    return drawerPose(rig.drawers[di].g.position.y, aspect());
  }
  function moveCam(p, dur, ease = Ease.inOut, done = null) {
    const keys = ["x", "y", "z", "tx", "ty", "tz"];
    if (!dur) { for (const k of keys) tw.set(cam, k, p[k]); done?.(); return; }
    keys.forEach((k, i) => tw.to(cam, k, p[k], dur, ease, i === 0 ? done : null));
  }

  /* -- the cabinet ---------------------------------------------------------- */
  /* `bank` is clamped rather than reset, so deleting the cabinet you are
     standing at leaves you at the NEAREST remaining one instead of back at
     the front of the drawer */
  function setCabinet(list) {
    cabs = list;
    bank = Math.max(0, Math.min(bank, banks() - 1));
    cabinetH = rig.buildCabinet(bankList().length).height;
    labels.setDrawers(bankList());
    labels.markOpen(di);
    chrome.caption(cabs[bank]?.name || "");
    if (mode === "cabinet") chrome.banks(banks(), bank);
  }

  /* paging the cabinet: the stack slides out one side and the next bank
     slides in from the other. One rig, relabelled at the cut — which is how
     a flipbook would draw it */
  function goBank(b) {
    if (busy || dead || mode !== "cabinet" || b < 0 || b >= banks() || b === bank) return;
    busy = true;
    Sound?.click?.();
    const dir = b > bank ? 1 : -1, W = rig.DIM.frontW * 1.6;
    tw.to(rig, "shift", -dir * W, TIME.bank / 2, Ease.in, () => {
      bank = b;
      setCabinet(cabs);
      rig.shift = dir * W;
      tw.to(rig, "shift", 0, TIME.bank / 2, Ease.out, () => { busy = false; });
      invalidate();
    });
    invalidate();
  }

  function setMode(m) {
    mode = m;
    chrome.mode(m);
    labels.markOpen(di);
  }

  /* -- opening & closing a drawer -------------------------------------------
     Out: the camera dollies, the drawer rolls, and only once it is out do
     the folders stand up out of the box. Home: the folders settle into the
     box FIRST, then it rolls shut — nothing is ever seen poking through a
     closed front (the bug on the first build). */
  async function openDrawer(i) {
    if (busy || dead || i < 0 || i >= bankList().length) return;
    busy = true;
    Sound?.click?.();
    di = i;
    chrome.dim(true);
    setMode("drawer");
    /* the contents are fetched while the camera is on its way, and the
       drawer only rolls once they are in hand — a drawer never rolls out
       empty and fills later */
    moveCam(drawerPose(rig.drawers[i].g.position.y, aspect()), TIME.dolly);
    invalidate();
    let next;
    try { next = await D(i).load(); }
    catch (e) { next = { title: D(i).label, items: [] }; console.error(e); }
    /* the tween that would have cleared `busy` is never started on this path,
       so it is cleared by hand — a bailout that leaves the scene busy leaves
       it frozen for good */
    if (dead || di !== i) { busy = false; return; }
    swap(next);
    const d = rig.drawers[i];
    d.sink = 1;
    tw.to(d, "open", 1, TIME.slide, Ease.out, () => {
      tw.to(d, "sink", 0, TIME.rise, Ease.out);
      busy = false;
      invalidate();
    });
    invalidate();
  }

  /* the folders settle, then `then` — shared by every way a drawer shuts */
  function settle(d, then) {
    unpop();
    tw.to(d, "sink", 1, TIME.sink, Ease.inOut, then);
    invalidate();
  }

  /* it RESOLVES when the drawer is home and the camera has arrived, so a
     caller that must not touch the rig mid-move can await it rather than
     sleeping for the length of the animation and hoping */
  function closeDrawer() {
    if (busy || dead || mode !== "drawer" || di < 0) return Promise.resolve(false);
    busy = true;
    Sound?.click?.();
    const i = di;
    /* the other fronts come back up as the drawer starts home, not when it
       arrives — the transition is what makes it a fade rather than a snap */
    chrome.dim(false);
    return new Promise(resolve => {
      settle(rig.drawers[i], () => {
        tw.to(rig.drawers[i], "open", 0, TIME.shut, Ease.in);
        moveCam(cabinetPose(cabinetH, aspect()), TIME.dolly, Ease.inOut, () => {
          di = -1;
          setMode("cabinet");
          rig.ensure(0, null);
          renderActions();
          /* the pads are the bank pads again — and this must land AFTER the
             mode flip, or they are set for a cabinet the root does not yet
             think it is in and then hidden a moment later (the vanishing-pads
             bug, Asher's tablet test 2026-09-02) */
          chrome.banks(banks(), bank);
          busy = false;
          resolve(true);
        });
        invalidate();
      });
    });
  }

  /* another drawer's front, tapped while one is open: shut this, open that */
  function switchDrawer(i) {
    if (busy || dead) return;
    busy = true;
    const from = di;
    settle(rig.drawers[from], () => {
      tw.to(rig.drawers[from], "open", 0, TIME.shut, Ease.in, () => {
        busy = false;
        rig.ensure(0, null);
        openDrawer(i);
      });
      invalidate();
    });
  }

  /* called with the drawer SHUT: labels and lanes change unseen */
  function swap(next) {
    all = next.items || [];
    pages = paginate(all, PER_DRAWER);
    page = Math.min(next.page || 0, pages.length - 1);
    mount();
  }
  function mount() {
    const p = pages[page];
    rig.ensure(p.items.length, rig.drawers[di]);
    for (const f of rig.folders) { tw.cancel(f, "pop"); f.pop = 0; f.state = ""; }
    labels.setTabs(p.items);
    st.pop = -1; st.hover = -1;
    chrome.strata(pages, page);
    renderActions();
  }

  /* -- the page turn, and stepping into a subfolder --------------------------
     The folders settle as the drawer rolls SHUT, the contents are swapped
     while nothing can be seen, and it rolls back out and they stand up.
     Stepping into a folder is the same cycle, which is right: the things
     really are behind the ones you were looking at. `fn` may await. */
  function cycle(fn) {
    if (busy || dead || di < 0) return;
    busy = true;
    unpop();
    const d = rig.drawers[di];
    tw.to(d, "sink", 1, TIME.sink, Ease.inOut);
    tw.to(d, "open", 0, TIME.rollShut, Ease.inOut, async () => {
      try { await fn(); } catch (e) { console.error(e); }
      if (dead) return;
      tw.to(d, "open", 1, TIME.rollBack, Ease.out, () => {
        tw.to(d, "sink", 0, TIME.rise, Ease.out);
        busy = false;
        invalidate();
      });
      invalidate();
    });
    Sound?.click?.();
    invalidate();
  }
  function goPage(n) {
    if (n < 0 || n >= pages.length || n === page) return;
    cycle(() => { page = n; mount(); });
  }

  /* -- selection ------------------------------------------------------------ */
  function setHover(i) {
    if (st.hover === i) return;
    st.hover = i;
    items().forEach((_, k) => {
      rig.folders[k].state = k === st.pop ? "hot" : k === st.hover ? "hover" : "";
    });
    invalidate();
  }
  function pop(i) {
    const list = items();
    if (busy || mode !== "drawer" || i < 0 || i >= list.length || i === st.pop) return;
    if (st.pop >= 0) tw.to(rig.folders[st.pop], "pop", 0, TIME.popOut);
    st.pop = i;
    tw.to(rig.folders[i], "pop", 1, TIME.popIn, Ease.out);
    labels.setFace(i, list[i], pages.total);
    loadPreview(i, list[i]);
    st.hover = -1;
    list.forEach((_, k) => { rig.folders[k].state = k === i ? "hot" : ""; });
    renderActions();
    Sound?.click?.();
    invalidate();
  }
  function unpop() {
    if (st.pop < 0) return;
    tw.to(rig.folders[st.pop], "pop", 0, TIME.popOut);
    rig.folders[st.pop].state = "";
    st.pop = -1;
    renderActions();
    invalidate();
  }
  /* step through the files */
  function walk(d) {
    const n = items().length;
    if (!n) return;
    const i = (st.pop < 0 ? (d > 0 ? -1 : n) : st.pop) + d;
    if (i < 0 || i >= n) return;
    pop(i);
  }
  async function loadPreview(i, it) {
    const mine = ++token;
    if (typeof it.preview !== "function") { labels.setFaceBody(i, it.preview || ""); return; }
    labels.setFaceBody(i, "…");
    let text = "";
    try { text = await it.preview(); } catch (e) { text = String(e?.message || e); }
    if (mine === token) labels.setFaceBody(i, clip(text));
  }
  function primary() {
    const it = st.pop >= 0 ? items()[st.pop] : null;
    if (!it || busy) return;
    const a = (it.actions || [])[0];
    if (a) a.fn(it); else it.onOpen?.(it);
  }

  /* an item declares its own verbs; closing and putting back are taps on
     blank space, never buttons. Nothing popped means no cluster at all —
     there is nowhere to hang it and nothing for it to act on */
  function renderActions() {
    /* a sheet in the hand has no verbs: OPEN and DELETE belong to a thing
       sitting in the drawer, and the carry's own drop IS the verb */
    const it = mode === "drawer" && st.pop >= 0 && !carry.active ? items()[st.pop] : null;
    chrome.actions(it
      ? (it.actions || (it.onOpen ? [{ label: "OPEN", icon: "doc", fn: () => it.onOpen(it) }] : []))
      : [], it);
  }

  /* -- gestures & keys: input.js -------------------------------------------- */
  const input = installInput(stage, {
    mode: () => mode, busy: () => busy, popped: () => st.pop >= 0,
    count: () => items().length, drawerCount: () => bankList().length,
    openDrawer, closeDrawer, unpop, primary, walk, goPage: d => goPage(page + d),
    goBank: d => goBank(bank + d),
  });

  /* -- life ----------------------------------------------------------------- */
  rig.resize(stage.clientWidth, stage.clientHeight);
  carry.resize(stage.clientWidth, stage.clientHeight);
  ro.observe(stage);
  chrome.mode(mode);

  /* the caption menu rides the same object the cabinets do, so a rename
     lands on the next refresh with nothing else to keep in step */
  function takeNames(cab) {
    if (!cab) return;
    if (cab.cabinetMenu) cabMenu = cab.cabinetMenu;
  }

  function boot(cab) {
    takeNames(cab);
    setCabinet(cab.cabinets);
    renderActions();
    /* the opening move: the eye arrives from a little further back */
    const p = cabinetPose(cabinetH, aspect());
    moveCam({ ...p, z: p.z * 1.35 }, 0);
    moveCam(p, 1500, Ease.out);
    invalidate();
  }

  /* -- re-reading the world without moving anything ---------------------------
     The dock's DRAWER cell and a finished program both land here. The
     cabinet's fronts are relabelled in place (rebuilt only if their count
     changed); the open drawer's contents are refetched and the tabs
     relabelled IN PLACE — no roll, no camera move, and the popped sheet stays
     popped if its file is still there (Asher: switching apps "closes and
     reopens" the drawer — it must not). */
  /* ONE AT A TIME. Two refreshes in flight both awaited a `load()` and then
     wrote the page from whichever answer came back last; a rebuild racing a
     read could leave `di` pointing past the end of the bank. So every call
     queues behind the one before it. */
  let queue = Promise.resolve();
  function refresh(cab) {
    queue = queue.then(() => reread(cab)).catch(e => console.error(e));
    return queue;
  }

  /* the rig cannot be rebuilt under a drawer that is still moving: `di` would
     outrun the new bank and the camera would ask a drawer that no longer
     exists where it is. So the rebuild waits for the stage to be still —
     and gives up rather than cutting in, since another refresh is always
     coming (the dock's DRAWER cell, a finished program). */
  const still = async () => {
    for (let k = 0; busy && !dead && k < 60; k++)
      await new Promise(r => setTimeout(r, 60));
    return !busy && !dead;
  };

  async function reread(cab) {
    if (dead) return;
    takeNames(cab);
    /* the world changed if the cabinets are not the same cabinets — a delete
       and an add in one tick keeps the COUNT and swaps the labels underneath
       an open `di`, which the old count test never saw. Compared as a flat
       signature over both levels, since a cabinet renamed or a drawer added
       inside one both have to rebuild. */
    const sig = list => (list || []).map(c =>
      `${c.name} ${(c.drawers || []).map(d => d.label).join("")}`).join("");
    const rebuilt = cab && sig(cab.cabinets) !== sig(cabs);
    if (rebuilt) {
      if (!await still()) return;
      if (mode !== "cabinet") await closeDrawer();
      if (dead) return;
      setCabinet(cab.cabinets);
      invalidate();
      return;
    }
    if (cab) {
      cabs = cab.cabinets;
      labels.setDrawers(bankList()); labels.markOpen(di);
      chrome.caption(cabs[bank]?.name || "");
    }
    if (mode !== "drawer" || di < 0 || busy) { invalidate(); return; }
    const mine = di;
    let next;
    try { next = await D(di).load(); } catch (e) { console.error(e); return; }
    if (dead || di !== mine || busy) return;
    const popped = st.pop >= 0 ? items()[st.pop].label : null;
    all = next.items || [];
    pages = paginate(all, PER_DRAWER);
    page = Math.min(page, pages.length - 1);
    const list = items();
    const keep = popped == null ? -1 : list.findIndex(it => it.label === popped);
    if (list.length !== rig.folders.filter(f => f.g.visible).length || keep < 0) {
      /* the shape changed, or the popped file is gone: relay the page */
      mount();
      rig.drawers[di].sink = 0;
    } else {
      labels.setTabs(list);
      labels.setFace(keep, list[keep], pages.total);
      loadPreview(keep, list[keep]);
      st.pop = keep;
      list.forEach((_, k) => { rig.folders[k].state = k === keep ? "hot" : ""; });
      chrome.strata(pages, page);
      renderActions();
    }
    invalidate();
  }

  function dispose() {
    dead = true;
    if (raf) cancelAnimationFrame(raf);
    drag.dispose();
    carry.dispose();
    input.dispose();
    ro.disconnect();
    rig.dispose();
    chrome.dispose();
  }

  return {
    el: root, boot, refresh, openDrawer, closeDrawer, pop, unpop, goPage, goBank,
    get mode() { return mode; },
    get busy() { return busy; },
    get drawer() { return di; },
    get index() { return st.pop; },
    dispose,
    _rig: rig,
  };
}

/* the kernel's `Tycho.start()` runs after every classic script; this module
   is the one thing loaded after it, so it announces itself and the kernel
   builds the cabinet on the callback */
Tycho.createScene = createScene;
Tycho.sceneReady?.();
