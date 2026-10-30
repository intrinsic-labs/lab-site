"use strict";
const AskDock = {
    HOLD_MS: 4000,
    DISMISSED: "tycho.ask.dismissed",
    KEEP: 200,
    dismissed() { return new Set(Store.get(this.DISMISSED, [])); },
    dismiss(id, on = true) {
        const ids = [...this.dismissed()].filter(x => x !== id);
        if (on)
            ids.push(id);
        Store.set(this.DISMISSED, ids.slice(-this.KEEP));
    },
    key: (o, x) => `${o.id}|${x ? x.outcomeId : ""}`,
    create() {
        const el = T.el("section", { class: "t-ask", "aria-label": "Waiting on your answer", hidden: "" });
        let msgs = [], at = null, timer = 0;
        let asked = new Set();
        const held = new Map();
        const parts = o => (o.kind === "accepts" ? o.items : [null]);
        function draw(messages = msgs) {
            msgs = messages;
            const now = Date.now();
            const offers = [...new Map(msgs.flatMap(m => m.offers || []).map(o => [o.id, o])).values()];
            const waiting = new Set();
            for (const o of offers)
                for (const x of parts(o))
                    if (Offers.waiting(o, x))
                        waiting.add(AskDock.key(o, x));
            for (const k of asked)
                if (!waiting.has(k) && !held.has(k))
                    held.set(k, now + AskDock.HOLD_MS);
            for (const [k, until] of held)
                if (until <= now || waiting.has(k))
                    held.delete(k);
            asked = waiting;
            const showing = k => waiting.has(k) || held.has(k);
            const away = AskDock.dismissed();
            const list = offers.filter(o => !away.has(o.id) && parts(o).some(x => showing(AskDock.key(o, x)))).reverse();
            clearTimeout(timer);
            if (held.size)
                timer = setTimeout(() => draw(), Math.max(50, Math.min(...held.values()) - now));
            if (!list.length) {
                at = null;
                el.hidden = true;
                el.replaceChildren();
                return;
            }
            if (!list.some(o => o.id === at))
                at = list[0].id;
            const i = list.findIndex(o => o.id === at);
            const o = list[i];
            el.hidden = false;
            if (el.dataset.offer !== o.id)
                el.scrollTop = 0;
            el.className = `t-ask ${o.kind === "accepts" ? "accepts" : "action"}`;
            el.dataset.offer = o.id;
            el.replaceChildren(head(o, i, list), ...(o.kind === "accepts"
                ? o.items.filter(x => showing(AskDock.key(o, x))).map(x => row(o, x))
                : action(o)).filter(Boolean));
        }
        function head(o, i, list) {
            const kind = o.kind === "accepts" ? "ACCEPT" : Offers.KIND[o.action] || "APPROVE?";
            const go = (d, label, glyph) => {
                const b = T.el("button", { class: "t-ask-step", type: "button", "aria-label": label }, glyph);
                b.disabled = !list[i + d];
                b.onclick = () => { at = list[i + d].id; draw(); };
                return b;
            };
            const nav = list.length > 1 ? T.el("span", { class: "t-ask-nav" }, go(-1, "Previous", "‹"), T.el("span", { class: "t-foot" }, `${i + 1} OF ${list.length}`), go(1, "Next", "›")) : null;
            const x = T.el("button", { class: "t-ask-x", type: "button", "aria-label": "Not now: put it away without answering" });
            x.append(Icons.node("close"));
            x.onclick = () => { AskDock.dismiss(o.id); at = list[i + 1]?.id || list[i - 1]?.id || null; draw(); };
            return T.el("div", { class: "t-ask-head" }, T.el("span", { class: "t-foot t-offer-kind" }, kind), T.el("span", { class: "t-ask-ctl" }, nav, x));
        }
        function action(o) {
            return [
                T.el("p", { class: "t-offer-title" }, String(o.title)),
                T.el("p", { class: "t-offer-summary" }, String(o.summary)),
                Offers.link(o.link),
                o.diff ? (o.action === "grant" ? T.el("pre", { class: "t-offer-diff t-offer-call" }, String(o.diff)) : change(o)) : null,
                T.el("p", { class: "t-offer-undo" }, String(o.undoNote || "")),
                Offers.actionEnd(o, OfferDecide.tap(o.id)),
            ];
        }
        function change(o) {
            const open = Offers.shown.has(o.id);
            const pre = T.el("pre", { class: "t-offer-diff", hidden: open ? null : "" }, String(o.diff));
            const btn = T.el("button", { class: "t-btn t-offer-toggle", type: "button", "aria-expanded": String(open) }, open ? "HIDE CHANGE" : "SHOW CHANGE");
            btn.onclick = () => {
                if (Offers.shown.has(o.id))
                    Offers.shown.delete(o.id);
                else
                    Offers.shown.add(o.id);
                draw();
            };
            return T.el("div", { class: "t-offer-change" }, btn, pre);
        }
        function row(o, x) {
            return T.el("div", { class: `t-offer-row ${x.state}`, "data-outcome": x.outcomeId }, T.el("div", { class: "t-ask-row-words" }, T.el("span", { class: "t-offer-id" }, String(x.outcomeId)), T.el("p", { class: "t-offer-title" }, String(x.title)), x.line ? T.el("p", { class: "t-offer-line" }, String(x.line)) : null, Offers.evidence(x)), Offers.rowEnd(o, x, OfferDecide.tap(o.id, x.outcomeId), false));
        }
        return {
            el, draw,
            show(id) {
                AskDock.dismiss(id, false);
                at = id;
                draw();
                el.classList.remove("called");
                requestAnimationFrame(() => el.classList.add("called"));
            },
        };
    },
};
