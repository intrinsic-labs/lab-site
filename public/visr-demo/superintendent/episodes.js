"use strict";
const Episodes = {
    split(messages) {
        const roles = new Map(messages.map(m => [m.id, m.role]));
        const answered = m => (m.replyTo || []).filter(id => roles.has(id));
        const away = m => {
            if (m.role === "event" || (m.role === "assistant" && m.routine))
                return true;
            if (m.role !== "assistant")
                return false;
            const to = m.replyTo || [];
            return to.length > 0 && to.every(id => roles.get(id) === "event");
        };
        const out = [];
        const of = new Map();
        for (const m of messages) {
            if (!away(m)) {
                out.push({ kind: "chat", m });
                continue;
            }
            if (m.role !== "assistant" || m.routine) {
                const ep = { kind: "away", items: [m] };
                out.push(ep);
                if (m.role === "event")
                    of.set(m.id, ep);
                continue;
            }
            const eps = [...new Set(answered(m).map(id => of.get(id)).filter(Boolean))];
            if (!eps.length) {
                out.push({ kind: "away", items: [m] });
                continue;
            }
            const [keep, ...rest] = eps.sort((a, b) => out.indexOf(a) - out.indexOf(b));
            for (const ep of rest) {
                keep.items.push(...ep.items);
                for (const x of ep.items)
                    if (x.role === "event")
                        of.set(x.id, keep);
                out.splice(out.indexOf(ep), 1);
            }
            keep.items.push(m);
            keep.items.sort((a, b) => (a.at || "").localeCompare(b.at || ""));
        }
        return out;
    },
    timeline(messages, threads = []) {
        const ms = at => { const n = Date.parse(at); return isNaN(n) ? -Infinity : n; };
        const rows = threads.filter(t => t && t.id).map(t => ({ kind: "thread", t }))
            .sort((a, b) => ms(a.t.at) - ms(b.t.at));
        const out = [];
        let i = 0;
        for (const e of this.split(messages)) {
            while (i < rows.length && ms(this.at(e)) > ms(rows[i].t.at))
                out.push(rows[i++]);
            out.push(e);
        }
        return [...out, ...rows.slice(i)];
    },
    at(e) { return e.kind === "chat" ? e.m.at : e.kind === "thread" ? e.t.at : e.items[0].at; },
    wakes(items) { return items.filter(m => m.role === "event"); },
};
