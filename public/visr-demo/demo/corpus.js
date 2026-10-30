/* VISR DEMO · the sample queue.

   Adapted from Intrinsic Labs' own recent work: real outcome documents, owner
   checkpoints and questions, lightly edited, with three client projects
   renamed and stripped of anything that identifies them. The company's own
   projects keep their names (IntrinsicOS, GlyphDeck, Liturgos); the clients
   are stand-ins: Harlow (a charge-capture app for a medical billing company),
   Heelwork (a dog-training app and its content dashboard) and Larkspur (a
   family dog breeder's website). The owners are named as the real ones are,
   by model (claude/opus, codex/sol, claude/sonnet, codex/astra). People,
   repositories, hosts, issue ids and figures that would identify a client
   are changed or left out. "You" are the founder the desk serves. The shapes
   are the review desk's contract (`intrinsic queue list --json`, as
   tycho/tools/fake_intrinsic.py answers it).

   Every time is relative to page load, so the deck always looks current.
   demo/shim.js serves this, mutating its own copy as a visitor acts; the
   scripted Superintendent (demo/supt/) may read it too.

     window.VISR_DEMO_CORPUS = {
       NOW, ago(min) → ISO string `min` minutes before load (negative: after),
       OWNERS        the agents an outcome can be given to,
       PROJECTS      [{slug, category, ref, name, relDir}], the intake list,
       PROJECT_NAMES {ref: name}, the queue's `projects` map,
       DOCS          {path: {role, title, fields(), text}}, the documents,
       ITEMS         the queue's items, in deck order,
       HAPPENED      the Happened lane's owner releases,
     } */
"use strict";

