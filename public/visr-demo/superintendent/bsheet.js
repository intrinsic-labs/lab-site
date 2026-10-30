"use strict";
const BSheet = {
    open({ title, cls = "", kids = [], dock = null, onClose = null }) {
        document.querySelector(".t-bsheet")?._close?.();
        const x = T.el("button", { class: "t-bsheet-x", type: "button", "aria-label": "Close", onclick: () => close() });
        x.append(Icons.node("close"));
        const head = T.el("header", { class: "t-bsheet-head" }, x, T.el("h2", { class: "t-bsheet-title" }, title), T.el("span", { "aria-hidden": "true" }));
        const el = T.el("section", { class: `t-bsheet ${cls}`.trim(), role: "dialog", "aria-label": title }, head, ...kids);
        const shade = T.el("div", { class: "t-bsheet-shade", "aria-hidden": "true", onpointerdown: e => { e.preventDefault(); close(); } });
        if (dock) {
            const h = `${Math.round(dock.getBoundingClientRect().height)}px`;
            el.style.bottom = shade.style.bottom = h;
        }
        const onKey = e => { if (e.key === "Escape") {
            e.stopPropagation();
            e.preventDefault();
            close();
        } };
        let open = true;
        const close = () => {
            if (!open)
                return;
            open = false;
            el.remove();
            shade.remove();
            removeEventListener("keydown", onKey, true);
            onClose?.();
        };
        el._close = close;
        addEventListener("keydown", onKey, true);
        const host = document.getElementById("main") || document.body;
        host.append(shade, el);
        return { el, close };
    },
};
