/* REVIEW · the desk — one item, laid out for a decision.

   The first page holds what deciding needs and nothing else:
     1. what it is and how long it has waited (footnote), its title (heading),
        BY RULE … on a receipt (the standing rule that acted), FEEDBACK
        SENT · … when Asher already answered and it waits on the system,
        and an owner's interactive session (interactive.js)
     2. the brief (brief.js): the question, the runtime's notes (STATUS),
        the recommendation with its doubt, then the live preview and the
        screenshots (sections.js `go`), what changed, the short body and a
        picture if one helps. With no brief yet, STATUS sits under the header.
     3. MORE: every other section as a row that pushes its own page over
        this one (stack.js) — the checkpoint, how to review, limitations,
        evidence, the documents it is about (editable in place), what each
        answer does, other sources.
   The top bar (topbar.js) keeps ‹ back and the card's short name in view;
   the action bar is pinned under the stack, always one thumb away from any
   page. On a wide landscape screen the action bar is a column on the right
   third instead, beside the pages rather than under them.

     const d = Desk.render(item, ctl);
     d.el · d.page (the first page's scroller) · d.stack · d.item · d.flag(node)
     d.key(e) · d.dispose()
     d.sync(item): the same revision read again; only the working mark and
       the interactive status are redrawn
   `ctl` is the controller's: act, compose, park, mark, back, openDoc, saved. */
"use strict";

const Desk = {
  render(item, ctl) {
    const notice = T.el("div", { class: "t-desk-notice" });
    let stack = null;
    const push = page => stack.push(page);

    const awaiting = Fmt.awaiting(item);
    const status = item.notes?.length ? T.el("section", { class: "t-status" },
      T.el("div", { class: "t-label" }, "STATUS"),
      T.el("ul", { class: "t-list" }, ...item.notes.map(n => T.el("li", {}, String(n))))) : null;
    const briefed = item.brief?.state === "ready" && item.brief.brief;
    /* the working mark: the header's line or notice and the action bar's
       toggle, both redrawn in place by sync(). The mark resolves nothing, so
       the desk stays; a refusal is said on the action bar. A draft outcome
       takes no mark: deciding it is the work */
    let actions = null;
    const send = async action => {
      actions.say(null);
      const out = await ctl.mark(action);
      if (out && !out.ok && out.code !== "stale") actions.say(out.reason || "not sent");
    };
    const mark = T.el("div", { class: "t-desk-mark" });
    /* nor does what already happened (`Lanes`, deck-filter.js): there is nothing to work on */
    const mine = item.kind === "draft_outcome" || Lanes.happened(item) ? null : Working.toggle(item, { press: send });
    const rule = Fmt.rule(item);
    /* an owner's interactive session (interactive.js) moves without a new
       revision too (remote control connecting), so it is redrawn with the mark */
    const inter = T.el("div", { class: "t-desk-inter-slot" });
    const marked = it => {
      mark.replaceChildren(...Working.head(it, { dismiss: () => send("clear_working") }));
      inter.replaceChildren(...Interactive.head(it));
      mine?.set(it);
    };
    const more = Sections.more(item, push, { saved: () => ctl.saved(item.key), openDoc: ctl.openDoc });
    const inner = T.el("div", { class: "t-desk-inner" },
      notice,
      T.el("header", { class: "t-desk-head" },
        T.el("div", { class: "t-foot" }, Fmt.meta(item)),
        T.el("h1", { class: "t-title" }, String(item.title || item.key)),
        rule ? T.el("div", { class: "t-foot" }, `BY RULE ${rule.toUpperCase()}`) : null,
        awaiting ? T.el("div", { class: "t-foot t-awaiting" }, awaiting.mark) : null,
        item.deferred ? T.el("div", { class: "t-foot" },
          `FILED FOR LATER${item.deferred.until ? " · UNTIL " + Fmt.until(item.deferred.until) : ""}`) : null,
        inter,
        mark),
      briefed ? null : status,
      Brief.render(item, { status: briefed ? status : null, go: Sections.go(item, push) }),
      more?.el || null);

    const page = T.el("div", { class: "t-desk-page" }, inner);
    const top = TopBar.render({ title: Cards.title(item), back: () => ctl.back(), copy: item.reference || "" });
    const root = T.el("div", { class: "t-desk-screen" }, top, page);
    stack = DeskStack.create(root);
    /* a vault link to a document this item carries opens its row's page */
    DocSheet.route = path => more?.open(path) || false;
    /* the stamp's ink lands on whichever page is in front */
    actions = Actions.render(item, { target: stack.el, act: ctl.act, compose: ctl.compose, park: ctl.park, block: ctl.block, tool: mine?.el });
    marked(item);
    const el = T.el("section", { class: "t-desk", "data-pid": "desk" }, stack.el, actions.el);

    return {
      el, page, item, stack,
      loaded: Promise.resolve(),
      editing: () => !!stack.el.querySelector(".t-doc textarea.t-source"),
      flag(node) { notice.replaceChildren(...(node ? [node] : [])); },
      sync(it) { this.item = it; marked(it); },
      key: e => {
        if (e.key === "Escape" && stack.depth()) { stack.back(); return true; }
        return actions.key(e);
      },
      dispose() { stack.dispose(); if (DocSheet.route) DocSheet.route = null; },
    };
  },
};
