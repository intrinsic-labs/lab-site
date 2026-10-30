/* VISR DEMO · SUPERINTENDENT · the dialog — one message in, one reply out.

   First what the message carries: a card attached from the deck becomes
   "it". Then, when the last reply asked something (`ctx.pending`), whether
   this answers it:

     file      which project / what idea (65-file.js)
     card      which of the candidates it listed: a number, "the second", a title word
     confirm   yes or no to the card it just put in front of you ("Want it moved to later?")
     feedback  the words for an owner

   "Never mind" drops any of them; a message that is plainly a new request
   drops the question and is answered as one. Otherwise the intent
   (40-intents.js) picks the reply. A reply in a project thread is about the
   subject the message was scoped to, when it was.

     L.dialog.turn(msg, replyId) → { text, used, offers, subjects? }   (async) */
"use strict";

(function (L) {
  const T = L.text, S = L.state;

  const HANDLERS = {
    greet: (c, ctx, m) => L.talk.greet(c, ctx, m),
    explain: (c, ctx, m, id) => L.talk.explain(c, ctx, m, id),
    thanks: (c, ctx, m) => L.talk.thanks(c, ctx, m),
    bye: (c, ctx, m) => L.talk.bye(c, ctx, m),
    voice: (c, ctx, m) => L.talk.voice(c, ctx, m),
    log: (c, ctx, m) => L.talk.log(c, ctx, m),
    fallback: (c, ctx, m) => L.talk.fallback(c, ctx, m),
    needs: (c, ctx, m, id) => L.deck.needs(c, ctx, m, id),
    walk: (c, ctx, m, id) => L.deck.walk(c, ctx, m, id),
    next: (c, ctx, m, id) => L.deck.next(c, ctx, m, id),
    act: (c, ctx, m, id) => L.deck.act(c, ctx, m, id),
    undo: (c, ctx, m, id) => L.deck.undo(c, ctx, m, id),
    status: (c, ctx, m, id) => L.deck.status(c, ctx, m, id),
    who: (c, ctx, m, id) => L.deck.who(c, ctx, m, id),
    file: (c, ctx, m, id) => L.filing.start(c, ctx, m, id),
  };

  /* asking about something else ends a walk through the deck; acting, thanks or a stray question don't */
  const ENDS_WALK = new Set(["needs", "status", "who", "file", "log", "bye"]);

  function about(msg, ctx, replyId) {
    const words = L.cards.content(msg.text);
    if (!words.length) return null;
    const found = L.cards.match(words, L.desk.all());
    if (!found.length || found[0].s < 1) return null;
    const close = found.filter(x => x.s >= found[0].s - 0.3);
    if (close.length === 1) return L.deck.describe(close[0].i, ctx, replyId);
    ctx.lastList = close.slice(0, 3).map(x => x.i.key);
    return { text: `Do you mean ${T.or(close.slice(0, 3).map(x => L.cards.link(x.i)))}? `
      + "Name it, or give me its number." };
  }

  async function answer(ctx, msg, replyId) {
    const p = ctx.pending, raw = String(msg.text || "");
    if (L.intents.cancel(raw) && T.words(raw).length <= 4) {
      ctx.pending = null;
      return { text: p.type === "file" ? "Dropped it; nothing was filed." : "Fine, I've left it as it is." };
    }
    if (p.type === "file") return L.filing.fill(ctx, msg, replyId);
    if (p.type === "card") {
      const r = L.cards.resolve(raw, ctx, { pool: p.candidates, action: p.action });
      if (r.item) return L.deck.doAct(r.item, p.action, ctx, msg, replyId);
      if (L.intents.yes(raw) && p.candidates.length === 1) {
        const it = L.desk.find(p.candidates[0]);
        if (it) return L.deck.doAct(it, p.action, ctx, msg, replyId);
      }
      if (L.intents.strong(raw, ctx, "act") || L.intents.verb(raw)) { ctx.pending = null; return null; }
      const left = p.candidates.map(k => L.desk.find(k)).filter(Boolean);
      if (!left.length) { ctx.pending = null; return null; }
      return { text: `I didn't catch which. ${left.map((i, n) => `${n + 1}. ${L.cards.link(i)}`).join(" · ")}. A number will do.` };
    }
    if (p.type === "confirm") {
      if (L.intents.yes(raw)) {
        ctx.pending = null;
        const it = L.desk.find(p.key);
        if (!it) return { text: "That card has already left your deck, so there's nothing to do." };
        return L.deck.doAct(it, p.action, ctx, msg, replyId, p.text || null);
      }
      ctx.pending = null;
      if (L.intents.no(raw)) return { text: `Left it as it is.${ctx.walk ? " Say *next* for the next card." : ""}` };
      return null;
    }
    if (p.type === "feedback") {
      if (L.intents.strong(raw, ctx, "act") && T.words(raw).length <= 5) { ctx.pending = null; return null; }
      const it = L.desk.find(p.key);
      ctx.pending = null;
      if (!it) return { text: "That card has already left your deck, so the note has nowhere to go." };
      return L.deck.doAct(it, "feedback", ctx, msg, replyId, raw.trim());
    }
    ctx.pending = null;
    return null;
  }

  const dialog = {
    async turn(msg, replyId) {
      const ctx = S.ctx(msg.thread);
      const card = (msg.cards || []).map(c => L.desk.find(c.key)).find(Boolean);
      if (card) ctx.lastCard = card.key;
      let out = null;
      if (!String(msg.text || "").trim()) out = card ? L.deck.describe(card, ctx, replyId)
        : { text: "That came through without words. What would you like to do with it?" };
      if (!out && ctx.pending) out = await answer(ctx, msg, replyId);
      if (!out) {
        const c = L.intents.classify(msg.text, ctx);
        ctx.pending = null;
        if (ENDS_WALK.has(c.intent)) ctx.walk = null;
        /* nothing else fits, but it names a card: say what that card is */
        if (c.intent === "fallback") out = about(msg, ctx, replyId);
        if (!out) out = await HANDLERS[c.intent](c, ctx, msg, replyId);
      }
      return { text: out.text, used: out.used || [], offers: out.offers || [],
        ...(msg.subject ? { subjects: [msg.subject] } : {}) };
    },
  };

  L.dialog = dialog;
})(window.VISR_SUPT_LIB ||= {});
