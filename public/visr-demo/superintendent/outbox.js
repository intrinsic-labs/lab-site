"use strict";
const Outbox = {
    KEY: "tycho.chat.outbox",
    list() { const l = Store.get(this.KEY, []); return Array.isArray(l) ? l : []; },
    save(list) { return Store.set(this.KEY, list); },
    get(id) { return this.list().find(e => e.client_id === id) || null; },
    id() { return `supt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; },
    add(body, was) {
        const entry = { client_id: this.id(), body, was, at: new Date().toISOString(), state: "sending", reason: "" };
        if (this.save([...this.list(), entry]))
            return entry;
        const lean = { ...entry, was: { text: was?.text || "", cards: was?.cards || [],
                files: (was?.files || []).map(({ thumb, ...f }) => f) } };
        return this.save([...this.list(), lean]) ? lean : null;
    },
    patch(id, fields) {
        this.save(this.list().map(e => (e.client_id === id ? { ...e, ...fields } : e)));
        return this.get(id);
    },
    drop(id) { this.save(this.list().filter(e => e.client_id !== id)); },
    next() { return this.list().find(e => e.state === "sending") || null; },
};
