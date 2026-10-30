"use strict";
const SuptDock = {
    QUERY: "(min-width: 761px)",
    PREF: "tycho.chat.dock",
    on: false,
    fits() { return matchMedia(this.QUERY).matches && Math.min(screen.width, screen.height) >= 600; },
    wanted() { return Store.get(this.PREF, null) === "open"; },
    remember(open) { Store.set(this.PREF, open ? "open" : "closed"); },
    enter(layer, mount) {
        this.keep(() => {
            mount();
            this.on = true;
            layer.classList.add("t-split");
            document.documentElement.classList.add("t-split");
        });
        this.press();
        this.foot();
    },
    leave(layer) {
        if (!this.on)
            return;
        this.keep(() => {
            this.on = false;
            layer.classList.remove("t-split");
            document.documentElement.classList.remove("t-split");
        });
        this.press();
        this.foot();
    },
    press() {
        for (const b of document.querySelectorAll(".t-desk .t-topbar-supt"))
            this.label(b);
    },
    label(b) {
        b.setAttribute("aria-label", this.on ? "Attach this card to the chat" : "Ask the Superintendent about this");
    },
    keep(fn) {
        const pane = App.desk?.stack.page();
        if (!pane)
            return fn();
        const anchor = this.line(pane);
        const top = anchor?.getBoundingClientRect().top;
        const ratio = pane.scrollTop / Math.max(1, pane.scrollHeight - pane.clientHeight);
        pane.style.overflowAnchor = "none";
        fn();
        const hold = () => {
            if (anchor?.isConnected)
                pane.scrollTop += anchor.getBoundingClientRect().top - top;
            else
                pane.scrollTop = ratio * (pane.scrollHeight - pane.clientHeight);
        };
        hold();
        requestAnimationFrame(hold);
        setTimeout(hold, 120);
        setTimeout(() => { hold(); pane.style.overflowAnchor = ""; }, 360);
    },
    line(pane) {
        const r = pane.getBoundingClientRect(), y = r.top + 4;
        let el = document.elementFromPoint(r.left + Math.min(40, r.width / 2), y);
        if (!el || !pane.contains(el) || el === pane)
            return null;
        for (let kid = el; kid;) {
            el = kid;
            kid = [...el.children].find(c => { const b = c.getBoundingClientRect(); return b.top <= y && b.bottom > y && b.height > 0; });
        }
        return el;
    },
    FEET: "#main .t-desk > .t-bar, #main .t-settings-save:not([hidden])",
    bar: null,
    sizes: null,
    foot() {
        const root = document.documentElement;
        const bar = this.on ? [...document.querySelectorAll(this.FEET)].find(b => b.offsetParent) || null : null;
        if (bar !== this.bar) {
            this.sizes ||= new ResizeObserver(() => this.foot());
            if (this.bar)
                this.sizes.unobserve(this.bar);
            if (bar)
                this.sizes.observe(bar);
            this.bar = bar;
        }
        if (bar)
            root.style.setProperty("--dock-foot", `${bar.offsetHeight}px`);
        else
            root.style.removeProperty("--dock-foot");
    },
    follow() {
        const main = document.getElementById("main");
        if (!main)
            return;
        new MutationObserver(muts => {
            if ((this.on || this.bar) && muts.some(m => !Chat.el?.contains(m.target)))
                this.foot();
        })
            .observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
    },
    watch() {
        matchMedia(this.QUERY).addEventListener?.("change", () => {
            if (!this.fits()) {
                if (this.on)
                    Chat.hide();
                return;
            }
            if (!App.root || this.on)
                return;
            if (Chat.isOpen()) {
                const own = !!history.state?.chat;
                Chat.hide();
                Chat.show({ entry: false });
                if (own)
                    history.back();
            }
            else if (this.wanted())
                Chat.show({ entry: false });
        });
    },
};
SuptDock.watch();
SuptDock.follow();
