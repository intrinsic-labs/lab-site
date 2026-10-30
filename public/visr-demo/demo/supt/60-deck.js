/* VISR DEMO · SUPERINTENDENT · deck — the replies that read or move the review deck.

   What needs you (live items, most important first, numbered so "the
   second" works next); a walk through the deck one card at a time, each
   with what it is, what I'd do, and a chip to do it (offers.js), "next" to
   move on; an act on a card named by number, title words, project or "it",
   asking which when it's ambiguous; undo; a project's status; who is
   working on what. Every reply that reads the deck first says what you did
   on the deck yourself since we last spoke, so "what needs me?" stays true.

     L.deck.needs · walk · next · act · undo · status · who   (c, ctx, msg, replyId) → { text, used?, offers? }
     L.deck.describe(item, ctx, replyId?) · L.deck.doAct(item, action, ctx, msg, replyId, text?) */
"use strict";

(function (L) {
  const T = L.text, S = L.state, C = L.cards;

  const WHY = {
    owner_waiting: "an owner stopped until you answer", owner_review: "ready for your accept",
    decision: "a yes-or-no from the manager", status_request: "an owner asking where things stand",
    draft_outcome: "a draft outcome to approve or correct", proposal: "proposed tasks to approve",
    chore: "a task that's yours", linear: "an issue to route to an owner", receipt: "a rule acted for you; undo it if it got it wrong",
  };

  /* what you did on the deck yourself since this conversation last looked */
  function notice(ctx) {
    const acts = S.deckActs.slice(ctx.seenActs).filter(a => !/working$/.test(a.action));
    ctx.seenActs = S.deckActs.length;
    if (!acts.length) return "";
    return `Since we last spoke you ${T.list(acts.map(a => L.acts.did(a.action, `**${a.title}**`)))} on the deck. `;
  }

  const live = key => L.desk.find(key);
  const projectName = i => L.projects.of(i)?.name || "";
  const extractNote = raw => (/:\s*(.{3,})$/.exec(raw)
    || /\btell (?:the )?(?:owner|drafter|birch|ash|cedar|them|agent\/\w+)\s+(?:that\s+|to\s+)?(.{3,})$/i.exec(raw))?.[1]?.trim() || "";

  function ask(action, list, ctx, lead) {
    ctx.pending = { type: "card", action, candidates: list.map(i => i.key) };
    const lines = list.map((i, n) => `${n + 1}. ${C.link(i)}: ${C.kind(i)}`).join("\n");
    return { text: `${lead}\n\n${lines}\n\nSay the number, or a word from its title.` };
  }

  const deck = {
    notice,

    needs(c, ctx) {
      const lead = notice(ctx);
      const ranked = C.rank(L.desk.items());
      const later = L.desk.all().length - ranked.length;
      ctx.walk = null;
      if (!ranked.length) return { text: `${lead}Nothing needs you right now${later ? `; ${T.count(later, "card")} ${later === 1 ? "is" : "are"} set for later` : ""}.`, used: ["Read the deck"] };
      ctx.lastList = ranked.map(i => i.key);
      ctx.lastCard = ranked.length === 1 ? ranked[0].key : ctx.lastCard;
      const lines = ranked.slice(0, 4).map((i, n) => `${n + 1}. ${C.link(i)}: ${WHY[i.kind] || C.kind(i)}.`);
      const more = ranked.length - 4;
      const n = ranked.length;
      return { used: ["Read the deck"],
        text: `${lead}${T.cap(T.count(n, "card"))} ${n === 1 ? "waits" : "wait"} on you. In the order I'd take them:\n\n${lines.join("\n")}`
          + (more > 0 || later ? "\n\n" : "") + (more > 0 ? `${T.cap(T.count(more, "more card"))} after those.` : "")
          + (later ? `${more > 0 ? " " : ""}${T.cap(T.count(later, "card"))} ${later === 1 ? "is" : "are"} set for later.` : "")
          + "\n\nSay *walk me through* and I'll take them one at a time, or name one to act on it." };
    },

    walk(c, ctx, msg, replyId) {
      const order = C.rank(L.desk.items()).map(i => i.key);
      if (!order.length) return { text: `${notice(ctx)}Your deck is clear: nothing to walk through.`, used: ["Read the deck"] };
      ctx.walk = { order, i: 0 };
      ctx.lastList = order;
      const lead = `${notice(ctx)}Here's the deck, most important first.\n\n`;
      const r = this.present(ctx, replyId);
      return { ...r, text: lead + r.text };
    },

    next(c, ctx, msg, replyId) {
      if (!ctx.walk) return this.walk(c, ctx, msg, replyId);
      const w = ctx.walk;
      let i = w.i + 1;
      while (i < w.order.length && !live(w.order[i])) i++;
      if (i >= w.order.length) {
        ctx.walk = null; ctx.pending = null;
        const left = L.desk.items().length;
        return { text: `${notice(ctx)}That's the whole deck. ` + (left ? `${T.cap(T.count(left, "card"))} still ${left === 1 ? "waits" : "wait"} on you; say *walk me through* to go round again.`
          : "Everything on it is settled."), used: ["Read the deck"] };
      }
      w.i = i;
      return this.present(ctx, replyId);
    },

    /* the walk's current card, with a chip for its main answer */
    present(ctx, replyId) {
      const w = ctx.walk, item = live(w.order[w.i]);
      const head = `**${w.i + 1} of ${w.order.length}** · ${[projectName(item), C.kind(item)].filter(Boolean).join(" · ")}`;
      const body = this.describe(item, ctx, replyId);
      return { ...body, text: `${head}\n\n${body.text}`, used: [`Read ${C.id(item)}`] };
    },

    describe(item, ctx, replyId) {
      ctx.lastCard = item.key;
      const a = C.advice(item);
      const read = a ? `\n\nMy read: ${a.text}${a.reason ? ` ${a.reason}` : ""}${a.doubt ? ` The doubt: ${a.doubt}` : ""}` : "";
      const offer = replyId ? L.offers.make(item, replyId) : null;
      const main = L.acts.fit(item, "accept") || L.acts.fit(item, "approve");
      ctx.pending = offer && main ? { type: "confirm", action: main, key: item.key } : null;
      const how = offer ? (main === "accept" ? "Accept it from the chip, or say *park it*, *later* or *next*."
        : "Approve it from the chip, or say *later*, *refuse it* or *next*.")
        : item.kind === "chore" ? "It's yours to do; say *done* once it is, or *next*."
          : `It takes ${L.acts.takes(item)}; say which, or *next*.`;
      return { text: `${C.link(item)}. ${C.gist(item)}${read}\n\n${ctx.walk ? how : how.replace(/,? or \*next\*/, "")}`,
        offers: offer ? [offer] : [] };
    },

    async act(c, ctx, msg, replyId) {
      const action = c.act;
      const r = C.resolve(msg.text, ctx, { action });
      if (r.gone) {
        const s = S.settled.get(r.gone);
        ctx.lastCard = null;
        return { text: s ? `You already ${L.acts.did(s.action, `**${s.title}**`)}${s.by === "deck" ? " on the deck" : ""}.`
          : "That card has already left your deck." };
      }
      if (r.ambiguous) return ask(action, r.ambiguous, ctx, `Which one should I ${L.acts.LABEL[action] || action}?`);
      if (!r.item) {
        const fits = C.rank(L.desk.items()).filter(i => L.acts.fit(i, action)).slice(0, 3);
        if (!fits.length) return { text: `Nothing on your deck takes ${L.acts.LABEL[action] || action} right now.` };
        if (fits.length === 1) {
          ctx.pending = { type: "confirm", action: L.acts.fit(fits[0], action), key: fits[0].key };
          ctx.lastCard = fits[0].key;
          return { text: `Do you mean ${C.link(fits[0])}? It's the only card that takes that. Say *yes* and I'll do it.` };
        }
        return ask(action, fits, ctx, `Which card should I ${L.acts.LABEL[action] || action}?`);
      }
      return this.doAct(r.item, action, ctx, msg, replyId);
    },

    async doAct(item, action, ctx, msg, replyId, note = null) {
      ctx.pending = null;
      const real = L.acts.fit(item, action);
      if (!real) {
        const alt = action === "park" && L.acts.fit(item, "later") ? "later" : null;
        if (alt) ctx.pending = { type: "confirm", action: alt, key: item.key };
        ctx.lastCard = item.key;
        return { text: `${C.link(item)} can't be ${L.acts.PAST[action] || action}: it takes ${L.acts.takes(item)}.`
          + (alt ? " Want it moved to later instead?" : "") };
      }
      const text = real === "feedback" ? note || extractNote(msg.text) : "";
      if (real === "feedback" && !text) {
        ctx.pending = { type: "feedback", key: item.key };
        return { text: `What should I tell the owner of ${C.link(item)}?` };
      }
      const out = await L.acts.perform(item, real, { owner: L.acts.owner(msg.text, item), text, via: "request",
        messageId: replyId, asked: { messageId: msg.id, quote: T.clip(msg.text, 2000) } });
      if (!out.ok) return { text: `The deck didn't take that: ${out.reason}` };
      ctx.lastCard = item.key;
      const first = S.times(ctx, "acted") === 1;
      const undo = out.entry.undo && first ? " If that was wrong, *undo that* puts it back." : "";
      const demo = first ? " (Only the deck on this page changed.)" : "";
      let next = "";
      if (ctx.walk) next = " Say *next* for the next card.";
      else {
        const up = C.rank(L.desk.items())[0];
        if (up) { next = ` Next up: ${C.link(up)}.`; ctx.lastList = C.rank(L.desk.items()).map(i => i.key); }
        else next = " That clears your deck.";
      }
      return { text: `${out.line}${undo}${next}${demo}`, used: [T.cap(out.did)] };
    },

    async undo(c, ctx) {
      const entry = L.log.lastUndoable();
      if (!entry) return { text: "There's nothing of mine to undo just now. Undo works on accepts, parks and the like made here." };
      const out = await L.acts.undo(entry);
      if (!out.ok) return { text: `I couldn't put it back: ${out.reason}` };
      ctx.lastCard = out.key;
      const it = live(out.key);
      return { text: `Done. ${out.summary.replace(/^Reopened [^:]+/, `Reopened ${it ? C.link(it) : `**${entry.reopenTitle}**`}`)}`,
        used: [`Reopened ${C.id({ key: out.key })}`] };
    },

    status(c, ctx, msg) {
      const p = c.project || L.projects.find(msg.text, { loose: true }) || (ctx.project && L.desk.project(ctx.project));
      const lead = notice(ctx);
      if (!p) {
        const lines = L.desk.projects().map(x => `- **${x.name}**: ${L.facts.line(x.slug)} ${this.waitingOn(x.slug)}`);
        return { text: `${lead}Where things stand:\n\n${lines.join("\n")}`, used: ["Read the deck", "Read the board"] };
      }
      ctx.project = p.slug;
      const items = C.rank(L.desk.items().filter(i => L.projects.of(i)?.slug === p.slug));
      if (items.length) { ctx.lastList = items.map(i => i.key); if (items.length === 1) ctx.lastCard = items[0].key; }
      const shipped = L.desk.happened().filter(h => h.project === p.slug).slice(0, 1).map(h => ` Recently: ${h.summary}`).join("");
      return { text: `${lead}**${p.name}**: ${L.facts.line(p.slug)}${shipped}\n\n`
        + (items.length ? `Waiting on you: ${T.list(items.map(i => C.link(i)))}.` : `Nothing from ${p.name} waits on you.`),
        used: ["Read the deck", "Read the board"] };
    },

    waitingOn(slug) {
      const n = L.desk.items().filter(i => L.projects.of(i)?.slug === slug).length;
      return n ? `${T.cap(T.count(n, "card"))} ${n === 1 ? "waits" : "wait"} on you.` : "Nothing waits on you.";
    },

    who(c, ctx, msg) {
      const ws = T.words(msg.text);
      const lines = L.facts.roster();
      const one = lines.filter(l => ws.some(w => w === l.agent.split("/").pop()));
      const shown = one.length ? one : lines;
      return { text: (one.length ? "" : "Right now:\n\n") + shown.map(l => `- **${l.agent}** · ${l.what}`).join("\n")
        + (one.length ? "" : "\n\nThe strategist drafts from intake, and I keep the board moving. Nobody is stuck on anyone but you."),
        used: ["Read the board"] };
    },
  };

  L.deck = deck;
})(window.VISR_SUPT_LIB ||= {});
