/* VISR DEMO · SUPERINTENDENT · what it holds — the conversation, its threads, its log, its memory.

   All in memory: a reload starts again from the seed (35-seed.js). The
   shapes are the runtime's as tycho/superintendent.py relays them (chat
   contract v1, threads v1, activity v1):

     message  {id: "m_…", role: user|assistant|event, at, text, attachments, cards,
               activity?, replyTo?, routine?, offers?: [offer id], thread?, subject?, subjects?, source?}
     thread   {id, kind, title, subjects?}; a read lists each as a row (`rows`)
     action   {id: "a_…", at, tool, label, summary, ok, error?, target?, messageId?,
               capability?, undo?: {receiptId, revision}, undone?}

   `ctx(thread)` is the dialog's memory for one conversation (the main chat
   is ""): the card last talked about, the list last shown, the walk through
   the deck, a question still waiting on an answer (`pending`), what was
   already explained, and acts the visitor made on the deck since.

     L.state.add(m) · L.state.view(thread, subject?) → messages, oldest first
     L.state.rows() → thread rows, newest first · L.state.mid() / L.state.aid()
     L.log.add(entry) → entry · L.log.page(before?, limit?) → {ok, actions, more} · L.log.find(receiptId) */
"use strict";

(function (L) {
  const T = L.text;
  let m = 0, a = 0, r = 0;

  const state = {
    messages: [],
    threads: new Map(),         // id → {kind, title, subjects?, project?}
    pending: [],                // turns still running: {to, thread, began, due, steps}
    clients: new Map(),         // client_id → the send's answer, for a resend
    ctxs: new Map(),
    deckActs: [],               // {key, action, title, at} the visitor made on the deck directly
    settled: new Map(),         // key → {action, by: chat|deck, at, title}: what became of a card

    mid() { return `m_demo_${(++m).toString().padStart(4, "0")}`; },
    aid() { return `a_demo_${(++a).toString().padStart(4, "0")}`; },
    rid() { return `rcpt_demo_${(++r).toString().padStart(3, "0")}`; },

    add(msg) {
      this.messages.push(msg);
      this.messages.sort((x, y) => (x.at || "").localeCompare(y.at || ""));
      return msg;
    },

    ctx(thread) {
      const k = thread || "";
      if (!this.ctxs.has(k))
        this.ctxs.set(k, { lastCard: null, lastList: [], walk: null, pending: null, explained: new Set(),
          said: new Map(), seenActs: 0, project: this.threads.get(k)?.project || null });
      return this.ctxs.get(k);
    },

    /* a dialog's own count of how often it said something: variety without randomness */
    times(ctx, what) { const n = (ctx.said.get(what) || 0) + 1; ctx.said.set(what, n); return n; },

    about(msg, subject) {
      if (msg.role === "event") return msg.subject?.id === subject;
      if (msg.role === "assistant") return (msg.subjects || []).includes(subject);
      return msg.subject === subject;
    },

    view(thread, subject) {
      return this.messages.filter(x => (thread ? x.thread === thread : !x.thread)
        && (!subject || this.about(x, subject)));
    },

    busy(thread) { return this.pending.some(p => (p.thread || null) === (thread || null)); },

    rows() {
      const out = [];
      for (const [id, meta] of this.threads) {
        const mine = this.messages.filter(x => x.thread === id);
        if (!mine.length) continue;
        const reply = [...mine].reverse().find(x => x.role === "assistant");
        const wake = [...mine].reverse().find(x => x.role === "event");
        const row = { id, kind: meta.kind, title: meta.title, at: mine.at(-1).at,
          line: reply ? T.clip(T.sentence(reply.text), 300) : wake ? T.clip(wake.text, 300) : "",
          busy: this.busy(id), error: null };
        if (meta.kind === "project") row.subjects = this.subjects(meta, mine);
        out.push(row);
      }
      return out.sort((x, y) => (y.at || "").localeCompare(x.at || ""));
    },

    subjects(meta, mine) {
      return (meta.subjects || []).map(s => {
        const its = mine.filter(x => this.about(x, s.id));
        if (!its.length) return null;
        const reply = [...its].reverse().find(x => x.role === "assistant");
        return { kind: s.kind, id: s.id, title: s.title, at: its.at(-1).at,
          line: reply ? T.clip(T.sentence(reply.text), 300) : "" };
      }).filter(Boolean).sort((x, y) => (y.at || "").localeCompare(x.at || ""));
    },
  };

  const log = {
    entries: [],                // oldest first
    PAGE: 15,

    add(e) {
      const entry = { id: state.aid(), at: e.at || L.clock.iso(), ok: e.error ? false : true, summary: "", ...e };
      if (!entry.ok && !entry.error) entry.error = "";
      this.entries.push(entry);
      this.entries.sort((x, y) => (x.at || "").localeCompare(y.at || ""));
      return entry;
    },

    page(before, limit) {
      let list = [...this.entries].reverse();
      if (before) {
        const i = list.findIndex(x => x.id === before);
        list = i < 0 ? [] : list.slice(i + 1);
      }
      const n = limit || this.PAGE;
      const shown = list.slice(0, n).map(({ offerRef, reopenKey, reopenAction, reopenTitle, ...x }) => JSON.parse(JSON.stringify(x)));
      return { ok: true, actions: shown, more: list.length > n };
    },

    find(receiptId) { return this.entries.find(x => x.undo?.receiptId === receiptId) || null; },

    /* the newest act this conversation could still take back */
    lastUndoable() { return [...this.entries].reverse().find(x => x.undo && x.reopenKey) || null; },
  };

  Object.assign(L, { state, log });
})(window.VISR_SUPT_LIB ||= {});
