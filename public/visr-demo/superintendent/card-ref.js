"use strict";
const CardRef = {
    from(item) {
        const ref = { key: item.key, title: Cards.title(item), kind: String(item.kind || "card"), id: CardSearch.subject(item.key) };
        const shots = this.shots(item);
        return shots.length ? { ...ref, shots } : ref;
    },
    shots: item => Shots.images(item).map(b => String(b.title || String(b.ref || "").split("/").pop() || "image")),
    wire(card) {
        const { key, title, kind, id } = card;
        const item = typeof App !== "undefined" ? App.find?.(key) : null;
        const shots = item ? this.shots(item) : (card.shots || []);
        return shots.length ? { key, title, kind, id, shots } : { key, title, kind, id };
    },
    name(card) {
        if (card.id)
            return String(card.id);
        const key = String(card.key || "");
        return key.includes(":") ? key.slice(key.indexOf(":") + 1) : key;
    },
    label: card => String(card.id || card.key).toUpperCase(),
    SHORT: 12,
    shown(card) { const l = this.label(card); return l.length <= this.SHORT ? l : ""; },
    glyph(small = true) { return T.el("i", { class: `t-cardglyph${small ? " sm" : ""}`, "aria-hidden": "true" }); },
    x(what, remove) {
        return T.el("button", { class: "t-att-x", type: "button", "aria-label": `Remove ${what}`, onclick: remove }, "×");
    },
    named(card) {
        const title = String(card.title || this.name(card));
        return { "aria-label": `Peek at ${title}`, title };
    },
    pill(card, { peek, remove = null }) {
        const face = [this.glyph(), T.el("span", { class: "t-cardref-id" }, this.name(card))];
        if (!remove)
            return T.el("button", { class: "t-cardref sm", type: "button", ...this.named(card), onclick: () => peek(card) }, ...face);
        return T.el("span", { class: "t-cardref sm in" }, T.el("button", { class: "t-cardref-peek", type: "button", ...this.named(card), onclick: () => peek(card) }, ...face), this.x("the card", remove));
    },
    tile(card, { peek, remove }) {
        return T.el("span", { class: "t-att card" }, T.el("button", { class: "t-att-open", type: "button", ...this.named(card), onclick: () => peek(card) }, this.glyph(), T.el("span", { class: "t-att-name" }, this.name(card))), remove ? this.x("the card", remove) : null);
    },
};
