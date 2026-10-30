"use strict";
const Drafts = {
    KEY: "tycho.desk.drafts",
    WRITE_MS: 300,
    mem: null, timer: 0,
    all() { return this.mem ??= (Store.get(this.KEY, {}) || {}); },
    write(now = true) {
        clearTimeout(this.timer);
        this.timer = 0;
        if (now) {
            if (this.mem)
                Store.set(this.KEY, this.mem);
        }
        else
            this.timer = setTimeout(() => this.write(true), this.WRITE_MS);
    },
    get(id) { return { text: "", files: [], ...(this.all()[id] || {}) }; },
    has(id) {
        const d = this.all()[id];
        return Boolean(d && (String(d.text || "").trim() || String(d.nextLook || "").trim() || d.by || (d.files || []).length));
    },
    set(id, patch) {
        const all = this.all();
        all[id] = { ...this.get(id), ...patch, at: Date.now() };
        this.write(false);
    },
    clear(id) {
        const all = this.all();
        delete all[id];
        this.write();
    },
    clearItem(key, upTo = Infinity) {
        const all = this.all();
        for (const id of Object.keys(all))
            if (id.startsWith(key + "|") && (all[id].at || 0) <= upTo)
                delete all[id];
        this.write();
    },
};
addEventListener("pagehide", () => Drafts.write());
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden")
    Drafts.write(); });