(function () {
  const NOW = Date.now();
  const ago = min => new Date(NOW - min * 60_000).toISOString();
  const day = min => ago(min).slice(0, 10);

  const OWNERS = ["claude/opus", "codex/sol", "claude/sonnet", "codex/astra"];

  const PROJECTS = [
    { slug: "harlow", category: "engine", ref: "engine/harlow", name: "Harlow", relDir: "Projects/engine/harlow" },
    { slug: "heelwork", category: "engine", ref: "engine/heelwork", name: "Heelwork", relDir: "Projects/engine/heelwork" },
    { slug: "larkspur", category: "engine", ref: "engine/larkspur", name: "Larkspur", relDir: "Projects/engine/larkspur" },
    { slug: "glyphdeck", category: "bets", ref: "bets/glyphdeck", name: "GlyphDeck", relDir: "Projects/bets/glyphdeck" },
    { slug: "liturgos", category: "bets", ref: "bets/liturgos", name: "Liturgos", relDir: "Projects/bets/liturgos" },
    { slug: "vault", category: "meta", ref: "meta/vault", name: "IntrinsicOS", relDir: "Projects/meta/vault" },
  ];
  const PROJECT_NAMES = Object.fromEntries(PROJECTS.map(p => [p.ref, p.name]));

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

  /* -- the vault: the documents a card can open, and edit in place ---------------- */
  const DOCS = {
    "Projects/engine/larkspur/outcomes/lsp-pickup-plan.md": {
      role: "outcome", title: "Give each matched family a clear pickup plan on their private page",
      fields: () => outcomeFields("draft", null),
      text: `---
id: lsp-pickup-plan
title: Give each matched family a clear pickup plan on their private page
status: draft
repos:
  - larkspur-site
tags: []
human-reviewed:
review-duration-mins:
draft-generation: run_5e0b2c71
source: strategist
created: ${day(60 * 26)}
---

# Know what happens on pickup day

The charter carries a family from first visit through pickup without accounts and without
anyone at Intrinsic Labs in the middle. Your feedback on the family page asked for a lean,
useful place to come back to. An inspection this week confirmed that the accepted family page
already shows the assigned puppy, the litter's go-home date and the breeder's selected
reading; it has nothing about the family's own pickup. This is a lower-confidence option: it
extends the charter rather than answering a fresh request from the breeder. Assumption: she
would use a short written plan after arranging the details with each family herself. No
pickup date or waiting family is verified.

## The result

A matched family opens its existing private link and sees the breeder's published pickup
plan: the confirmed date and time, where to go and what to bring. She can revise or withdraw
the plan in the CMS she already uses. Deliver on the live family pages, reusing their
protected records, private links, puppy presentation and reading list; the new part is one
clear, personal plan. First show synthetic phone views in VISR: before confirmation,
confirmed and rescheduled.

## Acceptance criteria

- The breeder can save a family's pickup plan and publish it on purpose, then change or
  withdraw it; the family page shows the latest published plan after a reload.
- The family can tell the litter's general go-home date from its own confirmed appointment.
  No appointment is inferred from that date, a match or a payment; an unpublished plan is
  absent.
- A confirmed plan shows the local date and time, the pickup instructions and the breeder's
  short preparation list together, readable on a phone, a tablet and a desktop. The selected
  reading stays available without a second editor for it and without new articles.
- The plan is shown only on its own family's private page. Synthetic probes show that
  locations, instructions and draft plans are absent from anonymous CMS reads, public pages,
  search metadata and other families' pages.
- Existing assignments, private links, application answers and payment state are unchanged.
  CI passes; VISR has inspected synthetic screenshots and a signed-in authoring preview.
  Accepted work is landed, activated and verified on the live site without inventing real
  appointments.

## Scope and non-goals

One admin arranging a litter's homecomings personally. No booking calendar, slot allocation,
reminders, messaging, check-off tracking, contracts, medical advice, payment collection or
automatic \`picked_up\` transitions. Use only instructions the breeder enters: no invented
address, supply list, care regimen or promise on her behalf. Native CMS authoring is enough,
so this does not wait on the proposed family-care workspace or reservation workflow.

## Stop

Record \`ready_for_review\` for your judgment of whether this earns its place on the lean
family page, then complete accepted delivery. If her real arrangements or publishing needs
conflict with these assumptions, preserve the work and report the evidence rather than
growing into scheduling software.

## Sources

- [Charter: the family journey through pickup](../_brief.md)
- [Your family-page direction](../intake/feedback/lsp-family-page.md)
- [Accepted family page](lsp-family-page.md)
- [Accepted application handoff](lsp-application-handoff.md)
`,
    },

    "Projects/engine/harlow/outcomes/hlw-patients-and-appointments.md": {
      role: "outcome", title: "Patients and Appointments give providers two ways into the same charge flow",
      fields: () => outcomeFields("open", "claude/opus", ago(60 * 24 * 4)),
      text: `---
id: hlw-patients-and-appointments
title: Patients and Appointments give providers two ways into the same charge flow
status: open
repos:
  - harlow-app
tags: []
human-reviewed: ${ago(60 * 24 * 4).slice(0, 16)}
review-duration-mins: 1
draft-generation: run_a81f4d09
owner: claude/opus
approved-by: you
created: ${day(60 * 24 * 4)}
---

# Patients alongside Appointments

In the intake of ${day(60 * 24 * 4)}, the Superintendent recorded your direction for the
client's navigation card: ship the related changes together, as one PR. Providers should be able to find a patient or work from their schedule, then enter
the same charge flow. One accountable owner delivers the four related tracker cards
together, because navigation, routes and charge entry points overlap. This extends the
accepted Visits and off-schedule charge work.

## The result

One reviewed, green frontend PR, a reachable web preview, and builds tested on the Android
emulator and the iOS simulator, for your review and your own merge. The first useful
artifact is a VISR walkthrough of the four destinations and both patient-to-charge paths.
This is a finished frontend change with an explicitly sample-backed Patients list until the
client's patient cache is available; it is not a backend delivery.

The tracker projection read this week supplies the card descriptions and names the separate
cache card. Cached \`origin/main\` still has Home / Visits / Charges with a raised Visits
button. Reconcile current GitHub work before implementing.

## Acceptance criteria

- Phone navigation and the desktop side rail show Home / Appointments / Patients / Charges
  in that order, with four equal-weight icons and no raised button. "Appts" is acceptable
  where space requires it. Existing \`/visits\` links reach Appointments and \`/patients\`
  links reach Patients; patient-detail links keep working.
- Appointments reuses the existing Visits screen for upcoming scheduled visits without a
  charge. Choosing a visit opens the existing charge flow with the right patient, facility
  and date. The separate name and date-of-birth search fields are gone from this tab.
- Patients shows a patient list and one search box that matches name or date of birth as the
  provider types. Choosing a result opens that patient's screen. A committed, obviously
  synthetic sample file defines the expected list and search responses, with a short
  frontend contract the client's backend developer can build the cache against. The screen
  works on those samples without waiting for the cache.
- The patient page offers "Charge for [visit date]" when an uncharged scheduled visit
  exists, and a separate "New charge" for an unscheduled encounter. The first uses the
  scheduled visit; the second creates a one-off visit behind the scenes through the existing
  charge flow. Both keep the right patient and encounter; the provider never manages visit
  records as an extra step.
- Emulator and simulator runs cover both charge paths, a save updating the appointment's
  uncharged state, returning to the list, a search with no matches, and the loading, empty
  and failure/retry states. Existing unfinished-charge safeguards still work. Sample
  identities cannot be submitted as real patients; charge-path evidence uses synthetic or
  sandbox data.
- Regression tests, typecheck, lint, the bundle build, CI and the code-quality scan pass on
  the final PR revision, with local and cross-family review findings resolved. VISR has the
  PR, a reachable preview, 5–10 synthetic screenshots across phone and desktop, the results,
  and the revision tested on each platform. Sample-backed limits are stated in the checkpoint.

## Scope and non-goals

Frontend only, in a single PR from one owner. Reuse the app's current navigation, patient
page and charge capture rather than rebuilding them. Approval grants scoped app
implementation, commits, push, PR creation and review-build installation. The tracker stays
read-only; the Superintendent links the outcome. Emulator and simulator testing replaces a
physical-device test for this outcome. You merge after green CI and review.

No edits to the client's backend, the patient-cache implementation or its activation. The
sample contract is the handoff. The UI refresh starts after this ships and is excluded. No
broad visual redesign, new charge workflow, production configuration, production deployment
or persistent patient storage on the device.

## Stop

Record \`ready_for_review\` when the single PR is green, emulator and simulator testing has
passed and the evidence is visible in VISR. Your review and your merge are the release
boundary; do not merge on your behalf. If an authority, data-contract or emulator blocker
appears, preserve the work and report the exact blocker without expanding into backend work
or lowering the bar.

## Sources

- [Your single-owner direction, captured by the Superintendent](../intake/hlw-patients-direction.md)
- [Project brief and standing boundaries](../_brief.md)
- [Accepted Visits navigation](hlw-visits-tab.md)
- [Accepted off-schedule charge flow](hlw-off-schedule-charge.md)
- [Your review, device and merge conventions](../intake/feedback/hlw-review-conventions.md)
`,
    },

    "Projects/bets/liturgos/outcomes/lit-service-slides.md": {
      role: "outcome", title: "Generate and run clear service slides with trustworthy exports",
      fields: () => outcomeFields("open", "claude/sonnet", ago(60 * 24 * 12)),
      text: `---
id: lit-service-slides
title: Generate and run clear service slides with trustworthy exports
status: open
owner: claude/sonnet
repos:
  - liturgos
tags:
  - web
human-reviewed: ${ago(60 * 24 * 12).slice(0, 16)}
review-duration-mins: 35
created: ${day(60 * 24 * 13)}
---

# Run the planned service on a projector

Your direction: support smaller churches with simple equipment. Start with readable white
text on black, allow announcement images, and make it easy for a volunteer to run the
service without the congregation seeing the controls. Consume the service from the
[planning outcome](lit-intentional-service-planning.md); do not invent a separate source of
worship content.

## First useful artifact

Audit the existing slide editor, generated deck, presenter and exports against one
representative service: hymn stanzas, a Scripture reading, a responsive reading and an
announcement image. Establish what the output and controls actually do before redesigning.

## Your story, as the scope

1. A pastor opens the slides generated for the service they just planned.
2. Hymns and songs use arrangements the church has sung before, not ad hoc versions.
3. If a hymn isn't the arrangement the church will sing this week, the pastor picks the
   right one from the church's arrangements and the slides update at once; or edits the
   slides and saves them as a new arrangement.
4. Slides are organised into verses, refrains and bridges, appropriate to hymns, songs and
   psalms, and a section can be switched off for one service.
5. Past versions of a call to worship or a confession, matched by Scripture reference, can
   be added, switched or removed.

Keep three things distinct: the underlying song or element, its reusable arrangement or text
version, and this service's choices. Saving a new arrangement must not rewrite earlier
services; a service-only edit must not silently change the church's reusable version. When
history can't establish which arrangement was sung, show the gap instead of inventing one.

## Acceptance criteria

- One hymn with two arrangements and one Scripture-linked call to worship with two
  historical versions can be reused, switched, edited and saved from the slide editor.
- The audience output is clean: no controls, readable at the back of a small room, with
  announcement images shown full screen.
- Presenter controls work from a second window on the same machine; phone control is
  investigated as a bounded slice and reported, not promised.
- Exports (PDF and images) match what the projector shows.
- Church isolation holds: no church sees another's arrangements or history.

## Scope and non-goals

The slide and presentation system, and the small shared-contract changes the slide journey
needs, coordinated with the planning owner. Broader import reconciliation, catalogue
management and new planner screens are follow-up findings. No new song-licence integration.

## Stop

Record \`ready_for_review\` with a working local deck and presenter flow and a clean audience
output. If the taxonomy or the arrangement model has to change underneath this work, stop
and report it rather than redesigning the service representation from here.
`,
    },

    "Projects/engine/heelwork/outcomes/hwk-exercise-title-fallback.md": {
      role: "outcome", title: "Show existing exercise names when the CMS has no title",
      fields: () => outcomeFields("open", "codex/astra", ago(60 * 24 * 1)),
      text: `---
id: hwk-exercise-title-fallback
title: Show existing exercise names when the CMS has no title
status: open
repos:
  - heelwork-dashboard
tags: []
human-reviewed:
review-duration-mins:
draft-generation: run_6c2d8e5a
owner: codex/astra
approved-by: superintendent
created: ${day(60 * 24 * 1)}
---

# Recognizable exercise names

The mobile owner filed this while delivering the consumer app's agreed training loop: some
exercises with a perfectly good name in the dashboard reach dog owners as plain "Exercise".
It is an agent's finding from a preview seeded with a copy of production content, not an
independently verified production observation. The note reports five affected exercises but
names four; establish the exact set during verification.

Read-only inspection of the dashboard confirms that exercise summaries take their title only
from the CMS, and that exercise detail exposes the dashboard's display name without falling
back to it. The mobile outcome excludes server changes, and the separate server-hardening
outcome covers only a session race and documentation. The CMS publish gate stays separate.

## The result

Dog owners see the best existing name for an exercise, the same way in session plans,
exercise summaries and exercise detail. Keep the CMS's current locale resolution; when it
yields no non-blank title, use the dashboard's non-blank \`display_name\`, then its
\`admin_title\`. This is the server option the mobile owner suggested, and it needs no
editorial change or unpublishing decision. Delivery is the dashboard fix merged and activated
through its normal production path after your release go. The first useful artifact is a
synthetic API comparison showing each fallback and the reported exercises.

## Acceptance criteria

- Exercise detail and summary responses, including saved-plan retrieval and replacement
  candidates, use one title order: the CMS's locale resolution, then \`display_name\`, then
  \`admin_title\`. Null, empty and whitespace-only values don't block a usable fallback.
  Translated titles keep precedence.
- Repeatable synthetic checks cover each fallback, missing CMS content, and every source
  blank. The last case stays honestly unnamed under the existing contract: no name is
  invented and no internal identifier is shown as a title.
- A local content-snapshot check finds the exact affected set and shows the resolved names
  wherever existing name data supports them. The handoff separates snapshot evidence from
  production verification and lists any record that is still unnamed.
- Dashboard checks and the relevant API regressions pass without a change to the public
  response shape. The mobile owner gets example responses showing the fix works with the
  app as it is.
- The API documentation describes the fallback, edited through the reviewed vault route.
  Final evidence names the revision, the passing checks, production activation and a
  synthetic verification separately.

## Scope and non-goals

Only server-side exercise-title resolution and its verification. No production content
writes, invented copy, unpublishing, importer changes, content-studio redesign, locale-policy
change or mobile work. Dashboard names are an existing-name fallback, not new translated
content. Don't reopen the accepted server outcome or widen the hardening one.

## Stop

Record \`ready_for_review\` with before/after responses and regression results visible in
VISR. Your accept is the release go; the same owner then lands, activates and verifies it.
If the dashboard's names turn out to be unsuitable for dog owners, preserve the work and
report the affected records with a recommended alternative instead of editing or
unpublishing content.

## Sources

- [The mobile owner's finding](../intake/hwk-exercise-title-finding.md)
- [The mobile outcome](hwk-consumer-app-agreed-logic.md)
- [Separate server hardening](hwk-server-followup-hardening.md)
- [API contracts](../docs/api-contracts.md)
`,
    },

    "Projects/meta/vault/tasks/vlt-104.md": {
      role: "task", title: "Create the GitHub App the Mac's CI runners sign in with",
      fields: () => taskFields("open", day(-60 * 24 * 1)),
      text: `---
id: vlt-104
title: Create the GitHub App the Mac's CI runners sign in with
status: open
owner: you
outcome: vlt-local-ci-safe-path
due: ${day(-60 * 24 * 1)}
---

# Create the GitHub App the Mac's CI runners sign in with

The local CI runners on the Mac register with GitHub using short-lived tokens minted from a
GitHub App on the company organization. Creating an App and installing it needs an
organization owner, which is you; no agent has that role.

1. In the organization's settings, create a GitHub App named for the runners. Permissions:
   self-hosted runners (read and write) and administration (read). No webhook.
2. Install it on the private repositories listed in the outcome. Leave public ones out:
   the runner group refuses them anyway.
3. Generate a private key and save it straight into 1Password under the item the outcome
   names. Don't paste it in chat or in a card.
4. Mark this done. The owner reads the App id from 1Password and enrols the next repo.
`,
    },

    "Projects/bets/glyphdeck/tasks/gld-31.md": {
      role: "task", title: "Play Ringfall on the tablet and say how the handheld controls feel",
      fields: () => taskFields("open", day(-60 * 24 * 2)),
      text: `---
id: gld-31
title: Play Ringfall on the tablet and say how the handheld controls feel
status: open
owner: you
outcome: gld-phone-browser-console
due: ${day(-60 * 24 * 2)}
---

# Play Ringfall on the tablet and say how the handheld controls feel

The handheld layout ("Big Grips") for tablets is on the preview. Reach and feel can only be
judged by holding it.

1. On the tablet in landscape, open the preview, open Ringfall and press Play.
2. Hold it like a handheld: the stick, ABXY, S/M and both trackpads should sit under your
   thumbs, about two-thirds of the way up.
3. Steer with the stick, drag the right trackpad to aim, tap or hold R1/R2 to fire.
4. Press M, change the case colour, close the menu.
5. Play Another Cup the same way.

Say how the reach and the size feel, then mark this done. Ringfall's lag in big fights is a
separate outcome.
`,
    },
  };

  const doc = path => ({ path, role: DOCS[path].role, title: DOCS[path].title,
    fingerprint: "demo-1", fields: DOCS[path].fields() });

  const KIND_NAMES = {
    draft_outcome: "Draft outcome", owner_review: "Owner checkpoint for outcome",
    owner_waiting: "Owner checkpoint for outcome", status_request: "Status request",
    proposal: "Proposal", decision: "Decision", chore: "Task", receipt: "Standing approval receipt",
  };
  const reference = it => [
    `VISR item ${it.key}`,
    `${KIND_NAMES[it.kind]} ${it.key.split(":").pop()} — ${it.title}`,
    `Project: ${it.project}`,
    ...(it.docs || []).map(d => `File: ${d.path}`),
    "Demo: sample data",
  ].join("\n");

  const id = key => key.split(":").slice(1).join(":");
  const BLOCKERS = ["chore:", "draft:", "owner:"];
  const base = it => ({
    recommendation: null, content: [], notes: [], deferred: null, awaiting: null, docs: [],
    pullRequests: [], lane: "decide", focus: "active", inFocus: true,
    working: null, workingCleared: null, blocked: null,
    ...(BLOCKERS.some(p => it.key.startsWith(p)) ? { blockerId: id(it.key) } : {}),
    ...(["chore", "draft_outcome"].includes(it.kind) ? { blockMax: 281 } : {}),
    ...it,
    reference: reference(it),
    revision: `${id(it.key)}:r1`, since: ago(it.age),
  });

  const brief = (key, b) => ({ state: "ready", brief: {
    revision: `${id(key)}:r1`, generatedAt: ago(20), model: "demo", changed: null,
    recommendation: null, visual: null, sources: [], ...b } });

  /* the draft's visual: the family page on a phone, in the three states the outcome asks to see */
  const PICKUP_VISUAL = "<!doctype html><html><head><style>\n"
    + "body{margin:0;background:#07090c;color:#cfe3f0;font:12px ui-monospace,monospace}\n"
    + ".wrap{padding:14px}h4{margin:0 0 10px;font-weight:normal;letter-spacing:2px;color:#6b8798;font-size:11px}\n"
    + ".row{display:flex;gap:10px}.ph{flex:1;border:1px solid #2a3a44;border-radius:10px;padding:10px;min-height:150px}\n"
    + ".ph b{display:block;color:#6b8798;font-weight:normal;font-size:10px;letter-spacing:1px;margin-bottom:8px}\n"
    + ".k{color:#6b8798}.ok{color:#6ee7a0}.mv{color:#f5c26b}p{margin:0 0 6px}\n"
    + "</style></head><body><div class=\"wrap\"><h4>FAMILY PAGE · PICKUP, ON A PHONE (SYNTHETIC)</h4><div class=\"row\">\n"
    + "<div class=\"ph\"><b>NOT YET CONFIRMED</b><p>Litter goes home</p><p class=\"k\">from the week of the 14th</p><p class=\"k\">Your pickup time will appear here once it's set.</p></div>\n"
    + "<div class=\"ph\"><b>CONFIRMED</b><p class=\"ok\">Saturday 10:00</p><p>At the farm gate; we'll meet you there.</p><p class=\"k\">Bring: a crate, a collar, the blanket we sent home.</p></div>\n"
    + "<div class=\"ph\"><b>RESCHEDULED</b><p class=\"mv\">Now Sunday 14:00</p><p class=\"k\">was Saturday 10:00</p><p>Same place, same list.</p></div>\n"
    + "</div></div></body></html>";

  const ITEMS = [
    base({
      key: "draft:lsp-pickup-plan", kind: "draft_outcome", age: 60 * 3,
      project: "engine/larkspur", title: "Give each matched family a clear pickup plan on their private page",
      why: "A drafted outcome waiting for your approval. Approving starts its owner; feedback redrafts it.",
      recommendation: { by: "strategist", text: "Approve if the breeder will use it; ask her first." },
      origin: "strategist",
      content: [
        { type: "markdown", title: "Strategist's pitch",
          text: "The family page shows the puppy, the litter's go-home date and the reading list, but nothing about the family's own pickup. A short written plan per family, published by the breeder, finishes the journey the charter describes. This one extends the charter; it doesn't answer a request." },
        { type: "facts", rows: [["drafted by", "strategist"], ["run", "run_5e0b2c71"], ["confidence", "lower: no request behind it"]] },
      ],
      actions: ["approve", "reject", "feedback", "later", "block"],
      ask: "Approve, refuse or correct this draft outcome.",
      docs: [doc("Projects/engine/larkspur/outcomes/lsp-pickup-plan.md")],
      ownerChoices: OWNERS, defaultOwner: "codex/sol",
      repoChoices: ["larkspur-site"], defaultRepos: ["larkspur-site"],
      brief: brief("draft:lsp-pickup-plan", {
        cardTitle: "Larkspur pickup plan",
        question: "Should each matched family get a written pickup plan on its private page, published by the breeder?",
        answers: [
          { action: "approve", effect: "The outcome opens and codex/sol starts on it at the next tick." },
          { action: "reject", effect: "The draft is closed. The strategist is told your reason." },
          { action: "feedback", effect: "The drafter rewrites the outcome with your note and asks again." },
          { action: "later", effect: "It leaves the deck until tomorrow morning." },
        ],
        recommendation: { text: "Approve.",
          reason: "It reuses the family page, the private links and the CMS she already uses; the new part is one small published plan per family, with no booking or reminders.",
          doubt: "Nobody asked for it: the strategist inferred it from the charter, and no family is waiting on a pickup date yet." },
        body: "Each matched family would see its own **pickup date, time, place and what to bring** on the private page it already has. The breeder writes and publishes the plan in the CMS, and can change or withdraw it.\n\n- No booking calendar, reminders or messaging.\n- Nothing is inferred from the litter's go-home date or a payment.",
        visual: { title: "The family page, three states", html: PICKUP_VISUAL },
        sources: [{ label: "Outcome document", ref: "Projects/engine/larkspur/outcomes/lsp-pickup-plan.md" },
                  { label: "Strategist's pitch", ref: "Strategist's pitch" }],
      }),
    }),

    base({
      key: "owner:hlw-patients-and-appointments", kind: "owner_review", age: 60 * 5,
      project: "engine/harlow", title: "Patients and Appointments give providers two ways into the same charge flow",
      why: "The owner says the work is ready for your review.",
      recommendation: { by: "claude/opus", text: "Merge PR #48, then accept." },
      content: [
        { type: "markdown", title: "Checkpoint",
          text: "## Ready for review\n\nPR #48 is green on head 4e1c9a7: CI and the code-quality scan pass, and both review passes are resolved. It's ready for your merge and your accept; I haven't merged it.\n\n**What changes**\n- **Nav:** four equal tabs (Home / Appointments / Patients / Charges) and no raised button. Old `/visits` and `/patients` links still open.\n- **Appointments:** your scheduled visits that don't have a charge yet, with no search fields.\n- **Patients:** the old Patients tab, restored from git history, with one search box for name or date of birth.\n- **Patient page:** “Charge for [visit date]” when an uncharged scheduled visit exists, and “New charge” for a one-off visit.\n\n**Known limitation:** until the client's patient cache ships, the live Patients list only shows patients the app has already seen this session. The demo build uses a synthetic sample instead. The contract their backend developer needs to meet is committed as `patient-list-contract.md`.\n\n**How it was verified**\n- **Android emulator, against the billing system's sandbox:** New charge saved, and Done returned to the patient page. Failure → Retry, an empty day and a search with no match all behave.\n- **iOS simulator:** the same walk on the Release build of 4e1c9a7.\n- **Not exercised natively:** “Charge for [date]”, because the sandbox's only visit already has a charge. It works in the web preview (screenshot 06) and the tests cover it.\n\n```\ntypecheck   ok\nlint        ok\ntests       412 passed\nci          green   4e1c9a7\n```\n\n**Shared files:** none; no sibling outcome has an open PR on this repo.\n\n**After your accept** I stop the preview services, remove the emulator builds and keep the screenshots." },
        { type: "facts", rows: [["checkpoint", "ready_for_review"], ["owner", "claude/opus"],
                                ["turn ended", ago(60 * 5)], ["branch", "owner/hlw-patients-and-appointments"], ["pr", "#48 · green · not merged"]] },
        { type: "image", title: "01-phone-home-four-tabs.png", ref: "evidence/01-phone-home-four-tabs.png" },
        { type: "image", title: "03-phone-patients-list.png", ref: "evidence/03-phone-patients-list.png" },
        { type: "image", title: "06-phone-patient-charge-for.png", ref: "evidence/06-phone-patient-charge-for.png" },
        { type: "image", title: "09-desktop-patients.png", ref: "evidence/09-desktop-patients.png" },
        { type: "link", label: "Open the web preview (synthetic data)", url: "https://example.com/harlow/preview" },
        { type: "markdown", title: "How to review",
          text: "Open the preview on your phone and choose Continue as provider. Open Patients, search a name, open the patient and start “Charge for [date]”. Then try “New charge” from the same page. Check that the four tabs read evenly on the desktop too." },
      ],
      actions: ["accept", "park", "feedback", "later"],
      ask: "Give the owner feedback or accept the work.",
      docs: [doc("Projects/engine/harlow/outcomes/hlw-patients-and-appointments.md")],
      interactive: { state: "unavailable", reason: "Not in the demo: there is no agent session to open." },
      brief: brief("owner:hlw-patients-and-appointments", {
        cardTitle: "Harlow patients and appointments",
        question: "Are Patients and Appointments ready to merge and accept?",
        answers: [
          { action: "accept", effect: "The outcome is accepted: open → accepted, with a receipt. The owner tears down the preview." },
          { action: "park", effect: "The outcome is parked with your reason and when to look again." },
          { action: "feedback", effect: "The owner reads your note and continues on its next turn." },
          { action: "later", effect: "It leaves the deck until tomorrow morning." },
        ],
        changed: ["The iOS simulator pass is done; the last checkpoint had Android only.",
                  "PR #48 is green on its final head.",
                  "The Patients list stays sample-backed until the client's patient cache ships; the contract is committed."],
        recommendation: { text: "Merge it and accept.",
          reason: "Every acceptance criterion has evidence attached, on both emulators and the web preview.",
          doubt: "“Charge for [date]” was only seen on the web, because the sandbox has no uncharged visit to try it on natively." },
        body: "One PR gives providers four tabs and two ways into the same charge flow: from the day's appointments, or from a patient found by name or date of birth. The patient list is sample-backed until the client's backend ships its cache. You merge client PRs yourself; the owner hasn't.",
        sources: [{ label: "Checkpoint", ref: "Checkpoint" },
                  { label: "Outcome document", ref: "Projects/engine/harlow/outcomes/hlw-patients-and-appointments.md" }],
      }),
    }),

    base({
      key: "decision:dec-41", kind: "decision", age: 60 * 2,
      project: "meta/vault", title: "Let the CI rollout merge one-line runner changes without a card each?",
      why: "The Superintendent asked this question.",
      recommendation: { by: "superintendent", text: "Yes, for runner changes whose local run is green." },
      content: [{ type: "markdown", title: "The Superintendent's question",
        text: "claude/opus has CI running on the Mac for IntrinsicOS and the review desk. Five more private repositories have workflows: the three client projects, Liturgos and GlyphDeck Studio. Each needs a one-line `runs-on` change, and each PR runs on the Mac before it merges.\n\nShall I let claude/opus merge those itself when the local run is green, instead of putting five cards on your deck? Workflows that deploy with cloud secrets stay on hosted runners either way, and any red run comes to you." }],
      actions: ["approve", "reject", "feedback", "later"],
      ask: "Answer the Superintendent's question.",
      brief: brief("decision:dec-41", {
        cardTitle: "CI rollout in private repos",
        question: "Let claude/opus merge the one-line runner change in each private repo once its run on the Mac is green?",
        answers: [
          { action: "approve", effect: "The Superintendent tells claude/opus to merge green runner PRs and report them in one checkpoint." },
          { action: "reject", effect: "Each runner PR comes to your deck as its own card." },
          { action: "feedback", effect: "The Superintendent reads your answer as written." },
        ],
        recommendation: { text: "Yes.",
          reason: "Each change is one line in a workflow file, proven by a green run before it merges, and reverted the same way.",
          doubt: "A repo whose branch rules refuse an agent's merge would still need you." },
        body: "Local CI is live for IntrinsicOS. The rollout to five more private repos is mechanical: one line per workflow, run on the Mac first. Deploy workflows that hold cloud secrets stay hosted.",
      }),
    }),

    base({
      key: "status:lit-service-slides", kind: "status_request", age: 60 * 7,
      project: "bets/liturgos", title: "Park service slides until the taxonomy redesign lands",
      why: "The owner asks to change this outcome's status.",
      recommendation: { by: "claude/sonnet", text: "Park it." },
      content: [
        { type: "markdown", title: "The owner's reason",
          text: "Slides need to know what an arrangement is: which verses, which refrain, which version of a call to worship. The taxonomy redesign (Element → Type → Tags) is about to change exactly that. If I build arrangement switching now, it gets rebuilt when the taxonomy lands.\n\nThe audit of the existing editor, presenter and exports is done and saved with the outcome; nothing else is half-built." },
        { type: "facts", rows: [["from", "open"], ["to", "parked"], ["asked by", "claude/sonnet"], ["next look", "when the taxonomy redesign is accepted"]] },
      ],
      actions: ["approve", "reject", "later"],
      ask: "Approve or refuse this status change.",
      docs: [doc("Projects/bets/liturgos/outcomes/lit-service-slides.md")],
      brief: brief("status:lit-service-slides", {
        cardTitle: "Liturgos slides, on hold",
        question: "Park service slides until the taxonomy redesign is accepted?",
        answers: [
          { action: "approve", effect: "The outcome is parked with that next look; the owner stops." },
          { action: "reject", effect: "The owner carries on and builds arrangements on the current model." },
        ],
        recommendation: { text: "Approve.", reason: "Arrangement switching is the heart of the slides outcome, and the taxonomy redesign is about to redefine arrangements.",
          doubt: "Slides are what a small church would use every Sunday; parking pushes them back by at least the length of the taxonomy work." },
        body: "The owner finished the audit of the existing slide editor and asks to stop before building on an arrangement model that is about to change.",
      }),
    }),

    base({
      key: "owner:hwk-exercise-title-fallback", kind: "owner_waiting", age: 60 * 9,
      project: "engine/heelwork", title: "Show existing exercise names when the CMS has no title",
      why: "The owner is waiting on an answer from you.",
      content: [{ type: "markdown", title: "The owner's question",
        text: "Four published exercises reach dog owners as plain “Exercise”. I checked a content snapshot: the CMS has no title for them in any language, but the dashboard has a name for each (for example “Hand target, two-second hold”).\n\nTwo ways to go:\n1. **Fall back on the server.** The API uses the CMS title, then the dashboard's display name, then its admin title. Owners see real names today; no content changes.\n2. **Leave them unnamed** and give the trainer a task to title the four exercises in the CMS.\n\nOption 1 is written and tested on a branch, not merged: 375 dashboard tests and 135 API tests pass, and the review was clean. Which do you want?" }],
      actions: ["feedback", "later"],
      notes: ["The owner has been waiting 9 hours."],
      ask: "Give the owner feedback or accept the work.",
      docs: [doc("Projects/engine/heelwork/outcomes/hwk-exercise-title-fallback.md")],
      interactive: { state: "unavailable", reason: "Not in the demo: there is no agent session to open." },
      brief: brief("owner:hwk-exercise-title-fallback", {
        cardTitle: "Exercise names: fallback or task",
        question: "Fall back to the dashboard's names on the server, or leave the four exercises unnamed for the trainer to title?",
        recommendation: { text: "Fall back on the server now, and still send the trainer the four exercises to title.",
          reason: "Dog owners see a real name today, translated titles still win, and nothing in the content changes.",
          doubt: "The dashboard names were written for staff; one or two may read oddly to a dog owner until she titles them." },
        body: "Four published exercises show as “Exercise” because the CMS has no title for them. The dashboard has names. The server fallback is written and tested on a branch.",
      }),
    }),

    base({
      key: "proposal:run_7c41", kind: "proposal", age: 60 * 30,
      project: "engine/larkspur", title: "Proposed two tasks before the pickup plan is built",
      why: "The drafter proposed tasks from an intake note.",
      content: [
        { type: "markdown", title: "Proposed tasks",
          text: "1. **lsp-23** — Ask the breeder what a family needs to know for pickup, and whether she'd write it on their page. *owner: you*\n2. **lsp-24** — Add unpublished pickup-plan fields to the family record in the CMS, hidden from every public read. *owner: claude/sonnet*" },
        { type: "facts", rows: [["proposal", "run_7c41"], ["tasks", "2"], ["from", "intake: “can families see their pickup time on their page?”"]] },
      ],
      actions: ["approve", "reject", "later"],
      ask: "Approve or refuse these proposed tasks.",
      brief: brief("proposal:run_7c41", {
        cardTitle: "Two tasks for the pickup plan",
        question: "Approve two tasks: you ask the breeder what pickup needs, and claude/sonnet adds unpublished pickup fields to the CMS?",
        recommendation: { text: "Approve both.", reason: "The pickup plan shouldn't be built on a guess about what she'd write, and the fields are useful either way." },
        answers: [{ action: "approve", effect: "Both tasks are created; claude/sonnet starts the fields on its next turn." },
                  { action: "reject", effect: "Nothing is created; the drafter is told why." }],
      }),
    }),

    base({
      key: "chore:vlt-104", kind: "chore", age: 60 * 9, lane: "do",
      project: "meta/vault", title: "Create the GitHub App the Mac's CI runners sign in with",
      why: "A task assigned to you.",
      actions: ["done", "feedback", "later", "block"],
      ask: "Do this, then mark it done.", textMax: 300,
      docs: [doc("Projects/meta/vault/tasks/vlt-104.md")],
      brief: brief("chore:vlt-104", {
        cardTitle: "GitHub App for the CI runners",
        question: "Create the runners' GitHub App on the organization, install it, put its key in 1Password, then mark this done?",
        answers: [{ action: "done", effect: "The task closes, and the owner enrols the next repository." },
                  { action: "feedback", effect: "Your note is added to the task." }],
        body: "Only an organization owner can create a GitHub App, and that's you. The steps are in the task; about ten minutes. The key goes straight into 1Password, never into chat.",
      }),
    }),

    base({
      key: "chore:gld-31", kind: "chore", age: 60 * 26, lane: "do",
      project: "bets/glyphdeck", title: "Play Ringfall on the tablet and say how the handheld controls feel",
      why: "A task assigned to you.",
      actions: ["done", "feedback", "later", "block"],
      ask: "Do this, then mark it done.", textMax: 300,
      working: { since: ago(40) },
      docs: [doc("Projects/bets/glyphdeck/tasks/gld-31.md")],
      brief: brief("chore:gld-31", {
        cardTitle: "Try the handheld on the tablet",
        question: "Play Ringfall and Another Cup on the tablet in landscape, say how the reach and size feel, then mark this done?",
        answers: [{ action: "done", effect: "The task closes, and the owner tunes the layout from your note." },
                  { action: "feedback", effect: "Your note goes to the owner." }],
        body: "You marked this as yours 40 minutes ago. Studio's PR is green and waits on your feel check before it merges.",
      }),
    }),

    base({
      key: "receipt:sa-0031", kind: "receipt", age: 60 * 4, lane: "happened",
      project: "engine/larkspur", title: "Moved lsp-19's due date to next Tuesday",
      why: "A standing rule covered this, so it was done for you.",
      content: [
        { type: "markdown", title: "What happened",
          text: "The Superintendent asked to move **lsp-19** (photograph the new litter for the gallery) back a week, quoting you: “push the litter photos a week, the pups aren't ready for pictures yet”. Rule R2 covers date moves, so the due date was changed.\n\nUndo puts it back." },
        { type: "markdown", title: "Under", text: "- R2 · Dates move when I say so" },
        { type: "facts", rows: [["action", "date_move"], ["target", "lsp-19"], ["asked by", "superintendent"]] },
      ],
      actions: ["undo", "acknowledge"],
      ask: "Nothing to decide: undo it if the rule got it wrong.",
      brief: { state: "not_applicable", reason: "A receipt says what a standing rule did; it asks nothing." },
    }),
  ];

  const HAPPENED = [
    { kind: "owner_release", key: "release:lsp-application-handoff:run_f3907b1e", project: "engine/larkspur",
      title: "Give every website application a visible, recoverable handoff to the breeder",
      outcomeId: "lsp-application-handoff", runId: "run_f3907b1e",
      summary: "Released: merged and live. A failed application notice now shows “Didn't send” on the breeder's dashboard, with Send again.",
      destination: null, evidence: [], pullRequests: [], at: ago(60 * 20) },
    { kind: "owner_release", key: "release:vlt-visr-persistent-chat:run_3b19c3d4", project: "meta/vault",
      title: "Superintendent chat stays beside VISR on tablets and desktops",
      outcomeId: "vlt-visr-persistent-chat", runId: "run_3b19c3d4",
      summary: "Released: merged and live in VISR. The chat stays docked while you move around the deck, and a reload keeps it open.",
      destination: null, evidence: [], pullRequests: [], at: ago(60 * 30) },
    { kind: "owner_release", key: "release:lit-feature-map-verification:run_9a0e11f2", project: "bets/liturgos",
      title: "Agents can find and verify Liturgos features from a cold checkout",
      outcomeId: "lit-feature-map-verification", runId: "run_9a0e11f2",
      summary: "Released: the feature map and the cold-start guide are merged to main.",
      destination: null, evidence: [], pullRequests: [], at: ago(60 * 40) },
  ];

  window.VISR_DEMO_CORPUS = { NOW, ago, OWNERS, PROJECTS, PROJECT_NAMES, DOCS, ITEMS, HAPPENED };
})();
