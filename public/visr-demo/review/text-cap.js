/* REVIEW · text cap — a live count under a writing sheet's textarea, for
   items whose acts take a capped text (the runtime's `item.textMax`; a
   chore's line for its task's Discussion).

   Counted the way the act counts it: whitespace collapsed to single spaces,
   then trimmed. Dim while there is room, amber in the last tenth, red past
   the cap; `over()` is how many characters to cut, so SEND can say so before
   the runtime refuses the whole note. No cap on the item, no count.

     TextCap.attach(ta, max) → { el, over(), update() } | null */
"use strict";

const TextCap = {
  size: text => String(text || "").replace(/\s+/g, " ").trim().length,

  attach(ta, max) {
    if (!Number.isInteger(max) || max <= 0) return null;
    const el = T.el("div", { class: "t-foot t-textcap", "aria-live": "polite" });
    const over = () => Math.max(0, TextCap.size(ta.value) - max);
    const update = () => {
      const n = TextCap.size(ta.value), cut = n - max;
      el.className = `t-foot t-textcap ${cut > 0 ? "bad" : n > max * 0.9 ? "amber" : ""}`;
      el.textContent = cut > 0 ? `${n} / ${max} · ${cut} OVER` : `${n} / ${max}`;
    };
    update();
    return { el, over, update };
  },
};
