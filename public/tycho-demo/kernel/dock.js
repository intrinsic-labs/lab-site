/* TYCHO KERNEL · the dock — floating glyph icons, and the trash can.

   THERE IS NO DOCK BAR (Asher, 2026-09-02). The bottom of the display used
   to be a band: a rule across the frame, a raised ground, boxed cells with
   text in them. That is three lines drawn for their own sake, and in a line
   drawing every line has to earn its place. What is left is a small cluster
   of ICONS FLOATING IN SPACE at the bottom left — HOME first, then one per
   running program, then the pinned INTAKE — each a bordered square glyph
   with its name under it. The one on screen inverts; the ones running
   behind it wear a dashed edge.

   ONE ROW, NOT TWO (Asher, 2026-09-02, after the tablet pass): the scene's
   big verbs — the bank pills in the cabinet, the popped file's verbs in a
   drawer — no longer float in a strip of their own above these icons. They
   sit in `.t-dock-slot`, centred in THIS row, vertically in line with the
   glyphs. The dock is a three-column grid so the icons stay pinned to the
   left corner and the can to the right whatever is (or isn't) in the middle.

   At the bottom right, alone, THE TRASH CAN: a line drawing in the same
   phosphor stroke as the cabinet, no box around it, because it is a
   receptacle rather than a program. A file dragged out of an open drawer
   (scene/drag.js) is carried as a DOCUMENT the SCENE draws itself
   (scene/carry.js) and dropped on it; `dropZone` below only says where a drop
   is legal. The can lights while the pointer is over it and the drop trashes
   the file THERE AND THEN — no dialog (Asher, 2026-09-02): carrying a file
   the width of the screen and releasing it on a target is the confirmation
   — and since 2026-09-03 it is the ONLY way to delete: no DELETE pill, no
   MOVE TO TRASH menu item (Asher: one way to do everything).

   THE CAN ALSO OPENS: tapping it grows it into the trash view
   (kernel/trash-view.js). Which is why a release that ended a carry must not
   read as a tap — the same problem a folder tab has, solved the same way,
   with a stamp the drop path lays before any of these handlers run
   (`Tycho.justDropped`, which the can, the program cells and HOME all ask).

   It is hidden while a program is fullscreen — there is nothing to drag onto
   it from in there, and nothing to come back to.

   The dock's own element is in the frame's flow rather than floating over
   `#main`, so nothing it draws can ever land on top of a program's own
   words; "floating" is what the eye reads, not where the box is. */
"use strict";

const NS = "http://www.w3.org/2000/svg";

/* the can, drawn: lid, handle, tapered body, two ribs. Strokes rather than
   the 9x9 pixel set, because at 40px a bitmap glyph reads as a bitmap and
   everything else at this size in the OS is a line. */
function canArt() {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 28");
  svg.setAttribute("class", "t-can-art");
  svg.setAttribute("aria-hidden", "true");
  for (const d of ["M2 7 H22", "M9 7 V3 H15 V7", "M4.5 7 L6 26 H18 L19.5 7",
                   "M9.5 11 V22", "M14.5 11 V22"]) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    svg.append(p);
  }
  return svg;
}

