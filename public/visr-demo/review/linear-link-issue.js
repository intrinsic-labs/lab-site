"use strict";
const LinkIssueSide = {
    home(f) {
        const L = f.item.linearLinking;
        const entries = (L.issues || []).map(i => {
            const head = T.el("div", { class: "t-link-issue-head" }, LinkRows.text(LinkRows.issue(i)));
            if (!i.linked) {
                const add = T.el("button", { class: "t-block-row t-link-add", type: "button", "data-issue": i.identifier,
                    "aria-label": `Link ${i.identifier} to an outcome` }, T.el("span", { class: "t-block-tick t-link-plus" }, Icons.node("plus")), LinkRows.text(["Not linked", "Link an outcome"]));
                add.onclick = () => this.pick(f, i);
                return T.el("div", { class: "t-link-issue" }, head, add);
            }
            const o = i.linked;
            const off = T.el("button", { class: "t-btn tiny danger t-link-unlink", type: "button", "data-issue": i.identifier,
                "aria-label": `Unlink ${i.identifier}` }, "UNLINK");
            off.onclick = () => f.unlink({ issue: i.identifier, outcome: o.title, from: () => this.home(f),
                link: { workspace: i.workspace, issue: i.identifier, outcomeId: o.outcomeId } });
            return T.el("div", { class: "t-link-issue" }, head, T.el("div", { class: "t-link-pair" }, LinkRows.linked({ text: LinkRows.outcome(o), itemKey: o.itemKey, go: k => f.open(k), label: o.title }), off));
        });
        f.show({ title: "LINK · LINEAR ISSUES",
            kids: [T.el("p", {}, "Each issue holds one outcome. A link starts nothing and changes nothing else."),
                entries.length ? T.el("div", { class: "t-block-list t-link-list" }, ...entries)
                    : T.el("p", { class: "t-say dim" }, "This card lists no issues.")] });
    },
    pick(f, issue) {
        const choices = f.item.linearLinking.outcomeChoices || [];
        let picked = null;
        const rows = choices.map(c => LinkRows.choice({ id: c.outcomeId, text: LinkRows.outcome(c),
            why: c.linkedIssue ? `Linked to ${c.linkedIssue}. Unlink it there first.` : null,
            pick: id => { picked = id; mark(); } }));
        const mark = () => {
            for (const r of rows)
                r.setAttribute("aria-checked", String(r.dataset.pick === picked));
            f.arm(!!picked, picked ? "LINK" : "PICK AN OUTCOME");
        };
        f.show({ title: `LINK ${issue.identifier}`, backLabel: "BACK", onBack: () => this.home(f),
            kids: [T.el("p", {}, "Which outcome does ", T.el("span", { class: "bright" }, `${issue.identifier} — ${issue.title}`), " belong to?"),
                rows.length ? T.el("div", { class: "t-block-list", role: "radiogroup", "aria-label": "Outcome" }, ...rows)
                    : T.el("p", { class: "t-say dim" }, "This project has no draft or approved outcome to link.")],
            verb: { label: "PICK AN OUTCOME", ready: false,
                fn: () => f.send("link", { workspace: issue.workspace, issue: issue.identifier, outcomeId: picked }) } });
    },
};
