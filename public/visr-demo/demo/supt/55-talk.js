/* VISR DEMO · SUPERINTENDENT · talk — the replies that don't touch the deck.

   Greeting and what it can do; what IntrinsicOS, VISR, owners, outcomes,
   the deck and intake are, in two to four plain sentences each, honest
   that this page is a scripted demo; thanks and goodbye; voice, refused;
   what it has done lately (the action log); and the fallback, which says
   plainly that a script can't do that and offers two or three things to
   try. The client has no suggestion chips, so suggestions are set as a
   short list of italic phrases the visitor can type.

   A topic already explained gets the short version the second time, and
   the variants rotate by how often each was said (state.times), so the
   conversation doesn't repeat itself word for word.

     L.talk.greet · explain · thanks · bye · voice · log · fallback   (c, ctx, msg) → { text, used? } */
"use strict";

(function (L) {
  const T = L.text, S = L.state;

  const waiting = () => {
    const n = L.desk.items().length;
    return n ? `${T.cap(T.count(n, "card"))} ${n === 1 ? "waits" : "wait"} on you right now.` : "Your deck is clear right now.";
  };

  const TOPICS = {
    os: "IntrinsicOS is how Intrinsic Labs runs its work: agents called owners each take one outcome, a result with "
      + "acceptance criteria, and work it until it's ready for review. VISR is where a person reviews: anything that "
      + "needs your judgment lands on your deck as a card, and you accept it, park it or answer it. I'm the "
      + "Superintendent; I keep the deck moving and answer for the whole company. On this page I'm a scripted stand-in, "
      + "working on sample data adapted from the company's own work, and nothing leaves your browser.",
    owner: "An owner is an agent given one outcome to deliver. It works on its own branch, checkpoints when it needs "
      + "you, and stops when the work is ready for review. Owners are named by the model they run on: here claude/opus, "
      + "codex/sol, claude/sonnet and codex/astra.",
    outcome: "An outcome is a result written down before work starts: what will be true, how you'll know (the "
      + "acceptance criteria) and what's out of scope. An owner works toward it, and you accept it when the evidence "
      + "meets the criteria.",
    deck: "The deck is everything waiting on your judgment, one card each: drafts to approve, work to accept, "
      + "questions to answer and tasks that are yours. Each card says what it is, what I'd do, and what each answer does.",
    intake: "Intake is where raw ideas land, one pile per project. A few minutes after a note is filed, the drafter turns it "
      + "into a draft outcome, a chore for you, or nothing; nothing in intake starts work on its own.",
    strategist: "The strategist reads each project once a week and proposes up to three outcomes. Like the drafter's "
      + "drafts from intake, its proposals land on your deck to approve, refuse or correct.",
    park: "Park sets an outcome aside with a reason and a time to look again, and its owner stops. Later only takes "
      + "the card off your deck until tomorrow morning; nothing else changes.",
    demo: "This is a demo. The cards are sample data adapted from the company's own recent work, with client names "
      + "and details changed. I'm a script rather than a model, and every act changes only this page in your browser. "
      + "A reload puts everything back.",
    you: "I'm the Superintendent, the agent that runs the company day to day. I read the board, keep owners moving, "
      + "put decisions on your deck and act on your word. On this page I'm scripted.",
  };
  TOPICS.visr = TOPICS.os;

  const SUGGEST = [
    "*What needs me?*", "*Walk me through the deck*", "*File an idea for Larkspur: …*", "*How is GlyphDeck going?*",
    "*Who is working on what?*", "*What is an outcome?*",
  ];

  function suggestions(ctx, n = 3) {
    const k = S.times(ctx, "suggest");
    const pool = ctx.walk ? ["*Next*", ...SUGGEST] : SUGGEST;
    const out = [pool[0]];
    for (let i = 0; out.length < n; i++) {
      const s = pool[(k + i) % pool.length];
      if (!out.includes(s)) out.push(s);
    }
    return out.map(s => `- ${s}`).join("\n");
  }

  const talk = {
    suggestions,

    greet(c, ctx, msg) {
      const raw = T.norm(msg.text);
      if (/\b(what can you do|what do you do|what can i ask|how can you help|help)\b/.test(raw))
        return { text: "Here's what I can do on this page:\n\n- Tell you what needs you, most important first\n"
          + "- Walk you through the deck a card at a time, and accept, park or defer cards on your word\n"
          + "- File an idea as intake for a project\n- Say how a project stands and who is working on what\n\n"
          + `${waiting()} I'm scripted here, and nothing leaves your browser.` };
      if (/\b(who|what) are you\b/.test(raw)) return { text: `${TOPICS.you} ${waiting()}` };
      const n = S.times(ctx, "greet");
      if (n === 1) return { text: `Hello. I'm the Superintendent: I run the company's day to day and keep your review `
        + `deck moving. ${waiting()} Ask *what needs me?*, say *walk me through the deck*, or tell me an idea and I'll file it.` };
      return { text: [`Still here. ${waiting()}`, `Hello again. ${waiting()}`][n % 2]
        + (ctx.walk ? " Say *next* to carry on through the deck." : " *Walk me through the deck* starts at the top.") };
    },

    explain(c, ctx, msg, replyId) {
      const topic = L.intents.topic(msg.text);
      /* "what is the pickup plan?": a card named, so the card */
      if (!topic || topic === "deck") {
        const r = L.cards.content(msg.text).length ? L.cards.resolve(msg.text, ctx) : {};
        if (r.item) return L.deck.describe(r.item, ctx, replyId);
      }
      const key = !topic || topic === "visr" ? "os" : topic;
      const text = TOPICS[key];
      if (ctx.explained.has(key)) {
        const rest = ["owner", "outcome", "deck", "intake"].filter(t => !ctx.explained.has(t));
        return { text: `In short: ${T.sentence(text).replace(/^./, ch => ch.toLowerCase())}`
          + (rest.length ? ` If it helps, ask what ${rest[0] === "intake" ? "intake is" : `an ${rest[0]} is`}.` : "") };
      }
      ctx.explained.add(key);
      return { text };
    },

    thanks(c, ctx) {
      if (c?.scores?.bye >= 3) { const b = this.bye(c, ctx); return { text: `Thank you. ${b.text.replace(/^Good\. /, "")}` }; }
      const n = S.times(ctx, "thanks");
      const base = ["Of course.", "Any time.", "Glad to.", "Sure."][(n - 1) % 4];
      if (ctx.walk) return { text: `${base} Say *next* when you're ready for the next card.` };
      const left = L.desk.items().length;
      return { text: left && n === 1 ? `${base} ${waiting()}` : base };
    },

    bye(c, ctx) {
      const n = L.desk.items().length;
      ctx.walk = null; ctx.pending = null;
      return { text: n ? `Good. ${T.cap(T.count(n, "card"))} still ${n === 1 ? "waits" : "wait"} on you; they'll keep.`
        : "The deck is clear. Enjoy the quiet." };
    },

    voice() {
      return { text: "Voice isn't available in the demo: there's no microphone or speech on this page. Type to me instead." };
    },

    log(c, ctx) {
      const recent = [...L.log.entries].reverse().slice(0, 5);
      if (!recent.length) return { text: "Nothing in my action log yet.", used: ["Read the action log"] };
      const clock = at => { const d = new Date(at); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
      const lines = recent.map(a => `- ${clock(a.at)} · ${a.label}${a.ok === false ? " (refused)" : a.undone ? " (undone)" : ""}`);
      return { text: `Most recent first:\n\n${lines.join("\n")}\n\nThe whole log is in my settings: tap my name at the top, then Action log.`,
        used: ["Read the action log"] };
    },

    fallback(c, ctx) {
      const n = S.times(ctx, "fallback");
      const lead = n === 1 ? "I'm a scripted stand-in on this page, so I can't do that."
        : n === 2 ? "That's beyond what this script can do, I'm afraid." : "I can't do that one here.";
      return { text: `${lead} Try one of these:\n\n${suggestions(ctx)}` };
    },
  };

  L.talk = talk;
})(window.VISR_SUPT_LIB ||= {});
