"use strict";
const ActionLog = {
    EMPTY: "Nothing yet. Actions the Superintendent takes land here.",
    AHEAD: 240,
    render({ back, follow }) {
        const list = T.el("div", { class: "t-log-list" });
        const said = T.el("p", { class: "t-log-say t-foot amber", role: "status" });
        const end = T.el("div", { class: "t-log-end" });
        const inner = T.el("div", { class: "t-log-inner" }, said, list, end);
        const page = T.el("div", { class: "t-log-page" }, inner);
        const el = T.el("section", { class: "t-log", "data-pid": "supt-log", "aria-label": "Action log" }, TopBar.render({ title: "Action log", back, label: "Back to the Superintendent's settings" }), page);
        const st = { last: null, day: "", more: true, loading: false, alive: true, count: 0 };
        const open = async (key) => {
            said.textContent = "";
            if (await follow({ item: key }) === false)
                said.textContent = Chat.MISSING;
        };
        const load = async () => {
            if (st.loading || !st.more || !st.alive)
                return;
            st.loading = true;
            end.replaceChildren(T.el("span", { class: "t-foot dim" }, "LOADING…"));
            const out = await SuptWire.actions(st.last);
            st.loading = false;
            if (!st.alive)
                return;
            if (!out?.ok) {
                if (out?.code === "unsupported")
                    st.more = false;
                const why = out?.code === "unsupported" ? out.reason : `COULDN'T READ THE ACTION LOG · ${out?.reason || "the Mac didn't answer."}`;
                const fault = T.el("p", { class: "t-chat-fault t-foot amber" }, why);
                if (out?.code === "unsupported")
                    end.replaceChildren(fault);
                else
                    end.replaceChildren(fault, T.el("button", { class: "t-btn tiny", type: "button", onclick: () => load() }, "RETRY"));
                return;
            }
            for (const a of out.actions || []) {
                const day = Messages.day(a.at);
                if (day !== st.day)
                    list.append(T.el("div", { class: "t-chat-when t-foot" }, day));
                st.day = day;
                list.append(this.item(a, open));
                st.count++;
            }
            st.last = out.actions?.at(-1)?.id || st.last;
            st.more = !!out.more && !!out.actions?.length;
            if (st.count)
                end.replaceChildren();
            else
                end.replaceChildren(T.el("p", { class: "t-chat-empty dim" }, this.EMPTY));
            if (st.more && end.getBoundingClientRect().top <= page.getBoundingClientRect().bottom + ActionLog.AHEAD)
                load();
        };
        const near = new IntersectionObserver(seen => { if (seen.some(e => e.isIntersecting))
            load(); }, { root: page, rootMargin: `0px 0px ${ActionLog.AHEAD}px 0px` });
        near.observe(end);
        load();
        return { el, dispose: () => { st.alive = false; near.disconnect(); } };
    },
    item(a, open) {
        const row = this.row(a, open);
        if (!a.undo && !a.undone)
            return row;
        const bar = T.el("div", { class: "t-log-undo" });
        const done = summary => bar.replaceChildren(T.el("span", { class: "t-foot" }, "UNDONE"), ...(summary ? [T.el("span", { class: "t-log-summary" }, summary)] : []));
        if (a.undone)
            done("");
        else {
            const why = T.el("span", { class: "t-log-summary", role: "status" });
            const btn = T.el("button", { class: "t-btn tiny", type: "button", "aria-label": `Undo: ${a.label}` }, "UNDO");
            btn.onclick = async () => {
                btn.disabled = true;
                btn.textContent = "UNDOING…";
                why.textContent = "";
                const out = await Tycho.auth(() => SuptWire.undo(a.undo)).catch(() => null);
                if (out?.ok) {
                    OfferDecide.deck();
                    OfferDecide.resync();
                    return done(out.summary || "");
                }
                btn.disabled = false;
                btn.textContent = "UNDO";
                why.className = "t-log-summary amber";
                why.textContent = out?.reason || "It wasn't undone: the Mac didn't answer, or the action token wasn't given.";
            };
            bar.append(btn, why);
        }
        return T.el("div", { class: "t-log-item" }, row, bar);
    },
    row(a, open) {
        const kids = [
            T.el("span", { class: "t-log-time t-foot" }, Messages.clock(a.at)),
            T.el("span", { class: "t-log-label" }, String(a.label || a.tool || "")),
            a.summary ? T.el("span", { class: "t-log-summary" }, String(a.summary)) : null,
            ...(a.capability ? SuptCapability.lines(a.capability) : []),
            a.ok === false ? T.el("span", { class: "t-log-refused" }, T.el("span", { class: "t-foot amber" }, "REFUSED"), a.error ? T.el("span", {}, ` ${a.error}`) : null) : null,
        ];
        const key = a.target?.key?.startsWith("receipt:") ? null : a.target?.key;
        if (!key)
            return T.el("div", { class: "t-log-row", "data-id": a.id }, ...kids);
        return T.el("button", { class: "t-log-row go", type: "button", "data-id": a.id,
            "aria-label": `${a.label}: open ${a.target.title || key}`, onclick: () => open(key) }, ...kids, T.el("span", { class: "t-navrow-go", "aria-hidden": "true" }, "›"));
    },
};
