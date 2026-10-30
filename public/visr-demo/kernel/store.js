"use strict";
const Store = {
    get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(key);
            return raw == null ? fallback : JSON.parse(raw);
        }
        catch {
            return fallback;
        }
    },
    set(key, value) {
        try {
            if (value == null)
                localStorage.removeItem(key);
            else
                localStorage.setItem(key, JSON.stringify(value));
            return true;
        }
        catch {
            return false;
        }
    },
    patch(key, part) {
        return this.set(key, { ...(this.get(key, {}) || {}), ...part });
    },
};
