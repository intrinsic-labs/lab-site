/* VISR DEMO · SUPERINTENDENT · intents — what the visitor is asking for.

   Each intent is a bag of weighted words (one typo allowed), phrases and
   patterns (10-text.js `score`); the highest score over THRESHOLD wins, ties
   going to the earlier intent in PRIORITY. An act on a card ("accept it",
   "park the slides", "aprove the pickup plan") is found by its verb; a verb
   that also turns up in ordinary speech ("later", "done") only counts as an
   act when a card is in play. A lead-in like "file an idea:" beats any verb
   inside the idea itself, and a bare project name asks for its status.

     L.intents.classify(text, ctx) → { intent, score, act?, scores }
     L.intents.verb(text) → { action, loose } | null
     L.intents.yes(text) · L.intents.no(text) · L.intents.cancel(text)
     L.intents.topic(text) → what an explain is about: os|visr|deck|owner|outcome|intake|you|park|demo|strategist|null */
"use strict";

(function (L) {
  const T = L.text;
  const THRESHOLD = 2;

  const SPECS = {
    greet: { words: { hi: 2.5, hello: 2.5, hey: 2.5, hiya: 2.5, howdy: 2.5, yo: 2, help: 2.5 },
      phrases: { "good morning": 3, "good afternoon": 3, "good evening": 3, "who are you": 3.5, "what are you": 3.5,
        "what can you do": 3.5, "what do you do": 3.5, "what can i ask": 3.5, "how can you help": 3.5, morning: 1 } },
    explain: { words: { explain: 3, intrinsicos: 1.5, visr: 1.5 },
      phrases: { "how does this work": 4, "how does it work": 4, "how does visr work": 4, "what is this": 3.5,
        "what am i looking at": 4, "is this real": 4, "is this a demo": 4, "tell me about": 2, "how it works": 3.5,
        "what is the point": 3, "what is going on here": 3 },
      re: [[/\b(what|who) (is|are) (a |an |the )?(owner|owners|outcome|outcomes|deck|card|cards|intake|visr|intrinsicos|intrinsic|superintendent|strategist|agents?|receipt|parking|park)\b/, 4]] },
    needs: { words: { waiting: 1.5, urgent: 2, pending: 1.5, priorities: 2.5, priority: 2, blocking: 1.5, inbox: 2 },
      phrases: { "what needs me": 4, "needs me": 3, "needs my": 2.5, "what is waiting": 3.5, "waiting on me": 3.5,
        "waiting for me": 3.5, "on my plate": 3.5, "what do i have": 3, "anything for me": 3.5, "what should i do": 3,
        "what should i look at": 3.5, "what is blocking": 3, "blocked on me": 3.5, "on my deck": 3.5, "what can i accept": 4,
        "what is pending": 3, "what is on fire": 3.5, "what matters": 3, "to do": 1.5, "whats up": 2, "what is up": 2 } },
    walk: { words: { walk: 2.5 },
      phrases: { "walk me through": 4, "walk through": 3.5, "go through": 3, "one at a time": 3.5, "one by one": 3.5,
        "review with me": 3.5, "let us review": 3, "take me through": 4, "start the deck": 3.5, "first card": 3,
        "show me the deck": 3.5, "start from the top": 3.5 } },
    next: { words: { next: 3, skip: 3, onward: 2.5 },
      phrases: { "next one": 3.5, "move on": 3.5, "keep going": 3.5, "go on": 2.5, "what else": 3, "and then": 1.5 } },
    file: { words: { idea: 3, ideas: 2.5, intake: 2.5, jot: 2.5, braindump: 3 },
      phrases: { "file an idea": 4, "file a note": 4, "file this": 3, "file that": 3, "i have an idea": 4,
        "i had an idea": 4, "new idea": 3, "jot down": 3, "write down": 3, "remember that": 3, "add to intake": 4,
        "make a note": 3.5, "note that": 2.5, "brain dump": 3, "we should": 1.5, "what if": 1.5, "file it": 2 } },
    status: { words: { status: 3, progress: 2, update: 2 },
      phrases: { "status of": 3.5, "status on": 3.5, "how is": 1.5, "how are things": 3, "going with": 2,
        "where are we": 3, "update on": 3, "progress on": 3, "what is happening with": 3.5, "what is going on with": 3.5,
        "catch me up": 3.5, "how is it going": 2.5, "how is everything": 3.5, "how are we doing": 3.5,
        "how are things going": 3.5 } },
    who: { words: { agents: 2, agent: 1.5, opus: 1.5, sol: 1.5, sonnet: 1.5, astra: 1.5, claude: 1.5, codex: 1.5,
      team: 1.5, everyone: 1.5, busy: 1 },
      phrases: { "who is working": 4, "who is on": 3, "who is doing": 3.5, "what are the agents": 4, "agents doing": 3.5,
        "who owns": 3.5, "working on what": 4, "what is everyone": 3.5, "who is building": 3.5 } },
    log: { words: { log: 2.5 },
      phrases: { "what have you done": 4, "what did you do": 4, "action log": 4, "what you did": 3, "your actions": 3,
        "what have you been": 3 } },
    undo: { words: { undo: 4, revert: 3.5, reopen: 3.5 },
      phrases: { "undo that": 4.5, "undo it": 4.5, "take that back": 4, "take it back": 4, "put it back": 4,
        "changed my mind": 3.5 } },
    voice: { words: { voice: 3, aloud: 3, dictate: 3, audio: 3, microphone: 3 },
      phrases: { "out loud": 3.5, "can you talk": 3.5, "can you speak": 3.5, "talk to me": 2.5, "hear you": 3 } },
    thanks: { words: { thanks: 3.5, thank: 3.5, cheers: 3, perfect: 2, great: 1.5, awesome: 2, nice: 1.5, cool: 1.5,
      ok: 1.2, okay: 1.2, good: 1 }, phrases: { "thank you": 4, "got it": 2.5, "sounds good": 2.5, "makes sense": 2.5 } },
    bye: { words: { bye: 4, goodbye: 4, cya: 3.5, goodnight: 3.5 },
      phrases: { "see you": 3.5, "talk later": 3.5, "that is all": 3.5, "that is it": 3, "good night": 3.5,
        "i am done": 3, "signing off": 3.5, "catch you later": 4 } },
  };
  const PRIORITY = ["undo", "file", "act", "walk", "next", "needs", "status", "who", "log", "explain", "voice",
    "greet", "bye", "thanks"];

  const ACTS = [
    ["accept", ["accept", "accepted"], ["sign off", "ship it", "looks good", "lgtm"]],
    ["approve", ["approve", "approved", "greenlight"], ["green light", "answer yes", "say yes to", "go with it"]],
    ["park", ["park", "shelve"], ["on hold", "put aside", "set aside", "put it aside"]],
    ["later", ["snooze", "defer", "postpone", "later"], ["not now", "push it", "for tomorrow", "until tomorrow", "come back to it"]],
    ["done", ["done", "finished"], ["mark done", "mark it done", "mark as done", "i sent it", "sent it"]],
    ["reject", ["reject", "refuse", "decline"], ["turn down", "turn it down", "say no to", "answer no"]],
    ["not_needed", ["dismiss"], ["not needed", "no longer needed", "do not need", "drop it", "close it", "drop the"]],
    ["feedback", ["feedback"], ["tell the owner", "tell opus", "tell sol", "tell sonnet", "tell astra", "tell the drafter",
      "let the owner know", "send a note", "tell them"]],
    ["acknowledge", ["acknowledge"], []],
  ];
  const LOOSE = new Set(["later", "done", "finished"]);
  const FILE_LEAD = /^(please |can you |could you |hey |ok |so )?(file|note|jot|capture|add an idea|add a note|write down|remember|i have an idea|i had an idea|idea|new idea|here is an idea|quick idea|an idea|brain dump|make a note)\b/;

  for (const [, words, phrases] of ACTS) for (const w of [...words, ...phrases.flatMap(p => p.split(" "))]) L.cards.VERBS.add(w);
  for (const w of "sign off ship mark push hold aside close drop needed not answer tell until tomorrow today tonight monday tuesday wednesday thursday friday saturday sunday week".split(" "))
    L.cards.VERBS.add(w);

  const TOPICS = [
    ["owner", /\b(owners?|agents?)\b/], ["outcome", /\boutcomes?\b/], ["intake", /\bintake\b/],
    ["strategist", /\bstrategist\b/], ["park", /\b(park|parking|parked|later)\b/],
    ["demo", /\b(demo|real|fake|scripted|live)\b/], ["deck", /\b(deck|cards?)\b/], ["visr", /\bvisr\b/],
    ["os", /\b(intrinsicos|intrinsic os|intrinsic labs|intrinsic|the system|company)\b/],
    ["you", /\b(you|superintendent)\b/],
  ];

  const intents = {
    THRESHOLD,

    verb(raw) {
      const normed = T.norm(raw), ws = T.words(raw);
      for (const [action, words, phrases] of ACTS) {
        if (phrases.some(p => T.phrase(normed, p))) return { action, loose: false };
        const w = words.find(x => ws.some(y => LOOSE.has(x) ? y === x : T.near(y, x)));
        if (w) return { action, loose: LOOSE.has(w) };
      }
      return null;
    },

    classify(raw, ctx) {
      const normed = T.norm(raw);
      const scores = {};
      for (const [k, spec] of Object.entries(SPECS)) scores[k] = T.score(raw, spec);
      const verb = this.verb(raw);
      scores.act = 0;
      if (verb) scores.act = !verb.loose ? 3.6 : ctx.lastCard || ctx.walk ? 3.2 : 2.2;
      if (FILE_LEAD.test(normed) && scores.file >= 1.5) scores.file += 3;
      if (scores.bye >= 3.5 && verb?.loose) scores.act = 0;
      if (scores.undo >= 3.5) scores.act = 0;
      const project = L.projects.find(raw);
      const best = Math.max(...Object.values(scores));
      if (project && best < 2.5 && T.words(raw).length <= 4) scores.status = Math.max(scores.status, 3);
      else if (project && scores.status > 0) scores.status += 1;
      let intent = "fallback", score = 0;
      for (const k of PRIORITY) if (scores[k] > score) { intent = k; score = scores[k]; }
      if (score < THRESHOLD) intent = "fallback";
      return { intent, score, act: verb?.action || null, project, scores };
    },

    /* a strong intent other than `but`: whether a reply to a question is really a new request */
    strong(raw, ctx, but) {
      const c = this.classify(raw, ctx);
      return c.intent !== "fallback" && c.intent !== but && c.score >= 3.4 ? c : null;
    },

    yes(raw) {
      const n = T.norm(raw);
      return /^(yes|yeah|yep|yup|sure|ok|okay|please|please do|do it|go ahead|go for it|sounds good|absolutely|definitely|correct|right|y)\b/.test(n)
        && !/\b(not|no|dont|do not)\b/.test(n);
    },
    no(raw) { return /^(no|nope|nah|not yet|not now|dont|do not|leave it|skip it|n)\b/.test(T.norm(raw)); },
    cancel(raw) { return /\b(never mind|nevermind|cancel|forget it|forget that|scratch that|stop)\b/.test(T.norm(raw)); },

    topic(raw) {
      const n = T.norm(raw);
      if (/\b(what|how)\b.*\b(work|this)\b/.test(n) && !/\b(owner|outcome|intake|deck|card|strategist)/.test(n)) return null;
      return TOPICS.find(([, re]) => re.test(n))?.[0] || null;
    },
  };

  L.intents = intents;
})(window.VISR_SUPT_LIB ||= {});
