"use strict";
const Email = {
    RE: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
    link(addr) {
        return T.el("a", { class: "t-email", href: `mailto:${addr}`, title: "Tap to copy" }, addr);
    },
    html(addr) {
        const a = T.esc(addr);
        return `<a class="t-email" href="mailto:${a}" title="Tap to copy">${a}</a>`;
    },
    address(href) {
        let s = String(href || "").replace(/^mailto:/i, "").split("?")[0];
        try {
            s = decodeURIComponent(s);
        }
        catch { }
        return s;
    },
};
document.addEventListener("click", e => {
    const a = e.target.closest?.('a[href^="mailto:" i]');
    if (!a || e.defaultPrevented)
        return;
    e.preventDefault();
    e.stopPropagation();
    const addr = Email.address(a.getAttribute("href"));
    if (addr)
        Tycho.copy(addr, `${addr} copied`);
}, true);
