"use strict";
const Offers = {
    shown: new Set(),
    STALE: "Changed since it was shown.",
    CLOSED: { refused: "REFUSED", failed: "FAILED", interrupted: "INTERRUPTED" },
    KIND: { vault_edit: "APPROVE?", pr_merge: "MERGE?", grant: "CONFIRM?" },
    waiting(o, x = null) {
        if (o.kind === "accepts" && !x)
            return o.items.some(y => this.waiting(o, y));
        return (x || o).state === "open" || !!OfferDecide.tap(o.id, x?.outcomeId)?.pending;
    },
    node(m) {
        const offers = Array.isArray(m.offers) ? m.offers : [];
        if (!offers.length)
            return null;
        const pills = offers.flatMap(o => o.kind === "accepts" ? o.items.map(x => this.pill(o, x)) : [this.pill(o)]);
        return T.el("div", { class: "t-offers" }, ...pills);
    },
    status(o, x = null) {
        const s = x || o;
        if (this.waiting(o, x))
            return ["WAITING", "wait"];
        if (s.state === "done")
            return [x ? "ACCEPTED" : o.action === "grant" ? "CONFIRMED" : "APPROVED", "ok"];
        if (s.state === "declined")
            return [x ? "NOT ACCEPTED" : "DECLINED", ""];
        return [this.CLOSED[s.state] || String(s.state || "closed").toUpperCase(), "amber"];
    },
    pill(o, x = null) {
        const [label, tone] = this.status(o, x);
        const title = x ? `${x.outcomeId} · ${x.title}` : o.title;
        const at = this.when(x || o);
        const b = T.el("button", { class: `t-offer-pill ${tone}`.trim(), type: "button", "data-offer": o.id,
            ...(x ? { "data-outcome": x.outcomeId } : {}), "aria-label": `${label}: ${title}` }, T.el("span", { class: "t-foot" }, label), T.el("span", { class: "t-offer-pill-title" }, String(title)), at ? T.el("span", { class: "t-offer-pill-at" }, at) : null);
        b.onclick = () => {
            if (tone === "wait")
                b.dispatchEvent(new CustomEvent("t-ask", { bubbles: true, detail: { offer: o.id } }));
            else
                this.sheet(o, x);
        };
        return b;
    },
    sheet(o, x = null) {
        const kids = x ? this.rowRecord(o, x) : this.record(o);
        const s = BSheet.open({ title: x ? "ACCEPT" : this.KIND[o.action] || "APPROVE?", cls: "t-offer-sheet",
            kids: [T.el("div", { class: "t-offer-sheet-body" }, ...kids)] });
        ChatLinks.catch(s.el, link => { s.close(); Chat.follow(link); });
        return s;
    },
    record(o) {
        return [
            T.el("p", { class: "t-offer-title" }, String(o.title)),
            T.el("p", { class: "t-offer-summary" }, String(o.summary)),
            this.link(o.link),
            o.diff ? T.el("pre", { class: "t-offer-diff" }, String(o.diff)) : null,
            o.undoNote ? T.el("p", { class: "t-offer-undo" }, String(o.undoNote)) : null,
            this.verdict(o, this.status(o)[0], "DECLINED") || this.why(o),
        ];
    },
    rowRecord(o, x) {
        return [
            T.el("span", { class: "t-offer-id" }, String(x.outcomeId)),
            T.el("p", { class: "t-offer-title" }, String(x.title)),
            x.line ? T.el("p", { class: "t-offer-line" }, String(x.line)) : null,
            this.evidence(x),
            this.verdict(x, "ACCEPTED", "NOT ACCEPTED", true) || this.why(x),
        ];
    },
    why(s) { return T.el("p", { class: "t-offer-result amber", role: "status" }, String(s.reason || this.STALE)); },
    link(l) {
        if (!l)
            return null;
        return T.el("a", { class: "t-offer-link t-dl", href: l.href,
            ...(l.href.startsWith("#") ? {} : { target: "_blank", rel: "noopener" }) }, String(l.label));
    },
    evidence(x) {
        return x.href ? T.el("a", { class: "t-offer-link t-dl", href: x.href, "aria-label": `Evidence for ${x.title}` }, "Evidence") : null;
    },
    when(o) { return o.decidedAt ? Messages.clock(o.decidedAt) : ""; },
    line(label, tone, words = "", time = "", timeFirst = false) {
        const said = words ? ` · ${words}` : "", at = time ? ` ${time}` : "";
        return T.el("p", { class: `t-offer-result ${tone}`.trim(), role: "status" }, T.el("span", { class: "t-foot" }, label), ...(timeFirst ? [at, said] : [said, at]));
    },
    verdict(x, yes, no, timeFirst = false) {
        if (x.state === "done")
            return this.line(yes, "ok", x.result, this.when(x), timeFirst);
        if (x.state === "declined")
            return this.line(no, "", x.result, this.when(x), timeFirst);
        if (this.CLOSED[x.state])
            return this.line(this.CLOSED[x.state], "amber", x.reason || x.result);
        return null;
    },
    actionEnd(o, tap) {
        const settled = this.verdict(o, o.action === "grant" ? "CONFIRMED" : "APPROVED", "DECLINED");
        if (settled)
            return settled;
        const closed = o.state !== "open";
        const yes = T.el("button", { class: "t-btn ok", type: "button" }, tap?.pending && tap.decision === "yes" ? "SENDING…" : "YES");
        const no = T.el("button", { class: "t-btn", type: "button" }, tap?.pending && tap.decision === "no" ? "SENDING…" : "NO");
        yes.disabled = no.disabled = closed || !!tap?.pending || !!tap?.final;
        yes.onclick = () => OfferDecide.send(o, { decision: "yes", revision: o.revision });
        no.onclick = () => OfferDecide.send(o, { decision: "no", revision: o.revision });
        const why = closed ? o.reason || this.STALE : tap?.why || "";
        return T.el("div", { class: "t-offer-acts" }, yes, no, why ? T.el("p", { class: "t-offer-why amber", role: "status" }, why) : null);
    },
    rowEnd(o, x, tap, withEvidence = true) {
        const evidence = withEvidence ? this.evidence(x) : null;
        const settled = this.verdict(x, "ACCEPTED", "NOT ACCEPTED", true);
        if (settled)
            return T.el("div", { class: "t-offer-settled" }, settled, evidence);
        const closed = x.state !== "open";
        const btn = T.el("button", { class: "t-btn ok", type: "button", "aria-label": `Accept ${x.title}` }, tap?.pending ? "SENDING…" : "ACCEPT");
        btn.disabled = closed || !!tap?.pending || !!tap?.final;
        btn.onclick = () => OfferDecide.send(o, { item: x.outcomeId, decision: "accept", revision: x.revision });
        const why = closed ? x.reason || this.STALE : tap?.why || "";
        return T.el("div", { class: "t-offer-acts" }, btn, evidence, why ? T.el("p", { class: "t-offer-why amber", role: "status" }, why) : null);
    },
};
