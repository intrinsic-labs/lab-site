"use strict";
const Session = {
    KEY: "tycho.desk.view",
    get() { return Store.get(this.KEY, {}) || {}; },
    patch(part) { Store.patch(this.KEY, part); },
    _open() { return this.get().open || {}; },
    enter(key) {
        const open = this._open();
        const t = open[key] || { ms: 0, since: null };
        if (!t.since)
            t.since = Date.now();
        open[key] = t;
        this.patch({ open });
    },
    leave(key) {
        const open = this._open();
        const t = open[key];
        if (!t?.since)
            return;
        t.ms += Date.now() - t.since;
        t.since = null;
        this.patch({ open });
    },
    forget(key) {
        const open = this._open();
        delete open[key];
        this.patch({ open });
    },
    minutes(key) {
        const t = this._open()[key] || { ms: 0, since: null };
        const ms = t.ms + (t.since ? Date.now() - t.since : 0);
        return Math.max(1, Math.round(ms / 60000));
    },
};
