/* TYCHO KERNEL · the document icon — a file, drawn.

   A sheet with a folded corner, in the same 2px phosphor stroke as the
   cabinet and the trash can, filled with the screen's own ground so it hides
   what is behind it. The name goes underneath in tiny type, because the
   drawing says "a file" and only the words say WHICH file.

   Its own file because two very different surfaces need exactly the same
   object and neither owns it: the drag ghost riding above the pointer
   (`Tycho.dropZone`, kernel/dock.js) and every file lying in the trash view
   (kernel/trash-view.js). A third caller should use this too rather than
   drawing a second document.

   Strokes rather than the 9×9 pixel set (`T.icon`), for the reason the can
   is: at 34px a bitmap glyph reads as a bitmap, and everything else at this
   size in the OS is a line. */
"use strict";

const DOC_NS = "http://www.w3.org/2000/svg";

Object.assign(Tycho, {
  /* the sheet alone, no words — the caller decides whether it is labelled */
  docArt() {
    const svg = document.createElementNS(DOC_NS, "svg");
    svg.setAttribute("viewBox", "0 0 34 44");
    svg.setAttribute("class", "t-doc-art");
    svg.setAttribute("aria-hidden", "true");
    /* the sheet, with the top-right corner turned down, and the fold itself */
    for (const d of ["M2 2 H21 L32 13 V42 H2 Z", "M21 2 V13 H32"]) {
      const p = document.createElementNS(DOC_NS, "path");
      p.setAttribute("d", d);
      svg.append(p);
    }
    return svg;
  },

  /* the sheet with its name under it — one element, ready to place */
  docIcon(name) {
    return T.el("span", { class: "t-doc", title: String(name || "") },
      this.docArt(),
      T.el("span", { class: "lab" }, String(name || "")));
  },
});
