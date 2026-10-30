"use strict";
const LinkOutcomeSide = {
    home(f) {
        const L = f.item.linearLinking;
        if (L.linked)
            return this.linked(f, L);
        let picked = null;
        const rows = [];
        const row = (c, child) => {
            const r = LinkRows.choice({ id: c.identifier, text: LinkRows.issue(c), child,
                why: c.linkedOutcome ? `Linked to ${c.linkedOutcome}. Unlink it there first.` : null,
                pick: id => { picked = id; mark(); } });
            rows.push(r);
            return r;
        };
        const groups = LinkRows.groups(L.issueChoices || []);
        const mark = () => {
            for (const r of rows)
                r.setAttribute("aria-checked", String(r.dataset.pick === picked));
            f.arm(!!picked, picked ? "LINK" : "PICK AN ISSUE");
        };
        const list = groups.flatMap(g => [row(g.top, false), ...g.kids.map(k => row(k, true))]);
        f.show({ title: "LINK TO A LINEAR ISSUE", backLabel: "CANCEL",
            kids: [T.el("p", {}, "Pick the one Linear issue this outcome delivers. A link starts nothing and changes nothing else."),
                list.length ? T.el("div", { class: "t-block-list", role: "radiogroup", "aria-label": "Linear issue" }, ...list)
                    : T.el("p", { class: "t-say dim" }, "No open Linear issue in this project's workspace.")],
            verb: { label: "PICK AN ISSUE", ready: false, fn: () => {
                    const c = L.issueChoices.find(x => x.identifier === picked);
                    f.send("link", { workspace: c.workspace, issue: c.identifier, outcomeId: L.outcomeId });
                } } });
    },
    linked(f, L) {
        const i = L.linked;
        const off = T.el("button", { class: "t-btn tiny danger t-link-unlink", type: "button", "data-issue": i.identifier,
            "aria-label": `Unlink ${i.identifier}` }, "UNLINK");
        off.onclick = () => f.unlink({ issue: i.identifier, outcome: f.item.title || L.outcomeId, from: () => this.home(f),
            link: { workspace: i.workspace, issue: i.identifier, outcomeId: L.outcomeId } });
        const where = i.itemKey ? null : T.el("a", { class: "t-btn tiny t-link-out", href: i.url, target: "_blank",
            rel: "noopener noreferrer" }, "OPEN IN LINEAR");
        f.show({ title: "LINKED LINEAR ISSUE",
            kids: [T.el("p", {}, "This outcome is linked to one Linear issue."),
                T.el("div", { class: "t-block-list t-link-list" }, T.el("div", { class: "t-link-issue" }, T.el("div", { class: "t-link-pair" }, LinkRows.linked({ text: [`${i.identifier} — ${i.title}`, i.itemKey ? `${i.state} · open its Linear card` : i.state],
                    itemKey: i.itemKey, go: k => f.open(k), label: i.identifier }), off))),
                where] });
    },
};
