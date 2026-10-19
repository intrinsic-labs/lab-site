/* VISR DEMO · the invented queue.

   Everything here is fiction: three made-up projects (Northwind, a web build
   for an invented client; Orchard, a planting planner; Lanternfish, a kayak
   sonar), made-up agents and made-up documents. The shapes are the review
   desk's contract (`intrinsic queue list --json`), the words are written to
   read like the real thing so the desk can be judged at realistic lengths.

   Every time is relative to page load, so the deck always looks current.
   demo/shim.js serves this and mutates its own copy as a visitor acts. */
"use strict";

(function () {
  const NOW = Date.now();
  const ago = min => new Date(NOW - min * 60_000).toISOString();

  const OWNERS = ["agent/ash", "agent/birch", "agent/cedar"];

  const outcomeFields = (status, owner, reviewed) => [
    { key: "human-reviewed", type: "stamp", label: "Human reviewed", value: reviewed || null },
    { key: "review-duration-mins", type: "number", label: "Review minutes", value: null },
    { key: "status", type: "enum", label: "Status", value: status, readonly: true,
      options: ["draft", "open", "active", "blocked", "parked", "accepted", "cancelled"] },
    { key: "owner", type: "enum", label: "Owner", value: owner || null, readonly: true, options: OWNERS },
  ];
  const taskFields = (status, due) => [
    { key: "status", type: "enum", label: "Status", value: status, readonly: true,
      options: ["open", "blocked", "done", "cancelled"] },
    { key: "due", type: "text", label: "Due", value: due, readonly: true },
  ];

  /* the vault: the documents a card can open, and edit in place */
  const DOCS = {
    "Projects/orchard/outcomes/orc-season-planner.md": {
      role: "outcome", title: "Growers plan each season from last year's yields",
      fields: () => outcomeFields("draft", null),
      text: `---
id: orc-season-planner
title: Growers plan each season from last year's yields
status: draft
owner:
human-reviewed:
created: ${ago(60 * 26).slice(0, 10)}
---

# Growers plan each season from last year's yields

The planner shows each grower which beds to plant this season and why. It
reads last year's yields and the frost dates, and proposes a plan the grower
can change.

## The result

A grower opens the planner, sees a proposed plan for the coming season with
one line of reasoning per bed, edits any bed, and saves it. The plan prints
on one page.

## Acceptance criteria

- A plan is proposed for every bed with a recorded yield.
- Each proposal carries one plain sentence of reasoning.
- An edit is kept after a reload and shows who made it.
- The printed plan fits one page for up to forty beds.

## Out of scope

Weather forecasts, pest tracking and anything that orders seed.
`,
    },
    "Projects/northwind/outcomes/nw-launch-checklist.md": {
      role: "outcome", title: "Launch Northwind's site against a checklist the client signs",
      fields: () => outcomeFields("open", "agent/birch", ago(60 * 24 * 5)),
      text: `---
id: nw-launch-checklist
title: Launch Northwind's site against a checklist the client signs
status: open
owner: agent/birch
human-reviewed: ${ago(60 * 24 * 5).slice(0, 16)}
created: ${ago(60 * 24 * 6).slice(0, 10)}
---

# Launch Northwind's site against a checklist the client signs

Northwind's new site launches with a checklist the client can sign. Every
page is reviewed on a phone and a desktop, forms are tested end to end, and
redirects from the old site are in place before DNS moves.

## Acceptance criteria

- Every public page has a phone and a desktop check recorded.
- The contact form delivers to the client's inbox in a recorded test.
- Each of the 212 old URLs answers with a redirect to its new page.
- The client can sign the checklist without an account.

## Notes from the owner

Forty-one old URLs had no obvious new home; they redirect to the closest
section page and are listed for the client to confirm (task nw-12).
`,
    },
    "Projects/northwind/tasks/nw-12.md": {
      role: "task", title: "Send Northwind the redirect list to confirm",
      fields: () => taskFields("open", ago(-60 * 24 * 2).slice(0, 10)),
      text: `---
id: nw-12
title: Send Northwind the redirect list to confirm
status: open
due: ${ago(-60 * 24 * 2).slice(0, 10)}
---

# Send Northwind the redirect list to confirm

Forty-one old URLs have no obvious new page. Send the list to the client
contact and ask them to confirm or correct each target.
`,
    },
  };

  const doc = path => ({ path, role: DOCS[path].role, title: DOCS[path].title,
    fingerprint: "demo-1", fields: DOCS[path].fields() });

  const reference = (key, kind, title, project) =>
    `VISR item ${key}\n${kind} ${key.split(":").pop()} — ${title}\nProject: ${project}\n(demo: invented data)`;

  const base = it => ({
    recommendation: null, content: [], notes: [], deferred: null, awaiting: null, docs: [],
    lane: "decide", focus: "active", inFocus: true, working: null, workingCleared: null, blocked: null,
    reference: reference(it.key, it.kindName, it.title, it.project),
    ...it, revision: it.key.split(":").pop() + ":r1", since: ago(it.age),
  });

  const brief = (key, b) => ({ state: "ready", brief: {
    revision: key.split(":").pop() + ":r1", generatedAt: ago(20), model: "demo", changed: null,
    recommendation: null, visual: null, sources: [], ...b } });

  const ITEMS = [
    base({
      key: "draft:orc-season-planner", kind: "draft_outcome", kindName: "Draft outcome", age: 60 * 3,
      project: "orchard", title: "Growers plan each season from last year's yields",
      why: "A drafted outcome waiting for your approval. Approving starts its owner; feedback redrafts it.",
      recommendation: { by: "strategist", text: "Approve once the frost-date source is confirmed." },
      origin: "strategist",
      content: [
        { type: "markdown", title: "Intake note",
          text: "Growers keep asking what to plant where. Use last year's yields, keep it to one page, and let them change any bed." },
        { type: "facts", rows: [["drafted by", "agent/ash"], ["run", "run_5c1e"]] },
      ],
      actions: ["approve", "reject", "feedback", "not_needed", "later"],
      ask: "Approve, refuse or correct this draft outcome.",
      docs: [doc("Projects/orchard/outcomes/orc-season-planner.md")],
      ownerChoices: OWNERS, defaultOwner: "agent/ash",
      repoChoices: ["orchard", "orchard-web"], defaultRepos: ["orchard"],
      brief: brief("draft:orc-season-planner", {
        cardTitle: "Orchard season planner",
        question: "Should the season planner be built as drafted, proposing a plan per bed from last year's yields?",
        answers: [
          { action: "approve", effect: "The outcome opens and its owner starts the planner on the next tick." },
          { action: "reject", effect: "The draft is closed. The drafter is told your reason." },
          { action: "feedback", effect: "The drafter rewrites the outcome with your note and asks again." },
          { action: "later", effect: "It leaves the deck until tomorrow morning." },
        ],
        recommendation: { text: "Approve.",
          reason: "The scope is one page, one season and no ordering — small enough to finish in a week.",
          doubt: "The frost dates come from one note; if growers are in different regions, the plan is wrong for some of them." },
        body: "The planner reads **last year's yields** and the frost dates, then proposes a crop per bed with one sentence of reasoning. Growers can change any bed. The plan prints on one page.\n\n- It does not forecast weather.\n- It does not order seed.",
        visual: { title: "Beds by crop", html: "<!doctype html><html><head><style>\nbody{margin:0;background:#07090c;color:#cfe3f0;font:13px ui-monospace,monospace}\n.wrap{padding:14px}h4{margin:0 0 10px;font-weight:normal;letter-spacing:2px;color:#6b8798;font-size:11px}\n.bar{display:flex;align-items:center;gap:8px;margin:6px 0}.bar span{width:6ch;color:#6b8798}\n.bar i{display:block;height:12px;background:#cfe3f0}.bar i.new{background:#6ee7a0}\n#n{color:#6b8798;margin-top:10px}\n</style></head><body><div class=\"wrap\"><h4>PROPOSED BEDS BY CROP · THIS SEASON VS LAST</h4>\n<div class=\"bar\"><span>beans</span><i style=\"width:40%\"></i><i class=\"new\" style=\"width:12%\"></i></div>\n<div class=\"bar\"><span>squash</span><i style=\"width:25%\"></i><i class=\"new\" style=\"width:20%\"></i></div>\n<div class=\"bar\"><span>kale</span><i style=\"width:30%\"></i></div>\n<div class=\"bar\"><span>garlic</span><i style=\"width:10%\"></i><i class=\"new\" style=\"width:18%\"></i></div>\n<div id=\"n\">white = last season · green = the change</div></div>\n</body></html>" },
        sources: [{ label: "Outcome document", ref: "Projects/orchard/outcomes/orc-season-planner.md" },
                  { label: "Intake note", ref: "Intake note" }],
      }),
    }),

    base({
      key: "owner:nw-launch-checklist", kind: "owner_review", kindName: "Owner checkpoint for outcome", age: 60 * 5,
      project: "northwind", title: "Launch Northwind's site against a checklist the client signs",
      why: "The owner says the work is ready for your review.",
      recommendation: { by: "agent/birch", text: "Accept, then send the checklist link to the client." },
      content: [
        { type: "markdown", title: "Checkpoint",
          text: "## Ready for review\n\nAll 212 redirects answer. Every page was checked on a phone and a desktop. The contact form test delivered in 4 seconds.\n\n**One open question:** forty-one URLs redirect to section pages and need the client's confirmation (task nw-12).\n\n```\nredirects  212/212  ok\npages       38/38   ok\nform         1/1    ok\n```" },
        { type: "facts", rows: [["checkpoint", "ready_for_review"], ["owner", "agent/birch"],
                                ["turn ended", ago(60 * 5)], ["branch", "owner/nw-launch-checklist"]] },
        { type: "link", label: "Open the client checklist", url: "https://example.com/checklist/northwind" },
        { type: "markdown", title: "How to review",
          text: "Open the checklist on your phone. Try signing it. Check two redirects from the list." },
      ],
      actions: ["accept", "park", "feedback", "not_needed", "later"],
      ask: "Give the owner feedback or accept the work.",
      docs: [doc("Projects/northwind/outcomes/nw-launch-checklist.md")],
      brief: brief("owner:nw-launch-checklist", {
        cardTitle: "Northwind launch checklist",
        question: "Is Northwind's launch checklist ready to send to the client?",
        answers: [
          { action: "accept", effect: "The outcome is accepted: open → accepted, with a receipt." },
          { action: "park", effect: "The outcome is parked with your reason and when to look again." },
          { action: "feedback", effect: "The owner reads your note and continues on its next turn." },
          { action: "later", effect: "It leaves the deck until tomorrow morning." },
        ],
        changed: ["The redirect report now covers all 212 old URLs (was 171).",
                  "Every page now has a phone check.",
                  "Forty-one redirects need the client to confirm; that is task nw-12."],
        recommendation: { text: "Accept it and send the link.",
          reason: "Every acceptance criterion has evidence attached.",
          doubt: "The forty-one guessed redirects are the client's call, not ours." },
        body: "The owner finished the checklist. Each item carries its evidence. The only open item is the client's confirmation of forty-one redirects, which is a separate task.",
        sources: [{ label: "Checkpoint", ref: "Checkpoint" },
                  { label: "Outcome document", ref: "Projects/northwind/outcomes/nw-launch-checklist.md" }],
      }),
    }),

    base({
      key: "decision:dec-7", kind: "decision", kindName: "Decision", age: 60 * 2,
      project: "lanternfish", title: "Move Thursday's Lanternfish call to Friday morning?",
      why: "The manager agent asked this question.",
      recommendation: { by: "manager", text: "Move it: Thursday clashes with the Northwind launch window." },
      content: [{ type: "markdown", title: "The question",
        text: "Northwind's DNS move is scheduled for Thursday 14:00. The Lanternfish call is at 14:30. Shall I ask to move it to Friday 10:00?" }],
      actions: ["approve", "reject", "feedback", "not_needed", "later"],
      ask: "Answer the manager's question.",
      brief: brief("decision:dec-7", {
        cardTitle: "Move Thursday's call",
        question: "Ask to move Thursday's Lanternfish call to Friday 10:00?",
        answers: [
          { action: "approve", effect: "The manager writes and proposes Friday 10:00." },
          { action: "reject", effect: "The call stays on Thursday at 14:30." },
          { action: "feedback", effect: "The manager reads your answer as written." },
        ],
        body: "The DNS move needs about an hour of watching. The call would overlap it.",
      }),
    }),

    base({
      key: "chore:nw-12", kind: "chore", kindName: "Task", age: 60 * 9, lane: "do",
      project: "northwind", title: "Send Northwind the redirect list to confirm",
      why: "A task assigned to you.",
      actions: ["done", "feedback", "not_needed", "later"],
      ask: "Do this, then mark it done.", textMax: 300,
      docs: [doc("Projects/northwind/tasks/nw-12.md")],
      brief: brief("chore:nw-12", {
        cardTitle: "Northwind redirect list",
        question: "Send Northwind the forty-one redirects to confirm, then mark this done?",
        answers: [{ action: "done", effect: "The task closes." },
                  { action: "feedback", effect: "Your note is added to the task." }],
        body: "The list is in the outcome document. One email to the client contact.",
      }),
    }),

    base({
      key: "linear:nw:NW-42", kind: "linear", kindName: "Linear card", age: 60 * 6, lane: "do",
      project: "northwind", title: "NW-42 Fix the checkout total rounding",
      why: "Assigned to you in Linear",
      actions: ["route", "feedback", "later"],
      ask: "Route these to an owner, or leave them in Linear.",
      brief: { state: "not_applicable",
        reason: "Linear cards carry the issue's own description, comments and attachments instead of a brief." },
      content: [
        { type: "markdown", title: "Description",
          text: "Totals round each line before summing, so a cart of three $0.335 items shows **$1.02**.\n\n## Expected\n\nRound once, at the end." },
        { type: "markdown", title: "Comments (1)",
          text: `**Client QA** · ${ago(60 * 30).slice(0, 16).replace("T", " ")} UTC\n\nSeen on staging too.` },
        { type: "facts", rows: [["workspace", "Northwind (nw)"], ["state", "In Progress"], ["last read", ago(4)]] },
        { type: "link", label: "NW-42", url: "https://linear.app/northwind/issue/NW-42" },
      ],
    }),

    base({
      key: "proposal:run_9f2e", kind: "proposal", kindName: "Proposal", age: 60 * 30,
      project: "orchard", title: "Proposed two tasks to collect yield data from growers",
      why: "The drafter proposed tasks from an intake note.",
      content: [
        { type: "markdown", title: "Proposed tasks",
          text: "1. **orc-14** — Ask the three pilot growers for last year's yield sheets. *owner: you*\n2. **orc-15** — Turn the yield sheets into one table. *owner: agent/cedar*" },
        { type: "facts", rows: [["proposal", "run_9f2e"], ["tasks", "2"]] },
      ],
      actions: ["approve", "reject", "not_needed", "later"],
      ask: "Approve or refuse these proposed tasks.",
      brief: { state: "pending" },
    }),

    base({
      key: "receipt:sa-0007", kind: "receipt", kindName: "Standing approval receipt", age: 60 * 4, lane: "happened",
      project: "orchard", title: "Moved orc-15's due date to next Tuesday",
      why: "A standing rule covered this, so it was done for you.",
      content: [
        { type: "markdown", title: "What happened",
          text: "The manager asked to move **orc-15** (turn the yield sheets into one table) back a week, quoting you: “push the yield table a week, the growers are late”. Rule R2 covers date moves, so the due date was changed.\n\nUndo puts it back." },
        { type: "markdown", title: "Under", text: "- R2 · Dates move when I say so" },
        { type: "facts", rows: [["action", "date_move"], ["target", "orc-15"], ["asked by", "manager"]] },
      ],
      actions: ["undo", "acknowledge", "not_needed"],
      ask: "Nothing to decide: undo it if the rule got it wrong.",
      brief: { state: "not_applicable", reason: "A receipt says what a standing rule did; it asks nothing." },
    }),
  ];

  const HAPPENED = [
    { kind: "owner_release", key: "release:orc-yield-import:run_b302", project: "orchard",
      title: "Import each grower's yield sheet into one table", outcomeId: "orc-yield-import", runId: "run_b302",
      summary: "Released: the yield table is merged to main.", destination: null, evidence: [], at: ago(60 * 20) },
  ];

  window.VISR_DEMO_CORPUS = {
    NOW, ago, DOCS, ITEMS, HAPPENED,
    PROJECTS: { northwind: "Northwind", orchard: "Orchard", lanternfish: "Lanternfish" },
  };
})();
