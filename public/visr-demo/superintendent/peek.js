"use strict";
const Peek = {
    open(card, { find, go }) {
        const item = find(card.key);
        const paper = Tycho.indexCard({});
        paper.el.classList.add("t-home-paper", "t-peek-paper");
        paper.set({ body: item ? Cards.item(item).paper()
                : Cards.paper({ meta: String(card.kind || "").toUpperCase(), question: String(card.title || card.key),
                    extra: [T.el("div", { class: "t-paper-label" }, "NO LONGER WAITING ON YOU")] }) });
        const open = item ? T.el("button", { class: "t-btn primary t-peek-open", type: "button",
            onclick: () => { sheet.close(); go(card.key); } }, "OPEN CARD") : null;
        const sheet = BSheet.open({ title: CardRef.shown(card) || String(card.title || card.key), cls: "peek", kids: [paper.el, open] });
        return sheet;
    },
};
