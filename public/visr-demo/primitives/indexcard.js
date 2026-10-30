"use strict";
Tycho.indexCard = function indexCard(o = {}) {
    const title = T.el("div", { class: "t-card-title" });
    const body = T.el("div", { class: "t-card-body" });
    const foot = T.el("div", { class: "t-card-foot" });
    const el = T.el("div", { class: "t-card" + (o.small ? " small" : "") }, title, body, foot);
    function content(v, lines) {
        if (lines)
            return T.el("div", { class: "t-card-lines" }, ...lines.map(l => T.el("div", {}, String(l))));
        if (v == null)
            return null;
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
