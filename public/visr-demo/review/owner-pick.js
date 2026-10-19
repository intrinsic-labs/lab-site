/* REVIEW · the owner picker — who starts on a draft outcome once it is
   approved. Only Asher sets an owner, and approving is his act.

   Choosing an owner is a step AFTER the decision, not part of it: the
   APPROVE stamp lands, then the approve sheet (approve-sheet.js) asks
   "Current owner is Opus. Keep it or switch?" with the runtime's choices
   (`ownerChoices`) grouped by family and the default (`defaultOwner`: the
   draft's own owner, else the accepted default) already chosen, so keeping
   it is one more tap. With no default, one must be picked before APPROVE
   lights. An item without `ownerChoices` (a runtime that predates it) is
   approved without asking.

     const p = OwnerPick.picker(item, changed);   // p.el · p.value() · p.go()
     OwnerPick.needed(item) */
"use strict";

const OwnerPick = {
  needed: item => Array.isArray(item.ownerChoices) && item.ownerChoices.length > 0,

  part: (id, i) => String(id).split("/")[i] || String(id),
  name(id) { const n = this.part(id, 1); return n.charAt(0).toUpperCase() + n.slice(1); },

  /* the lead line and the families of owners; `changed()` runs on every
     pick. `go()` is what the sheet's button says, or null while none is picked */
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
    const picker = T.el("div", { class: "t-owners", role: "radiogroup", "aria-label": "Owner" },
      ...families.map(f => T.el("div", { class: "t-owner-family" },
        T.el("span", { class: "t-foot" }, f),
        T.el("div", { class: "t-owner-row" }, ...buttons.filter(b => this.part(b.dataset.owner, 0) === f)))));
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
