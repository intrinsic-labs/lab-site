/* INDEX CARD — a floating piece of ruled paper.

   The second of the physical PRIMITIVES (Projects/bets/tycho/docs/
   primitives-thinking-2026-09-01.md §4). Unlike the flip card and the stamp
   it is not an INSTRUMENT — it elicits nothing and leaves no trace. It is the
   surface the instruments act ON: the thing you read, the thing the stamp
   gets stamped onto, the thing a slip clips to. Which is exactly why it is a
   primitive rather than a `.t-box`: those three programs must all be looking
   at the same object.

   PAPER, so it breaks the OS's square-corner law on purpose (design law,
   2026-09-02: "index cards and the flip card are the exception — rounded ~8px
   corners, they're paper"). A title line across the top over a heavier rule,
   then faint ruled lines the body text SITS ON — the rule pitch and the body's
   line-height are one number (--card-rule), so a paragraph lands on the ruling
   rather than drifting off it — and a small foot line under a hairline.

     const card = Tycho.indexCard({ body: md, foot: el });
     card.el · card.set({ title, body, foot })

   `title` is OPTIONAL and the judging bench passes none (Asher, 2026-09-02):
   a card whose whole job is to carry one item's words does not need a row
   across the top telling you it is that card. An aside that must name itself
   uses a `.t-card-cap` line inside the body instead of a title rule.

   `body` is a string (run through T.md), a DOM node, or `lines: [...]` for
   plain text — the three shapes a caller actually has. `foot` takes a node,
   which is how REPLAY hangs its two fair-test boxes and CALIBRATE its notes
   line off the bottom of the card rather than beside it. */
"use strict";

Tycho.indexCard = function indexCard(o = {}) {
  const title = T.el("div", { class: "t-card-title" });
  const body = T.el("div", { class: "t-card-body" });
  const foot = T.el("div", { class: "t-card-foot" });
  const el = T.el("div", { class: "t-card" + (o.small ? " small" : "") },
    title, body, foot);

  /* the three shapes a body arrives in, normalized to one node */
  function content(v, lines) {
    if (lines) return T.el("div", { class: "t-card-lines" },
      ...lines.map(l => T.el("div", {}, String(l))));
    if (v == null) return null;
    return v.nodeType ? v : T.md(v);
  }

  function set(next = {}) {
    if ("title" in next) {
      title.textContent = next.title || "";
      title.style.display = next.title ? "" : "none";
    }
    if ("body" in next || "lines" in next) {
      const node = content(next.body, next.lines);
      body.replaceChildren(...(node ? [node] : []));
      /* the ruling is drawn on the SCROLLING box, anchored to its content, so
         a long body's rules travel with the text instead of staying put */
      body.scrollTop = 0;
    }
    if ("foot" in next) {
      const f = next.foot;
      foot.replaceChildren(...(f == null ? [] : [f.nodeType ? f : document.createTextNode(String(f))]));
      foot.style.display = f == null ? "none" : "";
    }
    return card;
  }

  const card = { el, set, get body() { return body; }, get foot() { return foot; } };
  set({ title: o.title ?? "", body: o.body, lines: o.lines, foot: o.foot ?? null });
  return card;
};
