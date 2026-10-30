"use strict";
const Attempts = {
    KEY: "tycho.review.attempts",
    TTL_MS: 2 * 24 * 3600_000,
    id(slot, request) {
        const sig = JSON.stringify(request);
        const all = this.live();
        if (all[slot]?.sig === sig)
            return all[slot].id;
        const id = `desk-${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(2)).join("").slice(0, 10)}`;
        all[slot] = { sig, id, at: Date.now() };
        Store.set(this.KEY, all);
        return id;
    },
    settle(slot, out) {
        if (out && (out.code === "unknown" || out.code === "offline"))
            return;
        const all = this.live();
        if (!all[slot])
            return;
        delete all[slot];
        Store.set(this.KEY, all);
    },
    live() {
        const all = Store.get(this.KEY, {}) || {};
        const now = Date.now();
        for (const [k, v] of Object.entries(all))
            if (!v || now - (v.at || 0) > this.TTL_MS)
                delete all[k];
        return all;
    },
};
