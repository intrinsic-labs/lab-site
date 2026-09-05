/* TYCHO KERNEL · the crumpled paper ball — a file, thrown away.

   A file in the can is not a file any more, it is rubbish, and rubbish looks
   like rubbish: the trash view draws each entry as a ball of screwed-up
   paper rather than as the neat sheet it was on the desk (Asher, 2026-09-03).
   The document icon (kernel/doc-icon.js) stays exactly what it was and is
   still what the carry ghost rides — the sheet only becomes a ball once it
   is IN the can, which is the whole joke.

   Same drawing rules as everything else here: one line colour, one weight,
   no shading, no fill but the screen's own ground so the ball hides what is
   behind it. An irregular roundish outline plus a handful of interior crease
   lines — a crumple reads as a crumple because of the creases, not because
   of the blob.

   THREE VARIANTS, chosen by the caller's seed. Two reasons for three rather
   than one: a pile of identical balls reads as a repeated sprite, and a pile
   of procedurally-wobbled ones reads as noise. Three hand-drawn balls, each
   turned a little, is a pile. The seed is the filename's (kernel/trash-view.js),
   so the same file is the same ball every time you open the can — the same
   rule the scatter already follows, for the same reason: a bin you can learn
   is a place, a bin that redraws itself is an animation. */
"use strict";

const CRUMPLE_NS = "http://www.w3.org/2000/svg";

/* Each variant is [outline, ...creases]. Three rules, all earned by drawing
   these badly first:

   The outline is faceted and lumpy but only GENTLY dented. Deep notches turn
   the ball into a star, and a perfectly convex one turns it into a pebble.

   The creases are FEW and OPEN — bent lines that run edge-to-edge or die in
   the middle of a face, meeting at one or two off-centre junctions. Closed
   cells are the failure mode: fill a ball with quadrilaterals and it reads as
   a cut gemstone. Paper folds; it does not facet.

   Every crease also has to be LONG. A short flick of a stroke near the
   outline is realistic and useless: at 56px it is four pixels of noise
   against a 2px line, and three of them make the ball look smudged rather
   than folded. Two junctions and four long folds is the whole budget.

   And the three differ in where the junctions SIT — left, right, high — so
   the pile varies by structure rather than by wobble. Hand-authored inside
   the 44 × 44 box. */
const CRUMPLES = [
  /* the junction left, one long ridge running the height of the ball */
  ["M22 4 L30 7 L33 12 L39 17 L36 24 L38 31 L30 35 L23 40 L15 38 L10 33 L6 27 L8 20 L5 14 L13 10 Z",
   "M13 10 L20 20 L15 38",
   "M20 20 L33 12",
   "M22 28 L31 25 L38 31"],

  /* the junction right, with a second, unconnected fold down the left side */
  ["M18 5 L26 3 L32 8 L38 13 L35 19 L40 26 L33 32 L26 39 L18 39 L11 34 L7 27 L9 20 L4 15 L11 9 Z",
   "M32 8 L26 18 L33 32",
   "M26 18 L38 13",
   "M13 12 L19 24 L18 39",
   "M19 24 L26 18"],

  /* the junction high, with a fold hanging off a second one down to the floor */
  ["M20 4 L28 5 L34 11 L38 18 L34 23 L37 30 L29 34 L22 40 L14 36 L9 30 L11 24 L5 18 L12 10 Z",
   "M20 4 L18 15 L5 18",
   "M18 15 L31 14",
   "M34 23 L26 26 L22 40",
   "M26 26 L18 15"],
];

/* A CABINET DOES NOT CRUMPLE (2026-09-03, when cabinets became real
   directories and DELETE CABINET put one in the can). A folder is not a
   sheet of paper — you cannot screw one up — so a trashed cabinet keeps its
   shape in there and is drawn as what it is: the same three-drawer stack the
   scene draws, flattened to a single line-drawn glyph in this file's idiom.
   One line weight, no shading, the screen's own ground as its fill, hand-
   authored in the same 44 × 44 box the balls live in so the two sit at the
   same weight on the trash floor.

   No variants: the point of three crumples is that a pile of identical balls
   reads as a repeated sprite, and cabinets in the can are not a pile — one
   or two at most, each one a deliberate act. */
const CABINET_BOX = "M7 3 L37 3 L37 41 L7 41 Z";
const CABINET_LINES = ["M7 16 L37 16", "M7 28 L37 28",
                       "M18 9 L26 9", "M18 22 L26 22", "M18 34 L26 34"];

Object.assign(Tycho, {
  /* the ball alone, no words — the caller decides whether it is labelled.
     `seed` is any number; only which of the three it lands on matters. */
  crumpleArt(seed) {
    const [outline, ...creases] = CRUMPLES[Math.abs(Math.floor(seed || 0)) % CRUMPLES.length];
    const svg = document.createElementNS(CRUMPLE_NS, "svg");
    svg.setAttribute("viewBox", "0 0 44 44");
    svg.setAttribute("class", "t-crumple-art");
    svg.setAttribute("aria-hidden", "true");
    const path = (d, cls) => {
      const p = document.createElementNS(CRUMPLE_NS, "path");
      p.setAttribute("d", d);
      if (cls) p.setAttribute("class", cls);
      svg.append(p);
    };
    path(outline);
    for (const c of creases) path(c, "crease");
    return svg;
  },

  /* the ball with its name under it — the same object shape `docIcon` returns,
     so the trash view places one exactly as it placed the other */
  crumpleIcon(name, seed) {
    return T.el("span", { class: "t-doc t-crumple", title: String(name || "") },
      this.crumpleArt(seed),
      T.el("span", { class: "lab" }, String(name || "")));
  },

  /* the cabinet glyph, no words */
  cabinetArt() {
    const svg = document.createElementNS(CRUMPLE_NS, "svg");
    svg.setAttribute("viewBox", "0 0 44 44");
    svg.setAttribute("class", "t-binned-cabinet-art");
    svg.setAttribute("aria-hidden", "true");
    const path = (d, cls) => {
      const p = document.createElementNS(CRUMPLE_NS, "path");
      p.setAttribute("d", d);
      if (cls) p.setAttribute("class", cls);
      svg.append(p);
    };
    path(CABINET_BOX);
    for (const l of CABINET_LINES) path(l, "rule");
    return svg;
  },

  /* a cabinet in the can, with its name under it — the same object shape
     `crumpleIcon` returns, so the trash view places one exactly as it places
     a ball and neither knows about the other */
  binnedCabinetIcon(name) {
    return T.el("span", { class: "t-doc t-binned-cabinet", title: String(name || "") },
      this.cabinetArt(),
      T.el("span", { class: "lab" }, String(name || "")));
  },
});
