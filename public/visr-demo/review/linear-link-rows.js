"use strict";
const LinkRows = {
    issue: i => [`${i.identifier} — ${i.title}`,
        [i.state, i.parent ? `under ${i.parent}` : null].filter(Boolean).join(" · ")],
    outcome: o => [o.title, `${o.status} · ${o.owner || "no owner"}`],
    text([title, foot], why = null) {
        return T.el("span", { class: "t-block-text" }, T.el("span", { class: "t-block-title" }, title), T.el("span", { class: "t-foot" }, foot), why ? T.el("span", { class: "t-foot amber t-link-why" }, why) : null);
    },
    choice({ id, text, why, pick, child = false }) {
        const r = T.el("button", { class: `t-block-row${child ? " t-link-child" : ""}`, type: "button", role: "radio",
            "aria-checked": "false", "data-pick": id, ...(why ? { disabled: "" } : {}) }, T.el("span", { class: "t-block-tick" }, Icons.node("check")), this.text(text, why));
        r.onclick = () => pick(id);
        return r;
    },
    linked({ text, itemKey, go, label }) {
        const r = T.el("button", { class: "t-block-row t-link-to", type: "button", "data-item": itemKey || "",
            "aria-label": itemKey ? `Open ${label}` : label, ...(itemKey ? {} : { disabled: "" }) }, this.text(text), itemKey ? T.el("span", { class: "t-link-next" }, Icons.node("next")) : null);
        if (itemKey)
            r.onclick = () => go(itemKey);
        return r;
    },
    groups(choices) {
        const byId = new Map(choices.map(c => [c.identifier, c]));
        const rootOf = c => {
            const seen = new Set();
            while (c.parent && byId.has(c.parent) && !seen.has(c.identifier)) {
                seen.add(c.identifier);
                c = byId.get(c.parent);
            }
            return c.identifier;
        };
        return choices.filter(c => !c.parent || !byId.has(c.parent))
            .map(top => ({ top, kids: choices.filter(c => c !== top && rootOf(c) === top.identifier) }));
    },
};
