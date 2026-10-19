/* REVIEW · cards — what each card in the deck says, front and paper.

   One entry per card: `{ key, title, item?, paper() }`. The flip card
   (primitives/flipcard.js) shows the TITLE (`Cards.title`): the brief's
   `cardTitle` (32 characters at most, written to fit the card) when the brief
   is ready, else the item's own name. The desk's top bar shows the same
   title. The PAPER under the deck shows the front card in full: kind ·
   project · age; under it a small status line when there is one (YOU'RE
   ON IT lit while Asher has marked it his (working.js), or WORKING MARK
   CLEARED once a change dropped that mark; an owner's interactive session
   while it is under way or waits on him (interactive.js); LATER in amber, or BLOCKED in amber while a free-text block holds it (its reason is among the notes); FEEDBACK SENT · … in dim green when Asher already answered and it
   waits on the system; the due date; an unsent draft); then at heading size
   the brief's question when it is ready, else the previous brief's while a
   new one is written, else the item's full name; and the recommendation when
   there is one; then, on an item no brief is written for (a Linear card),
   its lead in full (content.js: the description, or a group's issue list).
   A receipt (`Lanes`, deck-filter.js: what a standing rule did, or an owner's release)
   names the rule that acted, BY RULE R1 · …, then what happened in full.
   An item awaiting the system says so in place of the question
   and drops the recommendation: there is nothing to decide yet. While a new
   brief is written the card keeps the previous brief's short name. There is no button on the paper: tapping
   it (or Enter) opens the item. Nothing on the paper is cut; a long one
   scrolls. */
"use strict";

const Cards = {
  /* the short name a card (and the desk's top bar) carries */
  title(it) {
    const ready = it.brief?.state === "ready" && it.brief.brief;
    return String(ready?.cardTitle || it.brief?.previous?.cardTitle || "").trim() || String(it.title || it.key);
  },

  paper({ meta, status = [], question, extra = [] }) {
    const marks = status.filter(Boolean);
    return T.el("div", { class: "t-paper" },
      meta ? T.el("div", { class: "t-paper-meta" }, meta) : null,
      marks.length ? T.el("div", { class: "t-paper-status" },
        ...marks.flatMap((m, i) => (i ? [" · ", m] : [m]))) : null,
      T.el("div", { class: "t-paper-q" }, question),
      ...extra);
  },

  item(it) {
    const ready = it.brief?.state === "ready" && it.brief.brief;
    const awaiting = Fmt.awaiting(it);
    /* answered: nothing to recommend until the system comes back */
    const rec = awaiting ? null : ready ? ready.recommendation : it.recommendation;
    const name = String(it.brief?.previous?.question || it.title || it.key);
    const extra = [];
    if (rec?.text) extra.push(T.el("div", { class: "t-paper-rec" },
      T.el("span", { class: "t-paper-label" }, ready ? "RECOMMENDED " : `${String(rec.by || "").toUpperCase()} RECOMMENDS `),
      String(rec.text)));
    /* a receipt names the standing rule that acted for him */
    const rule = Fmt.rule(it);
    if (rule) extra.push(T.el("div", { class: "t-paper-rec" }, T.el("span", { class: "t-paper-label" }, "BY RULE "), rule));
    const lead = Content.lead(it);
    if (lead) extra.push(T.el("div", { class: "t-paper-lead" },
      T.el("div", { class: "t-label" }, String(lead.title || "").toUpperCase()), T.md(lead.text || "")));
    if (!awaiting && (it.brief?.state === "pending" || !it.brief))
      extra.push(T.el("div", { class: "t-paper-label" }, "THE BRIEF IS BEING WRITTEN"));
    const due = Fmt.day(Fmt.due(it));
    const status = () => [
      Working.tag(it),
      Interactive.tag(it),
      it.blocked ? T.el("span", { class: "t-paper-later" }, "BLOCKED") : null,
      it.deferred && !it.blocked ? T.el("span", { class: "t-paper-later" }, "LATER") : null,
      awaiting ? T.el("span", { class: "t-paper-awaiting" }, awaiting.mark) : null,
      due ? `DUE ${due}` : null,
      ["feedback", "reject", "park", "handback", "block", "route", "undo"].some(a => Drafts.has(`${it.key}|${a}`)) ? "UNSENT DRAFT" : null,
    ];
    return {
      key: it.key, item: it,
      title: this.title(it),
      paper: () => this.paper({ meta: Fmt.meta(it), status: status(), extra,
        question: awaiting ? T.el("span", { class: "t-paper-awaiting-q" }, awaiting.line) : ready ? Fmt.question(it) : name }),
    };
  },

  /* nothing to show: nothing waiting at all, or nothing the deck's filter
     (deck-filter.js) lets through, which then says so and names the filter */
  empty(checked, { question, filter } = {}) {
    return {
      key: "empty", title: "Nothing waiting",
      paper: () => this.paper({ question: question || "Nothing is waiting on you.",
        meta: filter ? `SHOWING · ${filter.toUpperCase()}` : null,
        extra: checked ? [T.el("div", { class: "t-paper-label" }, `CHECKED ${checked}`)] : [] }),
    };
  },

  fault(e) {
    return {
      key: "fault", title: "No signal",
      paper: () => this.paper({ question: "The queue couldn't be read.",
        extra: [T.el("div", { class: "t-paper-text" }, T.fault(e).head),
                T.el("div", { class: "t-paper-label" }, "TAP TO TRY AGAIN")] }),
    };
  },
};
