"use strict";
const Home = {
    el: null, deck: null, card: null, said: null, cards: [], last: [null, null, null],
    mount(ctl) {
        this.deck = Tycho.flipCard({
            items: [], loop: true,
            render: c => ({ title: c.title, sub: this.sub(c) }),
            onChange: (i, c) => { Session.patch({ front: c.key, frontIndex: i }); this.show(); },
        });
        this.said = T.el("div", { class: "t-home-said" });
        this.card = Tycho.indexCard({});
        this.card.el.classList.add("t-home-paper");
        this.card.el.addEventListener("click", e => {
            if (e.target.closest("a, button, input, textarea, select"))
                return;
            const c = this.cards[this.deck.index];
            if (c && c.key !== "empty")
                ctl.open(c.key);
        });
        const corners = HomeBar.mount({ open: v => ctl.open(v), filtered: () => this.render(...this.last),
            items: () => Lanes.items(this.last?.[0]) });
        const deck = T.el("div", { class: "t-home-deck" }, this.deck.el);
        const mid = T.el("div", { class: "t-home-mid" }, this.said);
        const top = T.el("div", { class: "t-home-top" }, deck, mid);
        this.el = T.el("section", { class: "t-home", "data-pid": "home" }, corners.left, corners.right, top, this.card.el);
        DeckFit.watch(top, deck, mid);
        addEventListener("keydown", e => {
            if (!this.el.isConnected || document.body.classList.contains("covered"))
                return;
            if (Chat.el?.contains(e.target) || document.querySelector(".t-chat-pick"))
                return;
            if (e.target.closest?.("textarea, input, select, [contenteditable]") || e.metaKey || e.ctrlKey)
                return;
            if (e.key === "Enter" && e.target.closest?.("a[href]"))
                return;
            const view = Dropdown.current ? null : HomeKeys.view(e);
            if (view) {
                e.preventDefault();
                ctl.open(view, { focus: true });
                return;
            }
            if (e.target.closest?.(".t-home-corner, .t-drop"))
                return;
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                this.deck.next();
            }
            else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                this.deck.prev();
            }
            else if (e.key === "Enter") {
                const c = this.cards[this.deck.index];
                if (c && c.key !== "empty") {
                    e.preventDefault();
                    ctl.open(c.key);
                }
            }
        });
        return this.el;
    },
    sub(c) {
        if (!c.item)
            return "";
        const pad = v => String(v).padStart(2, "0");
        const done = Lanes.happened(c.item);
        const mine = this.cards.filter(x => x.item && Lanes.happened(x.item) === done);
        return `${done ? "RECEIPT " : ""}${pad(mine.indexOf(c) + 1)} / ${pad(mine.length)}`;
    },
    render(data, fault, checked) {
        this.last = [data, fault, checked];
        const all = Lanes.items(data).filter(i => !Pending.hides(i.key));
        const filter = DeckFilter.get();
        const shown = DeckFilter.apply(all, filter);
        const items = shown.filter(i => !Lanes.happened(i)), happened = shown.filter(i => Lanes.happened(i));
        const active = items.filter(i => !i.blocked && !i.deferred && !i.awaiting), awaiting = items.filter(i => !i.blocked && !i.deferred && i.awaiting), later = items.filter(i => !i.blocked && i.deferred), blocked = items.filter(i => i.blocked);
        const cards = !data && fault ? [Cards.fault(fault)]
            : shown.length ? [...active, ...awaiting, ...later, ...blocked, ...happened].map(i => Cards.item(i))
                : [Cards.empty(checked, all.length ? { question: DeckFilter.empty(filter, all), filter: DeckFilter.label(filter) } : {})];
        HomeBar.sync();
        const { front, frontIndex = 0 } = Session.get();
        this.cards = cards;
        const at = cards.findIndex(c => c.key === front);
        this.deck.set(cards, at >= 0 ? at : Math.min(frontIndex, cards.length - 1));
        this.show();
    },
    show() {
        const c = this.cards[this.deck.index];
        if (!c)
            return;
        this.card.set({ body: c.paper() });
    },
    say(label, tone, text) {
        clearTimeout(this._sayT);
        this.said.replaceChildren(T.el("b", { class: tone }, text || label));
        this.el.classList.add("saying");
        this._sayT = setTimeout(() => this.held ? this.hold(this.held) : this.el.classList.remove("saying"), 7000);
    },
    held: null,
    hold(text) {
        this.held = text;
        if (!this.said)
            return;
        if (!text) {
            if (this.said.querySelector(".t-sending"))
                this.el.classList.remove("saying");
            return;
        }
        clearTimeout(this._sayT);
        this.said.replaceChildren(T.el("b", { class: "t-sending" }, text));
        this.el.classList.add("saying");
    },
};
