/* LABELS — every glyph you can read, and the hit layer.

   The rig hangs empty solids in space (a front on each drawer, a tab and a
   body on each folder, a face on each sheet); this fills them with words and
   handlers. Departure Mono at 10px only survives as real DOM text with the
   browser's own hinting, and CSS3DRenderer transforms these elements with
   the camera's own matrix, so the words sit ON the geometry.

   It is also the hit layer. There is no raycaster in this scene: a drawer's
   front, a folder's tab and a popped sheet ARE the buttons, so hover, tap,
   focus, right-click and touch-target sizing are the platform's job rather
   than something re-implemented against a depth buffer. Since every solid
   is DOM and the browser sorts them, what you can see is what you can hit.

   Hooks: drawer(i) · drawerMenu(i, e) · hover(i) · tap(i, on) — `on` is
   "tab" or "face", because the two mean different things (a tab toggles, a
   sheet opens) · tabMenu(i, e) · grab(i, e) — the press that MAY become a
   carry (drag.js) — and dragged()/armed(), which say whether the release
   that just happened was a carry and whether one is being aimed right now. */
"use strict";

/* pointerup on a solid is the tap; a press must not start a stage drag, and
   `down` is where a press that turns into a carry begins */
function press(el, up, menu, down) {
  el.onpointerdown = e => { e.stopPropagation(); down?.(e); };
  el.onpointerup = e => { if (e.button === 0) { e.stopPropagation(); up(e); } };
  el.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); menu?.(e); };
}

export function createLabels(rig, hooks) {
  /* ANDROID'S LONG-PRESS FIRES CONTEXTMENU WHILE THE CARRY IS ALREADY ARMED
     (drag.js holds the press from the moment it lands), so the menu opened
     underneath a file that was being picked up. A right-press never arms —
     drag.js rejects anything but button 0 — so nothing is lost by refusing
     the menu while one is live. */
  const menu = i => e => { if (!hooks.armed?.()) hooks.tabMenu?.(i, e); };
  /* -- drawer fronts -------------------------------------------------------
     A mounted plate carrying the caption, centred on the front — the pull
     bars went 2026-09-02 (Asher: "remove the three lines, centre the
     label"). */
  function setDrawers(list) {
    rig.drawers.forEach((d, i) => {
      const it = list[i];
      d.front.replaceChildren(
        T.el("div", { class: "sc-plate" },
          T.el("span", { class: "sc-plate-name" }, it.label),
          T.el("span", { class: "sc-plate-meta" }, it.meta || "")));
      d.front.setAttribute("role", "button");
      d.front.setAttribute("aria-label", it.label);
      press(d.front, () => hooks.drawer(i), e => hooks.drawerMenu?.(i, e));
    });
  }
  function markOpen(di) {
    rig.drawers.forEach((d, i) => d.front.classList.toggle("open", i === di));
  }

  /* -- folder tabs ----------------------------------------------------------
     Rebuilt only when the page changes — walking the stack rewrites no DOM. */
  function setTabs(items) {
    items.forEach((it, i) => {
      const f = rig.folders[i];
      f.tab.replaceChildren(
        T.el("span", { class: "sc-num" }, it._ord ? String(it._ord).padStart(3, "0") : ""),
        T.el("span", { class: "sc-lab" }, it.label));
      f.tab.setAttribute("role", "button");
      f.tab.setAttribute("aria-label", it.label);
      f.tab.onpointerenter = e => { if (e.pointerType === "mouse") hooks.hover(i); };
      f.tab.onpointerleave = e => { if (e.pointerType === "mouse") hooks.hover(-1); };
      /* a tab and a popped sheet can both be CARRIED (to the trash can); a
         release that was a carry is not also a tap */
      const tap = on => () => { if (!hooks.dragged?.()) hooks.tap(i, on); };
      const grab = e => hooks.grab?.(i, e);
      press(f.tab, tap("tab"), menu(i), grab);
      /* the sheet itself: a tap on the popped face is the primary verb */
      press(f.face, tap("face"), menu(i), grab);
      /* a body is a solid, not a button — but a press on it must not read
         as a blank-space tap either */
      f.body.onpointerdown = e => e.stopPropagation();
      f.body.onpointerup = e => e.stopPropagation();
    });
  }

  /* -- the sheet's face -----------------------------------------------------
     The file IS the preview: name, meta and the first lines of the thing,
     laid out on the paper. A fixed structure so a late-resolving preview
     changes the words, never the shape. */
  function faceContent(item, total) {
    const ord = item?._ord;
    return [
      T.el("div", { class: "sc-face-head" },
        T.el("span", { class: "sc-face-ord" }, ord
          ? `${String(ord).padStart(3, "0")} / ${String(total).padStart(3, "0")}` : "···"),
        T.el("span", { class: "sc-face-label" }, item?.label || "")),
      T.el("div", { class: "sc-face-meta" }, item?.meta || ""),
      T.el("pre", { class: "sc-face-body" }, "")];
  }
  function setFace(i, item, total) {
    rig.folders[i].face.replaceChildren(...faceContent(item, total));
  }
  function setFaceBody(i, text) {
    const pre = rig.folders[i]?.face.querySelector(".sc-face-body");
    if (pre) pre.textContent = text || "";
  }

  return { setDrawers, markOpen, setTabs, setFace, faceContent, setFaceBody };
}
