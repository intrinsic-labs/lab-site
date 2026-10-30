/* VISR DEMO · SUPERINTENDENT · offers — the chips a reply puts in front of you.

   Two shapes, the runtime's (contract: chat approval chips v1, as
   tycho/offers.py relays them and os/superintendent/offers.js draws them):

     accepts  {id, kind: "accepts", items: [{outcomeId, title, line, href, revision, state, …}]}
              ACCEPT per outcome: an owner's checkpoint ready for your accept
     action   {id, kind: "action", action: "grant", title, summary, diff, undoNote, revision, state, …}
              CONFIRM? with YES / NO over the exact call it would make: approving a
              draft outcome, answering a decision yes, approving a proposal

   A message holds its offers' ids; `view` works out each one's state when it
   is read, from what was decided since and from the deck: a card you
   settled another way since it was shown reads stale, with why. `decide`
   answers `/api/superintendent/decide` as offer-decide.js expects: a tap
   moves the card through L.acts (which logs it as a chat decision, with UNDO
   when it can be undone) and answers with the offer as it now stands; a
   retry of a decided chip answers its recorded result without acting twice.

     L.offers.make(item, messageId) → offer id | null · L.offers.view(id) → the offer as read
     L.offers.decide(body) → {ok, offer} | {ok: false, code, reason, offer?}   (async)
     L.offers.settle(key, action, via, ref?) · L.offers.reopened(key) */
"use strict";

