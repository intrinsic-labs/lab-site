/* REVIEW · source material — one content block, drawn for its own page.

   The item's evidence (the checkpoint, how to review, limitations, facts…)
   is never laid out on the desk itself: each block is a row there
   (sections.js) that pushes its page, and this draws what that page shows.
   Images have their own page (shots.js) and links their own button
   (preview.js).

   An item no brief is written for (brief state `not_applicable`: a Linear
   card, which carries the issue's own words) has a LEAD instead: its first
   markdown block, shown in full on the desk's first page in the brief's
   place (brief.js) and not repeated as a row (sections.js).

     Content.title(b) · Content.hint(b) (how much is inside, for the row)
     Content.body(b, base) → el · Content.lead(item) → block | null */
"use strict";

const Content = {
  hint(b) {
    if (b.type === "markdown") {
      const n = String(b.text || "").length;
      return n < 1000 ? `${n} CHARS` : `${(n / 1000).toFixed(1)}K CHARS`;
    }
    if (b.type === "facts") return `${(b.rows || []).length} FACTS`;
    return String(b.type || "").toUpperCase();
  },

  title(b) {
    if (b.type === "facts") return b.title || "Facts";
    return String(b.title || b.label || b.type);
  },

  lead(item) {
    if (item.brief?.state !== "not_applicable") return null;
    return (item.content || []).find(b => b.type === "markdown") || null;
  },

  body(b, base) {
    if (b.type === "markdown") return T.md(b.text || "", { base });
    if (b.type === "facts") return T.el("div", { class: "t-facts" },
      ...(b.rows || []).map(([k, v]) => T.el("div", { class: "t-kv" },
        T.el("span", { class: "k" }, String(k)), T.el("span", { class: "v" }, String(v)))));
    return T.el("p", { class: "amber" }, `A ${b.type} block this desk can't show yet.`);
  },
};
