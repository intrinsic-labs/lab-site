"use strict";
const OwnerPick = {
    needed: item => Array.isArray(item.ownerChoices) && item.ownerChoices.length > 0,
    part: (id, i) => String(id).split("/")[i] || String(id),
    name(id) { const n = this.part(id, 1); return n.charAt(0).toUpperCase() + n.slice(1); },
    picker(item, changed) {
        const choices = item.ownerChoices;
        const current = choices.includes(item.defaultOwner) ? item.defaultOwner : null;
        let value = current;
        const buttons = choices.map(id => T.el("button", {
            class: "t-btn tiny t-owner", type: "button", role: "radio",
            "aria-label": `${this.part(id, 1)} (${this.part(id, 0)})`, "data-owner": id,
            onclick: () => { value = id; mark(); changed(); },
        }, this.part(id, 1).toUpperCase()));
        const mark = () => buttons.forEach(b => {
            const on = b.dataset.owner === value;
            b.classList.toggle("primary", on);
            b.setAttribute("aria-checked", String(on));
        });
        const families = [...new Set(choices.map(id => this.part(id, 0)))];
        const picker = T.el("div", { class: "t-owners", role: "radiogroup", "aria-label": "Owner" }, ...families.map(f => T.el("div", { class: "t-owner-family" }, T.el("span", { class: "t-foot" }, f), T.el("div", { class: "t-owner-row" }, ...buttons.filter(b => this.part(b.dataset.owner, 0) === f)))));
        const lead = current
            ? T.el("p", {}, "Current owner is ", T.el("span", { class: "bright" }, this.name(current)), ". Keep it, or switch to another owner.")
            : T.el("p", {}, "This draft has no owner yet. Pick who starts on it.");
        mark();
        return {
            el: T.el("div", { class: "t-owner-pick" }, lead, picker),
            value: () => value,
            go: () => !value ? null : value === current ? `KEEP ${this.name(value).toUpperCase()}` : `SWITCH TO ${this.name(value).toUpperCase()}`,
        };
    },
};
