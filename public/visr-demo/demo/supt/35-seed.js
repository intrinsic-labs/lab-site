/* VISR DEMO · SUPERINTENDENT · the seed — what was said and done before the visitor arrived.

   Built once, on the first call, from the deck as it then is, so every
   link points at a card that exists (a card the corpus no longer has is
   named in bold instead). Every time is relative to page load:

   - the main chat: yesterday evening's question, a routine blocker check,
     and a short exchange from fifty minutes ago, greeted for the visitor's
     own time of day;
   - three threads (threads v1): Larkspur's project thread, with two outcomes
     as subjects and one scoped question from you; the owner thread of
     Harlow's Patients and Appointments; the owner thread of Heelwork's
     exercise names, stopped on a question for you;
   - an action log of three days of plausible work, one refused call among
     it, enough entries that the log reads a second page.

     L.seed() → once */
"use strict";

(function (L) {
  const S = L.state;
  const min = n => L.clock.ago(n);
  const plus = (iso, sec) => new Date(Date.parse(iso) + sec * 1000).toISOString();

  /* a link to the card if it is on the deck, else its name in bold */
  const ref = (key, name) => {
    const it = L.desk.find(key);
    return it ? `[${name || L.cards.name(it)}](#item=${key})` : `**${name || key.split(":").pop()}**`;
  };

  const user = (id, at, text, extra = {}) => ({ id, role: "user", at, text, attachments: [], cards: [], ...extra });
  const reply = (id, at, text, to, used = [], extra = {}) =>
    ({ id, role: "assistant", at, text, attachments: [], cards: [], activity: used, replyTo: to, ...extra });
  const wake = (id, at, kind, name, text, extra = {}) => ({ id, role: "event", at, source: { kind, name }, text, ...extra });

  const LARKSPUR = "project:engine/larkspur", HARLOW = "owner:hlw-patients-and-appointments",
    HEELWORK = "owner:hwk-exercise-title-fallback";
  const PICKUP = { kind: "outcome", id: "lsp-pickup-plan", title: "Pickup plan" };
  const HANDOFF = { kind: "outcome", id: "lsp-application-handoff", title: "Application handoff" };

  /* the earlier exchange sits fifty minutes back, greeted for the visitor's own time of day */
  const hello = () => {
    const h = new Date(L.clock.loaded - 50 * 60_000).getHours();
    return h >= 5 && h < 12 ? "Morning." : h >= 12 && h < 18 ? "Afternoon." : "Evening.";
  };

  function chat() {
    const y = new Date(L.clock.loaded - 86_400_000); y.setHours(18, 10, 0, 0);
    const yday = y.toISOString(), am = min(50);
    const top = L.cards.rank(L.desk.items());
    const pass = top.slice(0, 2).map(i => `- ${L.cards.link(i)}: ${L.cards.kind(i)}.`).join("\n");
    return [
      user("m_seed_01", yday, "Anything I should know before tomorrow?"),
      reply("m_seed_02", plus(yday, 40), "Harlow's Patients and Appointments should reach your deck by morning: Android "
        + "passes, and claude/opus is running the iOS simulator now. The Larkspur pickup-plan draft is written. "
        + "Nothing is stuck on anyone else.", ["m_seed_01"], ["Read the board"]),
      reply("m_seed_r1", plus(am, -32 * 60), `${L.text.cap(L.text.count(top.length, "card"))} wait on you; `
        + `nobody is stopped on anything but you.${pass ? `\n\n${pass}` : ""}`, [], ["Read the deck", "Read the board"],
        { routine: { name: "blocker-check", title: "Blocker check" } }),
      user("m_seed_03", am, `${hello()} Anything on fire?`),
      reply("m_seed_04", plus(am, 30), `Nothing on fire. The one that matters today is `
        + `${ref(HARLOW, "Harlow patients and appointments")}: the PR is green and every criterion has evidence, `
        + `so it waits on your merge and your accept. claude/opus also wants to merge runner changes in the private `
        + `repos without a card each; ${ref("decision:dec-41", "that question")} is on your deck too.`, ["m_seed_03"], ["Read the deck"]),
    ];
  }

  function threads() {
    S.threads.set(LARKSPUR, { kind: "project", title: "Larkspur", project: "larkspur", subjects: [PICKUP, HANDOFF] });
    S.threads.set(HARLOW, { kind: "owner", title: "Harlow patients and appointments", project: "harlow" });
    S.threads.set(HEELWORK, { kind: "owner", title: "Exercise names", project: "heelwork" });
    const t = (n, s = 0) => plus(min(n), s);
    return [
      /* Larkspur: two outcomes, one question of yours scoped to the pickup plan */
      wake("m_seed_o1", t(60 * 20), "owner", "Application handoff", "Released: merged and live. A failed application "
        + "notice now shows “Didn't send” on the breeder's dashboard, with Send again.", { thread: LARKSPUR, subject: HANDOFF }),
      reply("m_seed_o2", t(60 * 20, 40), "Logged the release. She can see and resend a failed notice herself now, without "
        + "a developer. The owner checked it with a refused send and a double-click: one message, not two.",
        ["m_seed_o1"], ["Read an outcome"], { thread: LARKSPUR, subjects: [HANDOFF.id] }),
      wake("m_seed_o3", t(60 * 3 + 20), "owner", "Pickup plan", "Draft ready: a pickup plan on each matched family's "
        + "private page, proposed by the strategist from the charter.", { thread: LARKSPUR, subject: PICKUP }),
      reply("m_seed_o4", t(60 * 3 + 20, 45), `Put the ${ref("draft:lsp-pickup-plan", "draft")} on your deck. One doubt `
        + "worth your eye: nobody asked for it; the strategist inferred it.", ["m_seed_o3"], ["Read an outcome", "Read the deck"],
        { thread: LARKSPUR, subjects: [PICKUP.id] }),
      user("m_seed_o5", t(95), "Has she actually asked for pickup details on the page?", { thread: LARKSPUR, subject: PICKUP.id }),
      reply("m_seed_o6", t(95, 35), "She hasn't asked for it: her last request was the application handoff, which shipped yesterday. The family "
        + "page already shows the litter's go-home date; what's missing is each family's own appointment. I'd ask her before "
        + "building: that's the first task in the drafter's proposal, and I told the drafter to keep it to one written plan per family.",
        ["m_seed_o5"], ["Read the brief", "Gave the drafter feedback"], { thread: LARKSPUR, subjects: [PICKUP.id] }),

      /* Harlow: the owner's two checkpoints */
      wake("m_seed_n1", t(60 * 6), "owner", "Harlow patients and appointments", "Checkpoint: Android emulator passes "
        + "against the sandbox; the iOS simulator walk is still to run.", { thread: HARLOW }),
      reply("m_seed_n2", t(60 * 6, 45), "Asked claude/opus to finish the iOS walk before review. Nothing waits on you yet.",
        ["m_seed_n1"], ["Read an outcome", "Asked an owner to continue"], { thread: HARLOW }),
      wake("m_seed_n3", t(60 * 5), "owner", "Harlow patients and appointments", "Ready for review: PR #214 green; both "
        + "emulators pass; “Charge for [date]” shown on the web only.", { thread: HARLOW }),
      reply("m_seed_n4", t(60 * 5, 40), "Put it on your deck with evidence for every criterion. The Patients list is "
        + "sample-backed until the client's patient cache ships, which is their backend's work, not ours. You merge "
        + "client PRs yourself, so it waits on you twice: the merge, then the accept.", ["m_seed_n3"],
        ["Read an outcome", "Read the deck"], { thread: HARLOW }),

      /* Heelwork: the owner stopped on a question for you */
      wake("m_seed_l1", t(70), "timer", "Timer", "Check the content snapshot came back.", { thread: HEELWORK }),
      reply("m_seed_l2", t(70, 30), "The snapshot is back: four published exercises have no title in the CMS. The mobile "
        + "owner's note said five; the fifth has a title. codex/astra is working out how to name the four.",
        ["m_seed_l1"], ["Read an outcome"], { thread: HEELWORK }),
      wake("m_seed_l3", t(45), "owner", "Exercise names", "Waiting on you: fall back to the dashboard's names on the "
        + "server, or leave them unnamed and ask the trainer to title them?", { thread: HEELWORK }),
      reply("m_seed_l4", t(45, 35), `Put the question on your deck as ${ref(HEELWORK, "Exercise names: fallback or task")}, `
        + "with my read: fall back on the server now, and still send the trainer the four exercises. codex/astra waits for your answer.",
        ["m_seed_l3"], ["Read an outcome", "Read the deck"], { thread: HEELWORK }),
    ];
  }

  const target = key => { const it = L.desk.find(key); return it ? { key, title: L.cards.name(it) } : undefined; };
  const LOG = [
    [2920, "intake", "Filed intake for engine/heelwork", "Exercises with no title in the CMS reach dog owners as “Exercise”."],
    [2860, "continue", "Continued the IntrinsicOS owner", "Asked claude/opus to check the CI image against the hosted runner's tools."],
    [2700, "feedback", "Gave the Harlow owner feedback", "Run the iOS simulator walk too; no physical phone needed for this one.", HARLOW],
    [1560, "intake", "Filed intake for engine/larkspur", "The breeder asked whether families can see their pickup time on their page."],
    [1500, "project_next_step_suggestions", "Asked the strategist about engine/larkspur", "A pickup-plan draft will land on your deck."],
    [1440, "outcome_open", "Opened a draft outcome in bets/glyphdeck", "", null, "That outcome names no repo yet; nothing was opened."],
    [1300, "continue", "Continued the Harlow owner", "Android passes; asked claude/opus to finish the iOS walk.", HARLOW],
    [1210, "decided", "Moved lsp-19's due date, as you said", "Moved it a week, quoting “push the litter photos a week, the pups aren't ready for pictures yet”.", "receipt:sa-0031"],
    [400, "timer", "Set a timer for the Heelwork content snapshot", "Check the content snapshot came back."],
    [360, "continue", "Asked the Harlow owner to continue", "Finish the iOS walk, then checkpoint for review.", HARLOW],
    [300, "outcome_status", "Put Harlow patients and appointments on your deck", "PR #214 green; both emulators pass.", HARLOW],
    [200, "outcome_status", "Put the Larkspur pickup plan on your deck", "With the strategist's note that nobody asked for it yet.", "draft:lsp-pickup-plan"],
    [130, "question", "Asked you about the CI rollout", "Merge one-line runner changes in the private repos without a card each?", "decision:dec-41"],
    [110, "intake", "Filed intake for bets/glyphdeck", "Players want the case colour to carry over between cartridges."],
    [95, "feedback", "Gave the Larkspur drafter feedback", "Ask the breeder before building; one written plan per family.", "draft:lsp-pickup-plan"],
    [44, "outcome_status", "Put the exercise-name question on your deck", "Server fallback now, and the four exercises to the trainer.", HEELWORK],
  ];

  function log() {
    for (const [ago, tool, label, summary, key, error] of LOG) {
      const tgt = key?.startsWith("receipt:") ? { key, title: label } : key ? target(key) : undefined;
      L.log.add({ at: min(ago), tool, label, summary, ...(tgt ? { target: tgt } : {}), ...(error ? { error } : {}) });
    }
  }

  let done = false;
  L.seed = function seed() {
    if (done) return;
    done = true;
    for (const msg of [...chat(), ...threads()]) S.add(msg);
    log();
  };
})(window.VISR_SUPT_LIB ||= {});