(function (L) {
  const T = L.text;
  const REOPENED = "You reopened its review from the action log; decide it on the deck.";
  let n = 0;

  const offers = {
    map: new Map(),

    make(item, messageId) {
      if (!item) return null;
      const id = `o_demo_${String(++n).padStart(3, "0")}`;
      const name = L.cards.name(item), key = item.key;
      if ((item.actions || []).includes("accept")) {
        this.map.set(id, { id, kind: "accepts", messageId, rows: [{ outcomeId: L.cards.id(item), key, act: "accept",
          title: String(item.title || name), line: T.clip(L.cards.gist(item), 300), revision: item.revision || `${key}:r1`,
          href: `#item=${encodeURIComponent(key)}`, state: "open" }] });
        return id;
      }
      if (!(item.actions || []).includes("approve")) return null;
      const owner = item.ownerChoices ? item.defaultOwner || item.ownerChoices[0] : null;
      const doubt = L.cards.advice(item)?.doubt;
      const o = { id, kind: "action", action: "grant", messageId, key, act: "approve", owner, state: "open",
        revision: item.revision || `${key}:r1`,
        diff: `intrinsic queue act ${key} approve${owner ? ` --owner ${owner}` : ""}`,
        link: { label: "Open the card", href: `#item=${encodeURIComponent(key)}` } };
      if (item.kind === "decision") Object.assign(o, { title: `Answer yes: ${name}`,
        summary: `${L.cards.gist(item)} Yes tells the manager to go ahead.`,
        undoNote: "Undo: none. The manager acts on your answer straight away." });
      else if (item.kind === "proposal") Object.assign(o, { title: `Approve: ${name}`,
        summary: `${L.cards.gist(item)} Yes creates the tasks as proposed.`,
        undoNote: "Undo: none. Unwanted tasks are closed one by one." });
      else Object.assign(o, { title: `Approve the ${name} draft`,
        summary: `Opens the outcome and starts ${owner || "its owner"} on it at the next tick.${doubt ? ` The doubt: ${doubt}` : ""}`,
        undoNote: "Undo: none. Taking it back means parking the outcome afterwards." });
      this.map.set(id, o);
      return id;
    },

    /* a row or chip still open, read against the deck now */
    live(r) {
      if (r.state !== "open") return r;
      const it = L.desk.find(r.key);
      if (!it) {
        const s = L.state.settled.get(r.key);
        return { ...r, state: "stale", reason: s ? `You ${L.acts.did(s.action, "it")} ${s.by === "deck" ? "on the deck" : "in the chat"} since this was shown.`
          : "It left your deck since this was shown." };
      }
      if (it.revision && it.revision !== r.revision) return { ...r, state: "stale", reason: "It changed since it was shown." };
      return r;
    },

    shape(r) {
      const out = { revision: r.revision, state: r.state };
      for (const k of ["reason", "result", "decidedAt"]) if (r[k]) out[k] = r[k];
      return out;
    },

    view(id) {
      const o = this.map.get(id);
      if (!o) return null;
      if (o.kind === "accepts") return { id, kind: "accepts", items: o.rows.map(r => {
        const x = this.live(r);
        return { outcomeId: x.outcomeId, title: x.title, line: x.line, href: x.href, ...this.shape(x) };
      }) };
      const x = this.live(o);
      return { id, kind: "action", action: "grant", title: x.title, summary: x.summary, undoNote: x.undoNote,
        diff: x.diff, link: x.link, ...this.shape(x) };
    },

    async decide(b) {
      const o = this.map.get(b?.offerId);
      if (!o) return { ok: false, code: "gone", reason: "There is no offer by that id." };
      const accepts = o.kind === "accepts";
      if (accepts !== (b.decision === "accept") || (!accepts && !["yes", "no"].includes(b.decision)))
        return { ok: false, code: "invalid", reason: "That decision doesn't fit this offer." };
      const row = accepts ? o.rows.find(r => r.outcomeId === b.item) : o;
      if (!row) return { ok: false, code: "invalid", reason: "That outcome isn't in this offer." };
      if (row.state !== "open") return { ok: true, offer: this.view(o.id) };
      const now = this.live(row);
      if (now.state !== "open") return { ok: false, code: "stale", reason: now.reason, offer: this.view(o.id) };
      if (b.revision !== row.revision)
        return { ok: false, code: "stale", reason: "It changed since it was shown.", offer: this.view(o.id) };
      const at = L.clock.iso();
      if (b.decision === "no") {
        Object.assign(row, { state: "declined", result: "Nothing changed; it's still on your deck.", decidedAt: at });
        L.log.add({ tool: "chat_decision", label: `You declined ${L.cards.id({ key: row.key })} in the chat`,
          summary: `${row.title}: left as it was.`, target: { key: row.key, title: L.desk.title(row.key) },
          messageId: o.messageId });
        return { ok: true, offer: this.view(o.id) };
      }
      const item = L.desk.find(row.key);
      const ref = { offerId: o.id, outcomeId: accepts ? row.outcomeId : null };
      const out = await L.acts.perform(item, L.acts.fit(item, row.act) || row.act,
        { owner: row.owner, via: "chip", messageId: o.messageId, offerRef: ref });
      if (!out.ok) {
        Object.assign(row, { state: "refused", reason: T.clip(out.reason, 300) });
        return { ok: false, code: "refused", reason: out.reason, offer: this.view(o.id) };
      }
      return { ok: true, offer: this.view(o.id) };
    },

    rowsFor(key) {
      const out = [];
      for (const o of this.map.values()) for (const r of o.kind === "accepts" ? o.rows : [o]) if (r.key === key) out.push([o, r]);
      return out;
    },

    /* the card was acted on: by this chip, by your words, or on the deck */
    settle(key, action, via, ref = null) {
      const at = L.clock.iso();
      for (const [o, r] of this.rowsFor(key)) {
        if (r.state !== "open") continue;
        const mine = ref && ref.offerId === o.id;
        if (mine || action === r.act || L.acts.fit({ actions: [action] }, r.act) === action)
          Object.assign(r, { state: "done", decidedAt: at,
            ...(mine ? (r.act === "approve" && r.owner ? { result: `${r.owner} starts at the next tick` } : {})
              : { result: via === "deck" ? "Done on the deck" : "Done by your words in the chat" }) });
        else Object.assign(r, { state: "stale", reason: `You ${L.acts.did(action, "it")} ${via === "deck" ? "on the deck" : "in the chat"} instead.` });
      }
    },

    reopened(key) {
      for (const [, r] of this.rowsFor(key)) {
        if (r.state !== "done") continue;
        Object.assign(r, { state: "stale", reason: REOPENED });
        delete r.decidedAt; delete r.result;
      }
    },
  };

  L.offers = offers;
})(window.VISR_SUPT_LIB ||= {});
