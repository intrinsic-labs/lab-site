"use strict";
const Pending = {
    items: new Map(), el: null, recover: null,
    mount(recover) {
        this.recover = recover;
        this.el = T.el("div", { class: "t-pending", hidden: true, role: "alert" });
        document.body.append(this.el);
    },
    get(key) { return this.items.get(key) || null; },
    hides(key) { const e = this.items.get(key); return !!e && e.state !== "failed"; },
    start(entry) { this.items.set(entry.key, { ...entry, state: "sending", at: Date.now() }); this.sync(); },
    check(key) { this.patch(key, { state: "checking" }); },
    fail(key, { kind = "refused", reason = "" } = {}) { this.patch(key, { state: "failed", kind, reason, shown: true }); },
    end(key) { if (this.items.delete(key))
        this.sync(); },
    patch(key, part) {
        const e = this.items.get(key);
        if (!e)
            return;
        this.items.set(key, { ...e, ...part });
        this.sync();
    },
    tag(key) {
        const e = this.items.get(key);
        return e?.state === "failed" ? T.el("span", { class: e.kind === "refused" || e.kind === "unknown" ? "bad" : "amber" }, "NOT SENT") : null;
    },
    WORD: { refused: "NOT SENT", unknown: "NO ANSWER", stale: "CHANGED", changed: "CHANGED", gone: "LEFT THE DECK" },
    sync() {
        const all = [...this.items.values()];
        const going = all.filter(e => e.state !== "failed");
        if (typeof Home !== "undefined" && Home.hold)
            Home.hold(going.length === 1
                ? `SENDING ${Fmt.verb(going[0].action)} · ${going[0].title}…`
                : going.length ? `SENDING ${going.length} ANSWERS…` : null);
        if (!this.el)
            return;
        const failed = all.filter(e => e.state === "failed" && e.shown);
        this.el.hidden = !failed.length;
        this.el.replaceChildren(...failed.map(e => this.row(e)));
        this.el.style.top = Link.el && !Link.el.hidden ? `${Link.el.offsetHeight}px` : "";
    },
    row(e) {
        const tone = e.kind === "refused" || e.kind === "unknown" ? "bad" : "amber";
        const go = T.el("button", { class: "t-pending-go", type: "button", "data-key": e.key,
            onclick: () => this.recover?.(e.key) }, T.el("b", { class: tone }, `${this.WORD[e.kind] || "NOT SENT"} · ${Fmt.verb(e.action)} · ${e.title}`), T.el("span", { class: "t-pending-why" }, e.reason), T.el("span", { class: "t-pending-tap" }, e.kind === "gone" ? "TAP TO CLOSE" : "TAP TO OPEN IT AGAIN"));
        const shut = T.el("button", { class: "t-pending-x", type: "button", "aria-label": "Put this away",
            onclick: () => this.patch(e.key, { shown: false }) }, "✕");
        return T.el("div", { class: `t-pending-row ${tone}` }, go, shut);
    },
};
