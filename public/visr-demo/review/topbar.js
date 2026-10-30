"use strict";
const TopBar = {
    render({ title, back, copy, label = "Back to the cards", face = null }) {
        const btn = T.el("button", { class: "t-topbar-back", type: "button", "aria-label": label,
            onclick: () => back() }, "‹");
        const text = String(title || "");
        const end = face ? T.el("button", { class: "t-topbar-supt", type: "button",
            onclick: () => face() }, Face.node(), CardRef.glyph(false)) : null;
        if (end)
            SuptDock.label(end);
        if (!copy)
            return T.el("nav", { class: "t-topbar" }, T.el("div", { class: "t-topbar-row" }, btn, T.el("div", { class: "t-topbar-title" }, text), end));
        const put = () => Tycho.copy(String(copy), "reference copied");
        const name = T.el("button", { class: "t-topbar-title", type: "button", title: "Copy a reference for an agent", onclick: put }, text);
        const mark = T.el("button", { class: "t-topbar-copy", type: "button", "aria-label": "Copy a reference for an agent", onclick: put });
        mark.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            + 'stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">'
            + '<rect x="8" y="8" width="12" height="12"/><path d="M16 8V4H4v12h4"/></svg>';
        return T.el("nav", { class: "t-topbar" }, T.el("div", { class: "t-topbar-row" }, btn, name, mark, end));
    },
};
