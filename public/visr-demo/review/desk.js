"use strict";
const Desk = {
    render(item, ctl) {
        const notice = T.el("div", { class: "t-desk-notice" });
        let stack = null;
        const push = page => stack.push(page);
        const awaiting = Fmt.awaiting(item);
        const status = item.notes?.length ? T.el("section", { class: "t-status" }, T.el("div", { class: "t-label" }, "STATUS"), T.el("ul", { class: "t-list" }, ...item.notes.map(n => T.el("li", {}, String(n))))) : null;
        const briefed = item.brief?.state === "ready" && item.brief.brief;
        let actions = null;
        const send = async (action) => {
            actions.say(null);
            const out = await ctl.mark(action);
            if (out && !out.ok && out.code !== "stale")
                actions.say(out.reason || "not sent");
        };
        const mark = T.el("div", { class: "t-desk-mark" });
        const mine = item.kind === "draft_outcome" || Lanes.happened(item) ? null : Working.toggle(item, { press: send });
        const rule = Fmt.rule(item);
        const inter = T.el("div", { class: "t-desk-inter-slot" });
        const prs = T.el("div", { class: "t-desk-prs" });
        let prSig = null;
        const marked = it => {
            mark.replaceChildren(...Working.head(it, { dismiss: () => send("clear_working") }));
            inter.replaceChildren(...Interactive.head(it));
            mine?.set(it);
            if (PrLinks.sig(it) === prSig)
                return;
            prSig = PrLinks.sig(it);
            prs.replaceChildren(...[PrLinks.strip(it)].filter(Boolean));
        };
        const more = Sections.more(item, push, { saved: () => ctl.saved(item.key), openDoc: ctl.openDoc });
        const inner = T.el("div", { class: "t-desk-inner" }, notice, T.el("header", { class: "t-desk-head" }, T.el("div", { class: "t-foot" }, Fmt.meta(item)), T.el("h1", { class: "t-title" }, String(item.title || item.key)), prs, rule ? T.el("div", { class: "t-foot" }, `BY RULE ${rule.toUpperCase()}`) : null, awaiting ? T.el("div", { class: "t-foot t-awaiting" }, awaiting.mark) : null, item.deferred ? T.el("div", { class: "t-foot" }, `FILED FOR LATER${item.deferred.until ? " · UNTIL " + Fmt.until(item.deferred.until) : ""}`) : null, inter, mark), briefed ? null : status, Brief.render(item, { status: briefed ? status : null, go: Sections.go(item, push) }), more?.el || null);
        const page = T.el("div", { class: "t-desk-page" }, inner);
        const face = ctl.chat ? () => ctl.chat() : null;
        const top = TopBar.render({ title: Cards.title(item), back: () => ctl.back(), copy: item.reference || "", face });
        const root = T.el("div", { class: "t-desk-screen" }, top, page);
        stack = DeskStack.create(root, { face });
        DocSheet.route = path => more?.open(path) || false;
        actions = Actions.render(item, { target: stack.el, act: ctl.act, compose: ctl.compose, park: ctl.park, block: ctl.block, link: ctl.link, tool: mine?.el });
        marked(item);
        const el = T.el("section", { class: "t-desk", "data-pid": "desk" }, stack.el, actions.el);
        return {
            el, page, item, stack,
            loaded: Promise.resolve(),
            editing: () => !!stack.el.querySelector(".t-doc textarea.t-source"),
            flag(node) { notice.replaceChildren(...(node ? [node] : [])); },
            sync(it) { this.item = it; marked(it); },
            key: e => {
                if (e.key === "Escape" && stack.depth()) {
                    stack.back();
                    return true;
                }
                return actions.key(e);
            },
            dispose() { stack.dispose(); if (DocSheet.route)
                DocSheet.route = null; },
        };
    },
};
