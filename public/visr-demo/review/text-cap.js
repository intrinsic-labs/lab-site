"use strict";
const TextCap = {
    size: text => String(text || "").replace(/\s+/g, " ").trim().length,
    attach(ta, max) {
        if (!Number.isInteger(max) || max <= 0)
            return null;
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
