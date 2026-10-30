"use strict";
const DocSheet = {
    el: null, route: null, path: null,
    open(path, { route = true, push = true } = {}) {
        if (route && !this.el && this.route?.(path))
            return;
        this.close();
        const view = DocView.create({ path, role: "doc" });
        const close = () => { history.state?.docSheet ? history.back() : this.close(); };
        this.el = T.el("section", { class: "t-docsheet", "data-pid": "doc" }, T.el("div", { class: "t-desk-inner" }, T.el("a", { class: "t-back", href: "#", onclick: e => { e.preventDefault(); close(); } }, "‹ BACK"), view.el));
        document.getElementById("main").append(this.el);
        this.path = path;
        if (push)
            Nav.push({ ...(history.state || {}), docSheet: path });
        view.load();
    },
    close() {
        if (!this.el)
            return false;
        this.el.remove();
        this.el = null;
        this.path = null;
        return true;
    },
};
document.addEventListener("click", e => {
    const a = e.target.closest?.("a.vault[data-vault]");
    if (!a)
        return;
    e.preventDefault();
    DocSheet.open(a.dataset.vault);
});
