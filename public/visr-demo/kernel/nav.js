"use strict";
const Nav = {
    boot: Math.random().toString(36).slice(2, 10),
    at: null,
    restorable: () => false,
    stale(st) { return !!st && st.boot !== this.boot && !this.restorable(st); },
    root(st) { return !st || !!st.root || this.stale(st); },
    depth(st = history.state) { return this.root(st) ? 0 : st.n || 0; },
    push(state) {
        const { root, ...rest } = state || {};
        const next = { ...rest, boot: this.boot, n: this.depth() + 1 };
        history.pushState(next, "");
        this.at = next;
    },
    adopt() {
        const st = history.state;
        if (st && st.boot !== this.boot && this.restorable(st))
            history.replaceState({ ...st, boot: this.boot }, "");
        else if (this.stale(st))
            history.replaceState({ root: true, boot: this.boot }, "");
        this.at = history.state;
    },
    landed: [],
    back(steps) {
        if (steps <= 0)
            return Promise.resolve();
        const landed = new Promise(r => this.landed.push(r));
        history.go(-steps);
        return landed;
    },
};
addEventListener("popstate", e => {
    const was = Nav.at;
    Nav.at = e.state;
    for (const r of Nav.landed.splice(0))
        setTimeout(r);
    if (location.hash || !Nav.root(e.state))
        return;
    if (Nav.root(was)) {
        e.stopImmediatePropagation();
        history.back();
        return;
    }
    if (Nav.stale(e.state)) {
        history.replaceState({ root: true, boot: Nav.boot }, "");
        Nav.at = history.state;
    }
});
