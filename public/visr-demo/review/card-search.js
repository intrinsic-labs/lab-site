"use strict";
const CardSearch = {
    subject(key) {
        const k = String(key || "");
        const at = k.indexOf(":");
        if (at < 0)
            return k;
        const rest = k.slice(at + 1);
        if (k.startsWith("linear:")) {
            const [, id] = rest.split(":");
            return id && id !== "backlog" ? id : rest;
        }
        return rest;
    },
    ids(item) {
        const out = [];
        for (const v of [item?.outcomeId, item?.blockerId, this.subject(item?.key), item?.key]) {
            const s = String(v || "").trim();
            if (s && !out.some(x => x.toLowerCase() === s.toLowerCase()))
                out.push(s);
        }
        return out;
    },
    normal(q) { return String(q || "").trim().toLowerCase(); },
    byId(item, q) {
        let best = null;
        for (const id of this.ids(item)) {
            const low = id.toLowerCase();
            const at = low.indexOf(q);
            if (at < 0)
                continue;
            const rank = low === q ? 0 : at === 0 ? 1 : 2;
            if (!best || rank < best.rank)
                best = { id, at, rank };
        }
        return best;
    },
    find(items, query) {
        const q = this.normal(query);
        if (!q)
            return [];
        const pq = PrLinks.query(q);
        const hits = [];
        (items || []).forEach((item, order) => {
            const byId = this.byId(item, q);
            const prs = PrLinks.matching(item, pq);
            if (!byId && !prs.length)
                return;
            hits.push({ item, order, prs, id: byId?.id ?? null, at: byId?.at ?? 0, rank: prs.length ? 0 : byId.rank });
        });
        return hits.sort((a, b) => a.rank - b.rank || a.order - b.order);
    },
};