Object.assign(Tycho, {
  /* pinned programs sit at the right end of the cluster, open or not */
  PINNED: ["intake"],
  /* what each program last called `w.setTitle` with — the titlebar that used
     to show it is gone (2026-09-02), so it survives only as the icon's
     tooltip. The LABEL stays the registered title: a dock icon reading
     "TERMINAL — ~/dev/web/glyph" is a paragraph, not a label. */
  titles: new Map(),

  /* the scene asks for its slot here rather than reaching into the DOM, so
     the dock is guaranteed drawn before the band tries to fill it */
  dockSlot() {
    const bar = document.getElementById("dock");
    if (!bar) return null;
    if (!bar.querySelector(".t-dock-slot")) this.dock();
    return bar.querySelector(".t-dock-slot");
  },

  /* THE RELEASE THAT ENDED A CARRY IS NOT A TAP ON ANYTHING (2026-09-02).
     The drop path stamps `_dropAt` on the window's capture phase, so it is
     already set by the time any of these handlers fire. It was the can's own
     private guard until a carry released over the icons was found to open a
     program on top of an in-flight put-back; now the can, the program cells
     and HOME all ask the same question. */
  justDropped() { return performance.now() - (this._dropAt || -1e9) < 600; },

  dockItem(id) {
    const p = this.programs.get(id);
    const running = this.apps.has(id);
    return T.el("span", {
      class: "item" + (!running ? "" : id === this.active ? " on" : " run"),
      title: this.titles.get(id) || p?.title || id,
      onpointerup: () => {
        if (this.justDropped()) return;
        this.trashView.close(); this.open(id);
      },
    },
      T.el("span", { class: "glyph" }, p?.glyph ?? "▪"),
      T.el("span", { class: "lab" }, p?.title ?? id.toUpperCase()));
  },

  dock() {
    const bar = document.getElementById("dock");
    if (!bar) return;
    const cells = bar.querySelector(".t-dock-cells") ||
      T.el("span", { class: "t-dock-cells" });
    /* THE BAND'S CENTRE SLOT (Asher, 2026-09-02, tablet pass): the scene's
       big verbs used to sit in their own strip floating above these icons —
       two bottom-of-screen rows, which "looked kind of weird". There is one
       row now: icons at the left, the context pills centred in it, the can at
       the right. The scene fills this slot (scene/band.js) and the kernel
       only guarantees it exists and survives a redraw — same reason `cells`
       is reused rather than rebuilt, since `dock()` runs on every focus
       change and the band's contents must not be thrown away by it. */
    const slot = bar.querySelector(".t-dock-slot") ||
      T.el("div", { class: "t-dock-slot" });
    const home = T.el("span", {
      class: "item home" + (this.active ? "" : " on"),
      title: "back to the cabinet",
      onpointerup: () => {
        if (this.justDropped()) return;
        this.trashView.close(); this.toScene();
      },
    }, T.el("span", { class: "glyph" }, "▤"), T.el("span", { class: "lab" }, "HOME"));
    const pinned = this.PINNED.filter(id => this.programs.has(id));
    const running = [...this.apps.keys()].filter(id => !pinned.includes(id));
    cells.replaceChildren(home,
      ...running.map(id => this.dockItem(id)),
      ...pinned.map(id => { const c = this.dockItem(id); c.classList.add("pin"); return c; }));
    if (!this._can) {
      this._can = T.el("span", { class: "t-can",
        title: "tap to open or close the bin · drag a file here to trash it",
        /* the release that ENDED A CARRY is not also a tap on the can */
        onpointerup: () => {
          if (this.justDropped()) return;
          this.trashView.toggle();
        } },
        canArt(), T.el("span", { class: "lab" }, "TRASH"));
    }
    /* nothing can be dragged onto it from inside a fullscreen program, so it
       is not offered there — `visibility`, so the cluster never shifts.
       The scene's band goes with it, and for a reason that only appeared once
       the band moved into this row: it used to live in the stage, which a
       fullscreen program covers, so it hid itself. It doesn't any more — the
       dock is always on screen — and a cabinet's ◀ ▶ pads sitting under an
       open REPLAY are controls for a surface that isn't there. */
    /* ONE OWNER for the slot's `off` state: a fullscreen program hides it and
       so does the open bin, and while the trash view set the class itself the
       next `dock()` put it straight back. The view raises a flag; this line
       is the only thing that reads it. */
    this._can.classList.toggle("off", !!this.active);
    slot.classList.toggle("off", !!this.active || !!this.binOpen);
    bar.replaceChildren(cells, slot, this._can);
  },

  /* -- the drop zone -------------------------------------------------------
     The scene owns the GESTURE (scene/drag.js: what was picked up, and when
     8px of movement turns a press into a carry); the kernel owns WHERE it
     can be dropped.

     IT DRAWS NOTHING (2026-09-02). It used to spawn a flat DOM ghost over the
     frame, and that is gone with its last caller: the scene lifts the real
     sheet out of the drawer and shrinks it into the document in its own space
     (scene/carry.js), so a second flat one riding over the frame would be the
     same file twice. What is left is the honest whole of the zone's job —
     where a drop is legal, and lighting the can. */
  dropZone: {
    _live: false,

    start() {
      this.end();
      this._live = true;
    },

    /* where the can is on the glass, for a caller flying its own thing into
       it — the scene must not have to know how the dock is built */
    canRect() {
      const can = Tycho._can;
      return can && !can.classList.contains("off") ? can.getBoundingClientRect() : null;
    },

    /* light the can, and answer whether a release here is a drop. One
       rectangle test, with a margin — a 40px glyph is a small target for a
       thumb that is already carrying something. */
    move(x, y) {
      const can = Tycho._can;
      let hit = false;
      if (can && !can.classList.contains("off")) {
        const r = can.getBoundingClientRect(), pad = 18;
        hit = x >= r.left - pad && x <= r.right + pad &&
              y >= r.top - pad && y <= r.bottom + pad;
        can.classList.toggle("hot", hit);
      }
      return hit;
    },

    end() {
      /* every carry ends here, dropped or abandoned — which makes it the one
         place that can tell the dock's own tap handlers a pointer just went
         up over one of them for a reason that was not a tap
         (`Tycho.justDropped`). */
      if (this._live) Tycho._dropAt = performance.now();
      this._live = false;
      Tycho._can?.classList.remove("hot");
    },
  },
});
