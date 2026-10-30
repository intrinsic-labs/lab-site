"use strict";
const Preview = {
    button(item, b) {
        const url = String(b.url || "");
        const safe = /^https?:\/\//i.test(url);
        let host = "";
        try {
            host = new URL(url).host;
        }
        catch { }
        const state = T.el("span", { class: "t-foot t-preview-state" }, safe ? "CHECKING…" : "NOT A WEB LINK");
        const el = T.el("button", { class: "t-preview", type: "button", disabled: !safe || null,
            "aria-label": `Copy the link: ${url}`,
            onclick: () => Tycho.copy(url, "Preview link copied") }, T.el("span", { class: "t-preview-label" }, String(b.label || "Link").toUpperCase() + " · COPY LINK"), T.el("span", { class: "t-foot t-preview-host" }, host), state);
        const note = T.el("p", { class: "t-preview-why", hidden: true });
        const box = T.el("div", { class: "t-preview-box" }, el, note);
        if (safe)
            Wire.reach(item.key, url).then(out => {
                if (!out.ok) {
                    state.textContent = "";
                    return;
                }
                el.classList.toggle("down", !out.reachable);
                state.textContent = out.reachable ? "RESPONDING" : "NOT RESPONDING";
                if (!out.reachable) {
                    note.hidden = false;
                    note.textContent = "The Mac couldn't reach this preview just now"
                        + (out.reason ? ` (${out.reason})` : "") + ". Its server or tunnel may be down; the screenshots still show the work.";
                }
            });
        return box;
    },
};
