/* TYCHO KERNEL · the trash view — the can, opened.

   Tap the can (kernel/dock.js) and it GROWS to fill the stage: a quick
   scale-up out of its own corner, and inside it the files that are in the
   Trash, lying where they were dropped. Deliberately JUMBLED — this is a
   bin, not a folder, and a bin that sorts its contents into a neat grid is
   lying about what it is. Each file is a CRUMPLED PAPER BALL
   (kernel/crumple-art.js), scattered and slightly turned — a file in the can
   is rubbish, and rubbish looks like rubbish. The neat document icon
   (kernel/doc-icon.js) is what the drag ghost still rides: the sheet crumples
   only once it is in here.

   EXCEPT A CABINET (2026-09-03): a directory does not crumple, so a cabinet
   put here by DELETE CABINET keeps its shape and draws as a small line
   cabinet among the balls. It is one item, because the trash is one `trash`
   of one directory, and PUT BACK restores it with its drawers and their
   files intact.

   THE SCATTER IS SEEDED BY THE FILENAME, so it is stable between opens. A
   jumble that re-jumbles every time you look at it is not a place, it is an
   animation — you could never learn that the thing you want is over on the
   left. Same name, same spot — and the same one of the three balls — until
   the file leaves.

   ONLY WHAT TYCHO PUT HERE. The server can list only what its own `trash`
   op recorded (`files.py`, the `.tycho-trash.json` sidecar): a browser
   cannot read the Mac's Trash, and macOS's own Put Back origin is private
   Finder bookkeeping. So this is honest about its scope in one dim line
   rather than pretending to be the Finder's Trash, and PUT BACK is offered
   for exactly the files it can actually put back.

   ONE VERB, on the right-click menu: PUT BACK. Nothing else — not open, not
   rename, not delete-forever. Emptying the Trash is the Finder's job and
   this screen must never be the thing that makes a delete permanent.

   Tapping blank space closes it, exactly as it closes a popped sheet in the
   drawer. So does HOME. */
"use strict";

/* a deterministic hash of the name → the scatter. Small on purpose: this is
   a layout, not a random source, and it must give the same answer on the
   tablet as on the Mac. */
function seed(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (n) => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h >>> 0) % 10000) / 10000 * n;
  };
}

Object.assign(Tycho, {
  trashView: {
    el: null,

    async open() {
      if (this.el) return;
      const main = document.getElementById("main");
      const ov = T.el("div", { class: "t-trash",
        /* only the ground closes it — a tap that landed on a document, or
           on the note, is not a tap on blank space */
        onpointerup: e => { if (e.target === ov || e.target === floor) this.close(); },
        oncontextmenu: e => { if (e.target === ov || e.target === floor) e.preventDefault(); },
      });
      const head = T.el("div", { class: "head" }, T.el("span", { class: "cap" }, "TRASH"));
      const floor = T.el("div", { class: "floor" });
      ov.append(head, floor);
      main.append(ov);
      this.el = ov;
      /* the scene's own verbs stand down while the bin is open — paging the
         cabinet from inside the trash is a control for a surface this view is
         covering. It only became possible to see them here when the band
         moved out of the stage and into the dock row (2026-09-02). A FLAG
         rather than the class: `dock()` is the one owner of that state, and
         it runs on every focus change, so a class set here was put straight
         back the next time anything redrew the row. */
      Tycho.binOpen = true;
      Tycho.dock();
      /* the grow: one frame on the small transform, then the class — so the
         browser has something to transition FROM */
      requestAnimationFrame(() => ov.classList.add("on"));
      Sound.click();

      let out;
      try { out = await T.api("/api/files", { op: "trash-list" }); }
      catch (e) { out = { entries: [], error: e.message }; }
      if (this.el !== ov) return;      /* closed while the list was in flight */
      this.draw(floor, out.entries || [], out.error);
    },

    draw(floor, entries, error) {
      if (error) return floor.replaceChildren(
        T.el("div", { class: "empty" }, `couldn't read the Trash — ${error}`));
      if (!entries.length) return floor.replaceChildren(
        T.el("div", { class: "empty" }, "NOTHING IN HERE"));
      floor.replaceChildren(...entries.map(f => {
        const r = seed(f.name);
        /* one of the three balls, from the same seed the scatter runs on —
           unless it is a CABINET, which does not crumple: a directory keeps
           its shape in the can and is drawn as the stack it is
           (kernel/crumple-art.js). `r` is still spent either way, so a
           cabinet and a file with the same name land in the same place. */
        const ball = r(3);
        const doc = f.kind === "dir"
          ? Tycho.binnedCabinetIcon(f.name) : Tycho.crumpleIcon(f.name, ball);
        doc.classList.add("t-trash-doc");
        /* percentages, so the jumble survives a rotation of the tablet with
           the same shape rather than piling into a corner */
        doc.style.left = (9 + r(82)).toFixed(2) + "%";
        doc.style.top = (7 + r(86)).toFixed(2) + "%";
        /* turned further than the sheets were: a ball has no upright to
           respect, so a tighter range would just look like a printing error */
        doc.style.transform = `translate(-50%, -50%) rotate(${(r(36) - 18).toFixed(1)}deg)`;
        doc.oncontextmenu = e => {
          e.preventDefault(); e.stopPropagation();
          Tycho.ctxmenu(e.clientX, e.clientY, [
            { label: "PUT BACK", icon: "doc", fn: () => this.putBack(f) },
          ]);
        };
        doc.onpointerup = e => e.stopPropagation();
        doc.title = f.from ? `was ${f.from}` : f.name;
        return doc;
      }));
    },

    async putBack(f) {
      const out = await Tycho.auth(() => T.api("/api/files",
        { op: "putback", name: f.name, token: Tycho.token() }));
      if (!out) return;
      Sound.commit();
      Tycho.toast(`${out.restored} put back`);
      /* the drawer it went home to is on the screen underneath */
      Tycho.refreshCabinet();
      const floor = this.el?.querySelector(".floor");
      if (!floor) return;
      let next;
      try { next = await T.api("/api/files", { op: "trash-list" }); }
      catch { return; }
      if (this.el) this.draw(floor, next.entries || []);
    },

    /* the can is a switch: one tap opens the bin, the next shuts it (Asher,
       2026-09-02) */
    toggle() { return this.el ? this.close() : this.open(); },

    close() {
      const ov = this.el;
      if (!ov) return;
      this.el = null;
      Tycho.binOpen = false;
      /* `dock()` is the one authority on whether the slot is offered — asking
         it again is how the pads come back only when the scene is actually
         the thing on screen */
      Tycho.dock();
      ov.classList.remove("on");
      Sound.click();
      /* it shrinks back into the corner it came out of before it goes */
      setTimeout(() => ov.remove(), 260);
    },
  },
});
