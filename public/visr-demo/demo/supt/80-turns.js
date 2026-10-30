/* VISR DEMO · SUPERINTENDENT · turns — a message's life, as the real runtime runs it.

   There is no streaming in VISR (os/superintendent/thread.js): a send
   answers at once with his message and `busy: true`, the chat draws the
   thinking face, and the conversation is read again every 2 s while busy.
   So here a send records the message and a turn due a moment later (TYPING:
   a few hundred ms to about 1.5 s, longer for a longer message or a turn
   with more to do); every call first settles the turns whose time has
   come, running the dialog then, so the reply (and anything it does to the
   deck) lands at the next read, stamped with when it was due. While a turn
   runs, a read carries what it is doing (`activity`, present tense, one
   step at a time) and `progress` ({label, state, since, seenAt, now}), as
   tycho/superintendent.py relays them. `client_id` is idempotent: a resend
   answers with the first result.

     L.turns.send(body) → {ok, message, busy} | refusal · L.turns.settle()   (async)
     L.turns.read({after?, thread?, subject?}) → {ok, messages, busy, activity, progress, error, threads} */
"use strict";

(function (L) {
  const S = L.state;
  const TYPING = { min: 400, max: 1600 };
  const STEPS = {
    needs: [["discover", "Reading the deck"]],
    walk: [["discover", "Reading the deck"], ["review", "Reading the first card"]],
    next: [["review", "Reading the next card"]],
    act: [["discover", "Reading the deck"], ["act", "Acting on the card"]],
    undo: [["log", "Reading the action log"], ["undo", "Reopening the card"]],
    file: [["intake", "Reading your note"]],
    status: [["discover", "Reading the deck"], ["board", "Reading the board"]],
    who: [["board", "Reading the board"]],
    log: [["log", "Reading the action log"]],
  };
  const invalid = reason => ({ ok: false, code: "invalid", reason });
  const clone = x => JSON.parse(JSON.stringify(x));
  let lastDue = 0, settling = Promise.resolve();

  function plan(msg, ctx) {
    const p = ctx.pending;
    const intent = p ? ({ file: "file", card: "act", confirm: "act", feedback: "act" })[p.type]
      : L.intents.classify(msg.text, ctx).intent;
    const steps = STEPS[intent] || [];
    const ms = 420 + String(msg.text || "").length * 7 + steps.length * 240 + Math.random() * 180;
    return { steps, ms: Math.round(Math.min(TYPING.max, Math.max(TYPING.min, ms))) };
  }

  /* a message as a read shows it: its offers as they stand now */
  function shown(m) {
    const out = clone(m);
    if (m.offers?.length) out.offers = m.offers.map(id => L.offers.view(id)).filter(Boolean);
    return out;
  }

  const turns = {
    send(b) {
      const cid = b?.client_id;
      if (typeof cid !== "string" || !cid) return invalid("A message needs its client id.");
      if (S.clients.has(cid)) return S.clients.get(cid);
      const text = typeof b.text === "string" ? b.text : "";
      const cards = (Array.isArray(b.cards) ? b.cards : []).filter(c => c && typeof c.key === "string")
        .map(({ key, title, kind, id, shots }) => ({ key, title, kind, id, ...(shots ? { shots } : {}) }));
      const files = Array.isArray(b.attachments) ? b.attachments : [];
      if (!text.trim() && !cards.length && !files.length) return invalid("A message needs words, an attachment or a card.");
      const thread = b.thread || null;
      if (thread && !S.threads.has(thread)) return invalid("There is no thread with that id.");
      const meta = thread ? S.threads.get(thread) : null;
      if (b.subject && !(meta?.kind === "project" && meta.subjects?.some(s => s.id === b.subject)))
        return invalid(meta?.kind === "project" ? "That outcome isn't one of this project's." : "A subject is sent only in a project thread.");
      const now = L.clock.now();
      const msg = S.add({ id: S.mid(), role: "user", at: L.clock.iso(now), text, attachments: [], cards,
        ...(thread ? { thread } : {}), ...(b.subject ? { subject: b.subject } : {}) });
      const { steps, ms } = plan(msg, S.ctx(thread));
      const began = Math.max(now, lastDue);
      lastDue = began + ms;
      S.pending.push({ to: msg.id, thread, began: now, due: lastDue, steps });
      const out = { ok: true, message: clone(msg), busy: true };
      S.clients.set(cid, out);
      return out;
    },

    /* every turn whose time has come, in order, one at a time */
    settle() {
      settling = settling.then(async () => {
        while (S.pending.length && S.pending[0].due <= L.clock.now()) {
          const p = S.pending[0];
          const msg = S.messages.find(m => m.id === p.to);
          const id = S.mid();
          let r;
          try { r = await L.dialog.turn(msg, id); }
          catch (e) {
            if (typeof console !== "undefined") console.error("VISR demo Superintendent:", e);
            r = { text: "I tripped over that one; this is a script, and it has edges. Try *what needs me?*", used: [], offers: [] };
          }
          S.pending.shift();
          S.add({ id, role: "assistant", at: L.clock.iso(p.due), text: L.text.quoted(r.text), attachments: [], cards: [],
            activity: (r.used || []).slice(0, 6), replyTo: [msg.id], ...(p.thread ? { thread: p.thread } : {}),
            ...(r.subjects?.length ? { subjects: r.subjects } : {}), ...(r.offers?.length ? { offers: r.offers } : {}) });
        }
      }).catch(e => { if (typeof console !== "undefined") console.error("VISR demo Superintendent:", e); });
      return settling;
    },

    running(thread) { return S.pending.find(p => (p.thread || null) === (thread || null)) || null; },

    activity(p, now) {
      const span = Math.max(p.due - p.began, 1);
      const n = Math.floor((now - p.began) / span * (p.steps.length + 1));
      return p.steps.slice(0, Math.max(0, Math.min(n, p.steps.length))).map(([tool, label]) => ({ tool, label }));
    },

    progress(p, now) {
      const phases = [["starting", "Starting up"], ...(p.steps.length ? p.steps.map(([, l]) => ["tool", l]) : [["thinking", "Thinking"]])];
      const span = Math.max(p.due - p.began, 1) / phases.length;
      const i = Math.max(0, Math.min(Math.floor((now - p.began) / span), phases.length - 1));
      const since = L.clock.iso(p.began + i * span);
      return { label: phases[i][1], state: phases[i][0], since, seenAt: since, now: L.clock.iso(now) };
    },

    read({ after = null, thread = null, subject = null } = {}) {
      const meta = thread ? S.threads.get(thread) : null;
      if (subject && !(meta?.kind === "project"))
        return invalid("subject is an outcome or task id, read only in a project thread.");
      if (subject && !meta.subjects?.some(s => s.id === subject)) return invalid("That outcome isn't one of this project's.");
      let list = S.view(thread, subject);
      const at = after ? list.findIndex(m => m.id === after) : -1;
      list = at >= 0 ? list.slice(at + 1) : list.slice(-200);
      const p = this.running(thread), now = L.clock.now();
      return { ok: true, messages: list.map(shown), busy: !!p, activity: p ? this.activity(p, now) : [],
        progress: p ? this.progress(p, now) : null, error: null, threads: S.rows() };
    },
  };

  L.turns = turns;
  L.TYPING = TYPING;
})(window.VISR_SUPT_LIB ||= {});
