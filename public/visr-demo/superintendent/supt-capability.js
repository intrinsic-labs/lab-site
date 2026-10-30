"use strict";
const SuptCapability = {
    MODE: { ask_first: "Ask first", all_in: "All in" },
    APPROVAL: { request: "by your request", chip: "confirmed by tap", mode: "allowed by mode", refused: "refused",
        standard: "no approval needed" },
    QUOTE_MAX: 140,
    lines(c) {
        const where = c.revision ? `${c.target} @ ${this.short(c.revision)}` : c.target;
        const quote = c.request?.quote ? String(c.request.quote).replace(/\s+/g, " ").trim() : "";
        return [
            T.el("span", { class: "t-log-cap" }, [this.MODE[c.mode], this.APPROVAL[c.approval], where].filter(Boolean).join(" · ")),
            quote ? T.el("span", { class: "t-log-cap t-log-quote", title: quote }, `“${this.clip(quote)}”`) : null,
            c.overriddenRule ? T.el("span", { class: "t-log-cap" }, `Overrode: ${c.overriddenRule}`) : null,
        ].filter(Boolean);
    },
    clip(s) { return s.length > this.QUOTE_MAX ? `${s.slice(0, this.QUOTE_MAX - 1).trimEnd()}…` : s; },
    short(rev) {
        const r = String(rev);
        if (/^[0-9a-f]{12,}$/i.test(r))
            return r.slice(0, 7);
        return r.length > 16 ? `${r.slice(0, 15)}…` : r;
    },
};
