/* REVIEW · home — the card index, and the paper under it.

   The deck is the split-flap index card (primitives/flipcard.js), exactly as
   tuned for the judging bench: tap the TOP panel and it folds down to the
   next card, tap the BOTTOM and it lifts back; arrow keys too. It holds only
   what waits on Asher, in order: every active item, then the items filed for
   LATER; and, only when the filter's Happened lane is on, what already
   happened, at the back and numbered apart. It is a loop. An empty queue is
   one calm card.

   Capture is not a decision, so it is not a card. The corners hold two
   buttons out of the flow, so the deck stays centred (home-bar.js): the
   funnel top left filters the deck (deck-filter.js: lanes, what he is on,
   what to hide, one project), and the menu top right opens New note, Telemetry and
   Settings. The card's place (`03 / 10`) counts what the filter shows, and
   an empty filtered deck says what the filter left out.

   The card carries the short name and its place (`03 / 10`); the ruled paper
   under it carries the rest — what it is, LATER and the due date when they
   apply, the question and the recommendation. The paper has no button:
   tapping it anywhere (or Enter) opens the item. A result after acting shows
   between the two for a few seconds.

   On a tablet the deck grows into its room (deck-fit.js); on a wide
   landscape screen the deck takes the left half and the paper the right,
   each centred top to bottom, the result line hanging under the card. */
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
      if (e.target.closest("a, button, input, textarea, select")) return;
      const c = this.cards[this.deck.index];
      if (c && c.key !== "empty") ctl.open(c.key);
    });
    const corners = HomeBar.mount({ open: v => ctl.open(v), filtered: () => this.render(...this.last),
      items: () => Lanes.items(this.last?.[0]) });
    const deck = T.el("div", { class: "t-home-deck" }, this.deck.el);
    const mid = T.el("div", { class: "t-home-mid" }, this.said);
    const top = T.el("div", { class: "t-home-top" }, deck, mid);
    this.el = T.el("section", { class: "t-home", "data-pid": "home" }, corners.left, corners.right, top, this.card.el);
    DeckFit.watch(top, deck, mid);
    addEventListener("keydown", e => {
      if (!this.el.isConnected || document.body.classList.contains("covered")) return;
      if (e.target.closest?.("textarea, input, select, [contenteditable]") || e.metaKey || e.ctrlKey) return;
      /* a corner button or its menu has the keys */
      if (e.target.closest?.(".t-home-corner, .t-drop")) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); this.deck.next(); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); this.deck.prev(); }
      else if (e.key === "Enter") {
        const c = this.cards[this.deck.index];
        if (c && c.key !== "empty") { e.preventDefault(); ctl.open(c.key); }
      }
    });
    return this.el;
  },

  /* the card's place among the waiting items: what already happened (`Lanes`, deck-filter.js)
     is never counted as waiting, so its cards are numbered apart, after
     them ("RECEIPT 01 / 03", short enough for the card); the empty and fault cards say nothing
     under their name */
  sub(c) {
    if (!c.item) return "";
    const pad = v => String(v).padStart(2, "0");
    const done = Lanes.happened(c.item);
    const mine = this.cards.filter(x => x.item && Lanes.happened(x.item) === done);
    return `${done ? "RECEIPT " : ""}${pad(mine.indexOf(c) + 1)} / ${pad(mine.length)}`;
  },

  render(data, fault, checked) {
    this.last = [data, fault, checked];
    const all = Lanes.items(data);
    const filter = DeckFilter.get();
    const shown = DeckFilter.apply(all, filter);
    const items = shown.filter(i => !Lanes.happened(i)), happened = shown.filter(i => Lanes.happened(i));
    /* waiting on him, then answered and waiting on the system, then Later,
       then blocked (block.js), then, past everything waiting, what happened */
    const active = items.filter(i => !i.blocked && !i.deferred && !i.awaiting),
      awaiting = items.filter(i => !i.blocked && !i.deferred && i.awaiting),
      later = items.filter(i => !i.blocked && i.deferred), blocked = items.filter(i => i.blocked);
    const cards = !data && fault ? [Cards.fault(fault)]
      : shown.length ? [...active, ...awaiting, ...later, ...blocked, ...happened].map(i => Cards.item(i))
      : [Cards.empty(checked, all.length ? { question: DeckFilter.empty(filter, all), filter: DeckFilter.label(filter) } : {})];
    HomeBar.sync();
    /* the card in front is the session's, not whatever the deck showed
       while the queue was still being read: by key, else the nearest place */
    const { front, frontIndex = 0 } = Session.get();
    this.cards = cards;
    const at = cards.findIndex(c => c.key === front);
    this.deck.set(cards, at >= 0 ? at : Math.min(frontIndex, cards.length - 1));
    this.show();
  },

  /* the paper for the card in front */
  show() {
    const c = this.cards[this.deck.index];
    if (!c) return;
    this.card.set({ body: c.paper() });
  },

  /* a result, between the deck and the paper, for a few seconds: the
     runtime's own words when it sent any, else the verb's */
  say(label, tone, text) {
    clearTimeout(this._sayT);
    this.said.replaceChildren(T.el("b", { class: tone }, text || label));
    this.el.classList.add("saying");
    this._sayT = setTimeout(() => this.el.classList.remove("saying"), 7000);
  },
};
