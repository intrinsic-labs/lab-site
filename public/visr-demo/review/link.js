"use strict";
const Link = {
    el: null,
    mount(retry) {
        this.el = T.el("button", { class: "t-link", type: "button", hidden: true,
            "aria-live": "polite", onclick: () => retry() });
        document.body.append(this.el);
    },
    show(fault, checked) {
        if (!this.el)
            return;
        this.el.hidden = !fault;
        if (!fault)
            return;
        this.el.replaceChildren(T.el("b", {}, "CAN'T REACH THE MAC"), T.el("span", {}, checked ? ` · DECK AS OF ${checked}` : " · NOTHING READ YET"), T.el("span", { class: "t-link-why" }, `${T.fault(fault).head} · tap to try again`));
    },
};
