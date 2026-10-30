"use strict";
const Snapshot = {
    KEY: "tycho.review.snapshot",
    sig(data) {
        if (!data)
            return "";
        const { generatedAt, ...rest } = data;
        return JSON.stringify(rest);
    },
    load() {
        const s = Store.get(this.KEY);
        return s && s.data && Array.isArray(s.data.items) ? s : null;
    },
    save(data, checked) {
        try {
            Store.set(this.KEY, { data, checked });
        }
        catch { }
    },
};
