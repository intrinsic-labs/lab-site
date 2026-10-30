/* VISR DEMO · SUPERINTENDENT · acts — what it does to a card, and taking it back.

   An act goes through the desk (`desk.act`), exactly as a tap on the deck
   would, then lands in the action log the way the runtime logs a write: by
   your request in words (`approval: request`, quoting you) or by your tap
   on a chip (`chat_decision`, `approval: chip`). An accept, a park, a later,
   a done or a not-needed can be taken back while the desk can put a card
   back (`desk.reopen`): its row carries UNDO, and undoing it (from the log's
   UNDO, or by saying "undo that") reopens the card and turns the chip that
   made it stale, as the runtime's reopen does.

     L.acts.fit(item, action) → the action the card takes for what was asked, or null
     L.acts.takes(item) → "approve, refuse, feedback or later"
     L.acts.perform(item, action, { owner?, text?, via: request|chip, messageId?, asked?: {messageId, quote}, offerRef? })
       → { ok, line, entry } | { ok: false, reason }   (async)
     L.acts.undo(entry) → { ok, summary } | { ok: false, reason }   (async)
     L.acts.owner(text, item) → "agent/cedar" when one is named and the card lets you pick */
"use strict";

(function (L) {
  const T = L.text;
  const REVERSIBLE = new Set(["accept", "park", "later", "done", "not_needed"]);
  const LABEL = { accept: "accept", approve: "approve", park: "park", later: "later", done: "mark done",
    reject: "refuse", not_needed: "not needed", feedback: "feedback", acknowledge: "acknowledge", route: "route",
    undo: "undo" };
  const PAST = { accept: "accepted", approve: "approved", park: "parked", later: "moved to later", done: "marked done",
    reject: "refused", not_needed: "closed as not needed", feedback: "sent feedback on", acknowledge: "acknowledged",
    route: "routed", undo: "undid", mark_working: "marked as yours", clear_working: "cleared your mark on" };

  const DID = { accept: t => `accepted ${t}`, approve: t => `approved ${t}`, park: t => `parked ${t}`,
    later: t => `moved ${t} to later`, done: t => `marked ${t} done`, reject: t => `refused ${t}`,
    not_needed: t => `closed ${t} as not needed`, feedback: t => `sent feedback on ${t}`, acknowledge: t => `acknowledged ${t}`,
    route: t => `routed ${t}`, undo: t => `undid ${t}` };

  function say(action, item, { owner, text } = {}) {
    const n = `**${L.cards.name(item)}**`;
    switch (action) {
      case "accept": return `Accepted ${n}: the outcome is closed with a receipt, and the card has left your deck.`;
      case "approve":
        if (item.kind === "decision") return `Answered yes to ${n}; the manager acts on it.`;
        if (item.kind === "proposal") return `Approved ${n}; the tasks are created and assigned.`;
        return `Approved ${n}. ${owner || item.defaultOwner || "Its owner"} starts on it at the supervisor's next tick.`;
      case "park": return `Parked ${n}. It comes back when it's due another look.`;
      case "later": return `Moved ${n} to later; it's back on your deck tomorrow at 06:00.`;
      case "done": return `Marked ${n} done.`;
      case "reject": return item.kind === "decision" ? `Answered no to ${n}; the manager is told.`
        : `Refused ${n}; the drafter is told why.`;
      case "not_needed": return `Closed ${n} as not needed.`;
      case "feedback": return `Sent your note on ${n} to its owner: “${T.clip(text, 160)}”. It reads it on its next turn.`;
      case "acknowledge": return `Acknowledged ${n}; the receipt is filed.`;
      default: return `Done: ${n} is ${PAST[action] || action}.`;
    }
  }

  const acts = {
    PAST, LABEL,

    /* "moved X to later", "accepted X": what was done to a card, in words */
    did(action, what) { return (DID[action] || (t => `${PAST[action] || action} ${t}`))(what); },

    fit(item, action) {
      const has = a => (item?.actions || []).includes(a);
      if (!item || !action) return null;
      if (has(action)) return action;
      if (action === "accept" && has("approve")) return "approve";
      if (action === "approve" && has("accept")) return "accept";
      if (action === "approve" && has("done") && item.kind === "chore") return "done";
      if (action === "reject" && has("not_needed") && !has("reject")) return "not_needed";
      return null;
    },

    takes(item) { return T.list((item?.actions || []).map(a => LABEL[a] || a)).replace(/ and ([^ ]+)$/, " or $1"); },

    owner(text, item) {
      const choices = item?.ownerChoices || [];
      const w = T.words(text);
      return choices.find(c => w.some(x => T.near(x, c.split("/").pop()))) || null;
    },

    async perform(item, action, { owner = null, text = "", via = "request", messageId, asked, offerRef } = {}) {
      const name = L.cards.name(item), id = L.cards.id(item);
      const who = action === "approve" && item.ownerChoices ? owner || item.defaultOwner : null;
      const out = await L.desk.act({ key: item.key, action, owner: who, text });
      if (!out?.ok) return { ok: false, reason: out?.reason || "The deck refused it." };
      const line = say(action, item, { owner: who, text });
      const past = PAST[action] || action;
      const label = via === "chip" ? `You ${this.did(action, id)} in the chat` : `${T.cap(this.did(action, id))}, as you asked`;
      const entry = L.log.add({
        tool: via === "chip" ? "chat_decision" : `review_${action}`, label,
        summary: T.plain(line), target: { key: item.key, title: name }, ...(messageId ? { messageId } : {}),
        capability: { actor: "superintendent", action: `review.${action}`, capabilityClass: "gated", mode: "ask_first",
          approval: via === "chip" ? "chip" : "request", target: item.key, ...(item.revision ? { revision: item.revision } : {}),
          result: T.plain(line), ...(asked?.quote ? { request: asked } : {}) },
      });
      if (REVERSIBLE.has(action) && L.desk.canReopen()) {
        entry.undo = { receiptId: L.state.rid(), revision: entry.at };
        entry.reopenKey = item.key;
        entry.reopenAction = action;
        entry.reopenTitle = name;
        if (offerRef) entry.offerRef = offerRef;
      }
      L.state.settled.set(item.key, { action, by: "chat", at: entry.at, title: name });
      L.offers.settle(item.key, action, via, offerRef);
      return { ok: true, line, entry, past, did: this.did(action, id) };
    },

    async undo(entry) {
      const out = await L.desk.reopen(entry.reopenKey, entry.reopenAction);
      if (!out?.ok) return { ok: false, reason: out?.reason || "The deck couldn't put it back." };
      delete entry.undo;
      entry.undone = true;
      L.state.settled.delete(entry.reopenKey);
      L.offers.reopened(entry.reopenKey);
      const was = PAST[entry.reopenAction] || entry.reopenAction;
      return { ok: true, key: entry.reopenKey,
        summary: `Reopened ${entry.reopenTitle || entry.reopenKey}: it was ${was}, and it's back on your deck.` };
    },
  };

  L.acts = acts;
})(window.VISR_SUPT_LIB ||= {});
