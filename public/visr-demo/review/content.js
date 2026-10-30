"use strict";
const Content = {
    hint(b) {
        if (b.type === "markdown") {
            const n = String(b.text || "").length;
            return n < 1000 ? `${n} CHARS` : `${(n / 1000).toFixed(1)}K CHARS`;
        }
        if (b.type === "facts")
            return `${(b.rows || []).length} FACTS`;
        return String(b.type || "").toUpperCase();
    },
    title(b) {
        if (b.type === "facts")
            return b.title || "Facts";
        return String(b.title || b.label || b.type);
    },
    lead(item) {
        if (item.brief?.state !== "not_applicable")
            return null;
        return (item.content || []).find(b => b.type === "markdown") || null;
    },
    body(b, base) {
        if (b.type === "markdown")
            return T.md(b.text || "", { base });
        if (b.type === "facts")
            return T.el("div", { class: "t-facts" }, ...(b.rows || []).map(([k, v]) => T.el("div", { class: "t-kv" }, T.el("span", { class: "k" }, String(k)), T.el("span", { class: "v" }, String(v)))));
        return T.el("p", { class: "amber" }, `A ${b.type} block this desk can't show yet.`);
    },
};
