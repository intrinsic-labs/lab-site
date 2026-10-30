"use strict";
const OfferDecide = {
    taps: new Map(),
    key: (offerId, item) => `${offerId}|${item || ""}`,
    tap(offerId, item) { return this.taps.get(this.key(offerId, item)); },
    async send(offer, { item = null, decision, revision }) {
        const k = this.key(offer.id, item);
        if (this.taps.get(k)?.pending)
            return null;
        const ask = { offerId: offer.id, ...(item ? { item } : {}), decision, revision };
        const slot = `decide|${k}`;
        const body = { ...ask, requestId: Attempts.id(slot, ask) };
        this.taps.set(k, { pending: true, decision });
        this.redraw();
        const out = await Tycho.auth(() => SuptWire.decide(body)).catch(() => null)
            || { ok: false, code: "token", reason: "Not sent: the action token wasn't given." };
        Attempts.settle(slot, out);
        if (out.offer)
            this.taps.delete(k);
        else
            this.taps.set(k, { pending: false, decision, why: out.ok ? "" : out.reason || "The Mac didn't answer.",
                final: out.code === "unsupported" });
        if (out.offer)
            this.patch(out.offer, item);
        else
            this.redraw();
        if (!out.offer && out.ok)
            this.resync();
        this.deck();
        return out;
    },
    FINAL: new Set(["done", "declined", "refused", "failed"]),
    older(held, got) {
        if (this.FINAL.has(held.state) && !this.FINAL.has(got.state))
            return true;
        return !!held.decidedAt && (!got.decidedAt || held.decidedAt > got.decidedAt);
    },
    later(held, got) { return !!got.decidedAt && (!held.decidedAt || got.decidedAt > held.decidedAt); },
    merge(held, got, item) {
        if (held.kind !== "accepts" || got.kind !== "accepts")
            return this.older(held, got) ? held : got;
        const rows = new Map(got.items.map(x => [x.outcomeId, x]));
        return { ...held, items: held.items.map(x => {
                const y = rows.get(x.outcomeId);
                if (!y || this.older(x, y))
                    return x;
                return x.outcomeId === item || this.FINAL.has(y.state) || this.later(x, y) ? y : x;
            }) };
    },
    patch(offer, item = null) {
        for (const c of new Set([Thread, ...Conversation.live])) {
            let moved = false;
            c.messages = c.messages.map(m => {
                if (!m.offers?.some(o => o.id === offer.id))
                    return m;
                moved = true;
                return { ...m, offers: m.offers.map(o => o.id === offer.id ? this.merge(o, offer, item) : o) };
            });
            if (moved) {
                c.save();
                c.emit();
            }
        }
    },
    resync() {
        for (const c of new Set([Thread, ...Conversation.live])) {
            c.resync();
            if (c.live)
                c.now();
        }
    },
    redraw() { for (const c of new Set([Thread, ...Conversation.live]))
        c.emit(); },
    deck() {
        if (typeof App === "undefined" || !App.refresh)
            return;
        App.refresh({ fresh: true }).then(() => { if (!App.view && App.data)
            Home.render(App.data, App.fault, App.checked); })
            .catch(() => { });
    },
    sig(messages) {
        const taps = [...this.taps].map(([k, t]) => `${k}:${t.pending}:${t.why || ""}`).join(",");
        const offers = messages.flatMap(m => (m.offers || []).map(o => o.kind === "accepts"
            ? `${o.id}:${o.items.map(x => `${x.outcomeId}=${x.state}:${x.revision}:${x.result || ""}:${x.reason || ""}`).join(";")}`
            : `${o.id}:${o.state}:${o.revision}:${o.result || ""}:${o.reason || ""}`)).join(",");
        return `${offers}|${taps}`;
    },
};
