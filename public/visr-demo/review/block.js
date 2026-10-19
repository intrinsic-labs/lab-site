/* REVIEW · block — the sheet behind ⋯ BLOCKED BY on a chore or a draft.

   Two ways to say what holds it, one at a time. A CARD: every other card in
   the deck that can block (the runtime names its `blockerId`: a task's or an
   outcome's id), this item's project first, then the rest by project; a tap
   picks one (a radio), a second tap lets it go. The runtime files it as
   `blocked-by-<id>`: the item leaves the deck and comes back by itself when
   the blocker is done or accepted. Or SOMETHING ELSE, in words (counted
   against `item.blockMax`, text-cap.js): the item stays at the back of the
   deck marked BLOCKED until UNBLOCK. Picking a card clears the words and
   writing clears the card. Like the other sheets it is a draft from the
   first choice (`<key>|block`: `by` and `text`), the open sheet is part of
   the session, a refusal keeps it up with the reason, and CANCEL keeps the
   draft.

     Block.open({ item, items, send }) → Promise<out|null>
   `send({ blockedBy } | { text })` is the controller's; the sheet closes on
   `ok` or `stale`.
     Block.candidates(item, items) → [{ head, items }] */
"use strict";

const Block = {
  candidates(item, items) {
    const others = (items || []).filter(i => i.key !== item.key && i.blockerId);
    const same = others.filter(i => i.project === item.project);
    const rest = others.filter(i => i.project !== item.project)
      .sort((a, b) => Fmt.project(a.project).localeCompare(Fmt.project(b.project)));
    return [
      same.length ? { head: `IN ${Fmt.project(item.project)}`, items: same } : null,
      rest.length ? { head: same.length ? "ELSEWHERE" : "IN THE DECK", items: rest } : null,
    ].filter(Boolean);
  },

  open(o) {
    const id = `${o.item.key}|block`;
    Session.patch({ sheet: "block" });
    return new Promise(resolve => {
      const draft = Drafts.get(id);
      let by = draft.by || null;
      const groups = this.candidates(o.item, o.items);
      const rows = [];
      const mark = () => { for (const r of rows) r.setAttribute("aria-checked", String(r.dataset.by === by)); };
      const pick = next => {
        by = next;
        mark();
        if (by && ta.value) { ta.value = ""; count?.update(); }
        Drafts.set(id, { by, text: ta.value });
        sh.say(null);
      };
      const list = T.el("div", { class: "t-block-list", role: "radiogroup", "aria-label": "Blocked by a card" },
        ...groups.flatMap(g => [T.el("div", { class: "t-foot t-block-head" }, g.head),
          ...g.items.map(it => {
            const r = T.el("button", { class: "t-block-row", type: "button", role: "radio",
              "aria-checked": "false", "data-by": it.blockerId },
              T.el("span", { class: "t-block-tick" }, Icons.node("check")),
              T.el("span", { class: "t-block-text" },
                T.el("span", { class: "t-block-title" }, Cards.title(it)),
                T.el("span", { class: "t-foot" }, `${Fmt.kind(it)} · ${it.blockerId}`)));
            r.onclick = () => pick(by === it.blockerId ? null : it.blockerId);
            rows.push(r);
            return r;
          })]));
      const ta = T.el("textarea", { class: "t-textarea t-block-reason", spellcheck: "true", rows: "2",
        autocapitalize: "sentences", "aria-label": "Blocked on something else",
        placeholder: "What is it waiting on?" });
      ta.value = draft.by ? "" : draft.text || "";
      const count = TextCap.attach(ta, o.item.blockMax);
      ta.oninput = () => {
        if (ta.value.trim() && by) pick(null);
        Drafts.set(id, { by, text: ta.value }); count?.update(); sh.say(null);
      };
      const go = T.el("button", { class: "t-btn primary" }, "BLOCK");
      const cancel = T.el("button", { class: "t-btn" }, "CANCEL");
      let sending = false;
      const done = out => { Session.patch({ sheet: null }); sh.close(); resolve(out); };
      const sh = Tycho.sheet({ cap: "BLOCKED BY",
        kids: [groups.length ? list : T.el("p", { class: "t-say dim" }, "No other card in the deck can block it."),
          T.el("label", { class: "t-label t-block-label" }, "OR SOMETHING ELSE"), ta, count?.el],
        acts: [cancel, go],
        held: () => sending,
        onCancel: () => { Session.patch({ sheet: null }); resolve(null); } });
      cancel.onclick = () => done(null);
      go.onclick = async () => {
        if (!by && !ta.value.trim())
          return sh.say(T.el("p", { class: "t-say amber" }, "Pick the card that blocks it, or say what it is waiting on."));
        if (!by && count?.over())
          return sh.say(T.el("p", { class: "t-say amber" },
            `Cut ${count.over()} character${count.over() === 1 ? "" : "s"} first — a reason is at most ${o.item.blockMax}.`));
        go.disabled = cancel.disabled = true; sending = true;
        sh.say(T.el("p", { class: "t-say dim" }, "Sending…"));
        const out = await o.send(by ? { blockedBy: by } : { text: ta.value });
        go.disabled = cancel.disabled = false; sending = false;
        if (out?.ok || out?.code === "stale") return done(out);
        sh.say(T.el("div", { class: "t-note bad" }, T.el("div", { class: "t-label" }, "NOT BLOCKED"),
          T.el("p", {}, String(out?.reason || "not sent"))));
      };
      /* a drafted card that has since left the deck is let go */
      if (by && !rows.some(r => r.dataset.by === by)) by = null;
      mark();
      requestAnimationFrame(() => rows.find(r => r.dataset.by === by)?.scrollIntoView({ block: "nearest" }));
    });
  },
};
