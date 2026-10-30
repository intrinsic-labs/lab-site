"use strict";
const SuptProgress = {
    STALE_MS: 30_000,
    TICK_MS: 5_000,
    TIMED: new Set(["tool", "background"]),
    received(p, at = Date.now()) {
        if (!p || typeof p !== "object" || !p.label)
            return null;
        const mac = Date.parse(p.now);
        return { ...p, skew: isNaN(mac) ? 0 : at - mac };
    },
    same(a, b) {
        const key = p => p ? `${p.label}|${p.state}|${p.since}|${p.seenAt}` : "";
        return key(a) === key(b);
    },
    line(p, fallback = "", at = Date.now()) {
        if (!p)
            return { label: String(fallback || ""), suffix: "" };
        const mac = at - (p.skew || 0);
        const label = String(p.label);
        if (this.TIMED.has(p.state)) {
            const since = Date.parse(p.since);
            return { label, suffix: isNaN(since) ? "" : ` · ${this.span(mac - since)}` };
        }
        const quiet = mac - Date.parse(p.seenAt);
        return { label, suffix: quiet > this.STALE_MS ? ` · last activity ${this.span(quiet)} ago` : "" };
    },
    span(ms) {
        const s = Math.max(0, Math.floor(ms / 1000));
        if (s < 60)
            return `${s} s`;
        const m = Math.floor(s / 60);
        if (m < 60)
            return `${m} min`;
        return m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`;
    },
    ticker(fn) {
        let timer = 0;
        return {
            run(on) {
                if (on && !timer)
                    timer = setInterval(fn, SuptProgress.TICK_MS);
                else if (!on && timer) {
                    clearInterval(timer);
                    timer = 0;
                }
            },
        };
    },
};
