/* VISR DEMO · SUPERINTENDENT · the seed — what was said and done before the visitor arrived.

   Built once, on the first call, from the deck as it then is, so every
   link points at a card that exists (a card the corpus no longer has is
   named in bold instead). Every time is relative to page load:

   - the main chat: yesterday evening's question, a routine blocker check,
     and a short exchange from fifty minutes ago, greeted for the visitor's
     own time of day;
   - three threads (threads v1): Orchard's project thread, with two outcomes
     as subjects and one scoped question from you; the Northwind launch
     checklist's owner thread; the Lanternfish calibration's owner thread;
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

  const ORCHARD = "project:bets/orchard", NORTHWIND = "owner:nw-launch-checklist", LANTERN = "owner:lan-depth-calibration";
  const PLANNER = { kind: "outcome", id: "orc-season-planner", title: "Season planner" };
  const YIELDS = { kind: "outcome", id: "orc-yield-import", title: "Yield import" };

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
      reply("m_seed_02", plus(yday, 40), "The Northwind checklist should reach your deck by morning, and the Orchard "
        + "planner draft is written. Nothing is stuck on anyone else.", ["m_seed_01"], ["Read the board"]),
      reply("m_seed_r1", plus(am, -32 * 60), `${L.text.cap(L.text.count(top.length, "card"))} wait on you; `
        + `nobody is stopped on anything but you.${pass ? `\n\n${pass}` : ""}`, [], ["Read the deck", "Read the board"],
        { routine: { name: "blocker-check", title: "Blocker check" } }),
      user("m_seed_03", am, `${hello()} Anything on fire?`),
      reply("m_seed_04", plus(am, 30), `Nothing on fire. The one that matters today is the `
        + `${ref(NORTHWIND, "Northwind launch checklist")}: every criterion has evidence, `
        + `so it waits on your accept. Thursday's Lanternfish call clashes with the DNS move; `
        + `${ref("decision:dec-7", "that question")} is on your deck too.`, ["m_seed_03"], ["Read the deck"]),
    ];
  }

  function threads() {
    S.threads.set(ORCHARD, { kind: "project", title: "Orchard", project: "orchard", subjects: [PLANNER, YIELDS] });
    S.threads.set(NORTHWIND, { kind: "owner", title: "Northwind launch checklist", project: "northwind" });
    S.threads.set(LANTERN, { kind: "owner", title: "Sonar depth calibration", project: "lanternfish" });
    const t = (n, s = 0) => plus(min(n), s);
    return [
      /* Orchard: two outcomes, one question of yours scoped to the planner */
      wake("m_seed_o1", t(60 * 20), "owner", "Yield import", "Released: the yield table is merged to main.",
        { thread: ORCHARD, subject: YIELDS }),
      reply("m_seed_o2", t(60 * 20, 40), "Logged the release. The season planner reads this table, so the draft can "
        + "lean on real yields.", ["m_seed_o1"], ["Read an outcome"], { thread: ORCHARD, subjects: [YIELDS.id] }),
      wake("m_seed_o3", t(60 * 3 + 20), "owner", "Season planner", "Draft ready: the planner outcome is written; the "
        + "frost dates come from one note.", { thread: ORCHARD, subject: PLANNER }),
      reply("m_seed_o4", t(60 * 3 + 20, 45), `Put the ${ref("draft:orc-season-planner", "draft")} on your deck. One doubt `
        + "worth your eye: the frost dates come from a single note.", ["m_seed_o3"], ["Read an outcome", "Read the deck"],
        { thread: ORCHARD, subjects: [PLANNER.id] }),
      user("m_seed_o5", t(95), "Do the growers all share one frost date?", { thread: ORCHARD, subject: PLANNER.id }),
      reply("m_seed_o6", t(95, 35), "They don't: two of the three pilot growers are in the valley, and the third is up on "
        + "the ridge, about ten days later. I'd approve the planner with a frost date per grower, and say so in feedback.",
        ["m_seed_o5"], ["Read the intake note", "Gave the drafter feedback"], { thread: ORCHARD, subjects: [PLANNER.id] }),

      /* Northwind: the owner's two checkpoints */
      wake("m_seed_n1", t(60 * 6), "owner", "Northwind launch checklist", "Checkpoint: pages and the form are done; "
        + "redirects at 171 of 212.", { thread: NORTHWIND }),
      reply("m_seed_n2", t(60 * 6, 45), "Asked agent/birch to finish the redirects before review. Nothing waits on you yet.",
        ["m_seed_n1"], ["Read an outcome", "Asked an owner to continue"], { thread: NORTHWIND }),
      wake("m_seed_n3", t(60 * 5), "owner", "Northwind launch checklist", "Ready for review: all 212 redirects answer; "
        + "forty-one need the client's confirmation.", { thread: NORTHWIND }),
      reply("m_seed_n4", t(60 * 5, 40), `Put the checklist on your deck. Every criterion has evidence; the forty-one `
        + `guessed redirects are ${ref("chore:nw-12", "task nw-12")}, which is yours.`, ["m_seed_n3"],
        ["Read an outcome", "Read the deck"], { thread: NORTHWIND }),

      /* Lanternfish: a timer the owner thread set */
      wake("m_seed_l1", t(40), "timer", "Timer", "Check the second calibration pass against the dock's known depth.",
        { thread: LANTERN }),
      reply("m_seed_l2", t(40, 30), "agent/cedar's second pass reads within 4 cm of the dock gauge down to 3 m and "
        + "drifts past that. It's trying a slower ping rate next. Nothing waits on you.", ["m_seed_l1"],
        ["Read an outcome", "Asked an owner to continue"], { thread: LANTERN }),
    ];
  }

  const target = key => { const it = L.desk.find(key); return it ? { key, title: L.cards.name(it) } : undefined; };
  const LOG = [
    [2920, "intake", "Filed intake for bets/lanternfish", "Battery sag on cold mornings shows up as depth noise."],
    [2860, "continue", "Continued the Lanternfish owner", "Asked agent/cedar to log raw readings beside the filtered ones."],
    [2700, "feedback", "Gave the Northwind owner feedback", "The redirect list belongs in section 4 of the checklist.", NORTHWIND],
    [1560, "intake", "Filed intake for engine/northwind", "The client asked whether old blog URLs keep their comments."],
    [1500, "project_next_step_suggestions", "Asked the strategist about bets/orchard", "A season-planner draft will land on your deck."],
    [1440, "outcome_open", "Opened a draft outcome in bets/lanternfish", "", null, "That outcome names no repo yet; nothing was opened."],
    [1300, "continue", "Continued the Northwind owner", "Redirects at 171 of 212; asked agent/birch to finish them.", NORTHWIND],
    [1210, "decided", "Moved orc-15's due date, as you said", "Moved it a week, quoting “push the yield table a week, the growers are late”.", "receipt:sa-0007"],
    [400, "timer", "Set a timer for the Lanternfish calibration", "Check the second calibration pass at midday."],
    [360, "continue", "Asked the Northwind owner to continue", "Finish the redirects, then checkpoint for review.", NORTHWIND],
    [300, "outcome_status", "Put the Northwind launch checklist on your deck", "Every acceptance criterion has evidence.", NORTHWIND],
    [200, "outcome_status", "Put the Orchard season planner on your deck", "With the strategist's note on frost dates.", "draft:orc-season-planner"],
    [130, "question", "Asked you about Thursday's Lanternfish call", "It clashes with the Northwind DNS move.", "decision:dec-7"],
    [110, "intake", "Filed intake for bets/orchard", "Growers want last season's plan beside this one."],
    [95, "feedback", "Gave the Orchard drafter feedback", "Two pilot growers share a frost date; the third is ten days later.", "draft:orc-season-planner"],
    [40, "continue", "Continued the Lanternfish owner", "Second pass within 4 cm of the gauge to 3 m; try a slower ping."],
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
