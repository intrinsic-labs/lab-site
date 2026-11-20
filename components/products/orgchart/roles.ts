/**
 * Who is who in IntrinsicOS, as the org chart on /products/intrinsic-os/how-it-works draws
 * it. Structured data, not prose: the chart, its detail panel and the no-JS role list all
 * read this one array, so a role is described in exactly one place.
 *
 * ACCURACY. Every line here was checked against the company's private runtime docs and
 * company map as of November 2026. Change a role only from those sources, never from memory,
 * and never name a client or a person other than Asher. The earlier chat bots are retired;
 * Jefferson is the only bot. `tests/orgchart.test.mjs` checks the links and that no retired
 * bot appears.
 *
 * Plain TypeScript with no imports, so `node --test` can load it with type stripping.
 */

export type RoleId =
  | "asher"
  | "superintendent"
  | "threads"
  | "jefferson"
  | "owners"
  | "subagents-claude"
  | "subagents-codex"
  | "drafter"
  | "strategist"
  | "arbiter"
  | "vault-reviewer"
  | "guilty-spark";

export type TierId = "founder" | "management" | "building" | "checking" | "supervisor";

export interface Link {
  to: RoleId;
  /** How this role reaches the other one, from this role's side, as a short phrase. */
  how: string;
}

export interface Role {
  id: RoleId;
  name: string;
  /** One line under the name: what kind of thing it is. */
  kind: string;
  /** The model family, or the absence of one. */
  family: string;
  tier: TierId;
  does: string;
  mayDecide: string[];
  talksTo: Link[];
}

export interface Tier {
  id: TierId;
  label: string;
}

export const TIERS: Tier[] = [
  { id: "founder", label: "The founder" },
  { id: "management", label: "Runs the company with him" },
  { id: "building", label: "Builds the work" },
  { id: "checking", label: "Proposes and checks" },
  { id: "supervisor", label: "Underneath everything" },
];

export const ROLES: Role[] = [
  {
    id: "asher",
    name: "Asher",
    kind: "Founder",
    family: "Human",
    tier: "founder",
    does:
      "Supplies direction and taste, the yes-or-no decisions and the client conversations. He writes or dictates notes about each project. Everything waiting on him arrives in VISR, which he works through mostly on his phone.",
    mayDecide: [
      "Which drafts become approved work, and which agent owns each. The Superintendent can open work too, and the record shows who did.",
      "Accepting results that involve interface or taste calls, client or public sends, production or a physical check.",
      "Merges on the paths each project reserves for him.",
      "Spending money, sending anything outside the company, releasing to production or deleting real data. Each needs his tap on that exact action.",
      "How much the Superintendent may do without asking.",
    ],
    talksTo: [
      { to: "superintendent", how: "Chats with it in VISR, by text or voice" },
      { to: "owners", how: "Replies on each outcome's card and in the project's thread" },
      { to: "drafter", how: "Writes the notes it drafts from" },
      { to: "threads", how: "Reads them; answers the decisions they post" },
    ],
  },
  {
    id: "superintendent",
    name: "Superintendent",
    kind: "Manager agent",
    family: "Claude",
    tier: "management",
    does:
      "Runs the company day to day alongside Asher: keeps approved work moving, opens and accepts outcomes, thinks through his brain dumps with him, fixes what blocks the work and prepares his decisions. It can walk him through the VISR deck and act on cards when he asks.",
    mayDecide: [
      "Opening approved work and choosing its owner, within the same pacing and limits as Asher's approvals.",
      "Accepting a finished result when the project allows it or the work can't reach real users. Each accept is recorded with its reason and can be undone.",
      "Merging internal pull requests whose checks pass and whose release review is clean. A merge that ships a product, or that touches its own permission rules, waits for Asher.",
      "Not spending, outside sends, production releases or deleting real data: for those it can only ask, with a button he taps.",
    ],
    talksTo: [
      { to: "asher", how: "The main chat in VISR; decisions arrive as yes/no buttons under its reply" },
      { to: "threads", how: "Gives each matter its own thread" },
      { to: "owners", how: "A private thread with each project's owner" },
      { to: "jefferson", how: "Hands work back and forth, so Asher never relays" },
      { to: "drafter", how: "Files Asher's brain dumps as notes, one per project" },
      { to: "strategist", how: "Can ask for a project's next steps" },
      { to: "arbiter", how: "Requests cross-family reviews and reads its findings" },
    ],
  },
  {
    id: "threads",
    name: "Superintendent threads",
    kind: "One conversation per matter",
    family: "Claude",
    tier: "management",
    does:
      "Separate Superintendent sessions, each with its own record: one per alert, owner or bot handoff, timer or scheduled routine, and a project's thread when that project has no owner of its own.",
    mayDecide: [
      "What the Superintendent may decide, within that one matter.",
      "What to post to the main chat: only a decision Asher must make, a blocker or a finished result, never progress.",
      "A reserved action raised from a thread waits as a row in the main chat until Asher taps it.",
    ],
    talksTo: [
      { to: "superintendent", how: "Post decisions, blockers and results to the main chat" },
      { to: "asher", how: "A project thread without an owner is where he talks to that project" },
    ],
  },
  {
    id: "jefferson",
    name: "Jefferson",
    kind: "Operations bot",
    family: "Outside the runtime",
    tier: "management",
    does:
      "Operations and administration: Asher's mail and calendar, money and the company's books. It runs on its own schedule, outside the runtime's sessions, and answers other agents with just the fact they need.",
    mayDecide: [
      "What to share: private mail and money stay out of shared channels.",
      "Like every agent, not spending or sending outside the company without Asher's approval.",
    ],
    talksTo: [
      { to: "superintendent", how: "Hands things over and gets answers back; other agents reach it only through the Superintendent" },
    ],
  },
  {
    id: "owners",
    name: "Project owners",
    kind: "Persistent, one per pilot project",
    family: "Claude or Codex",
    tier: "building",
    does:
      "Deliver approved outcomes from start to landing. On a pilot project, one persistent owner runs every outcome of that project; other projects still get one owner per outcome. It works in its own copies of the code, on its own branches, in turns of up to two hours, and records a checkpoint at least every 25 minutes.",
    mayDecide: [
      "How to build the approved outcome, and which model does each piece. The outcome's recommended model is the default; it records why when it departs from it.",
      "Landing its own pull requests where the project's merge rules give it every changed file, the checks are green and, for sign-in or payment code, the cross-family review is clean. The rest waits for Asher.",
      "Small work inside its project without a new approval: a bug, a test, CI, cleanup, docs.",
      "Not widening the approved scope, and not accepting its own result.",
    ],
    talksTo: [
      { to: "subagents-claude", how: "Hands them pieces of the work" },
      { to: "subagents-codex", how: "Hands them pieces of the work" },
      { to: "arbiter", how: "Requests a cross-family review of a pull request" },
      { to: "vault-reviewer", how: "Submits edits to the company's documents for review" },
      { to: "superintendent", how: "A private thread per project" },
      { to: "asher", how: "One living card per outcome in VISR; questions as decisions in the project's thread" },
    ],
  },
  {
    id: "subagents-claude",
    name: "Claude subagents",
    kind: "Subagents",
    family: "Claude",
    tier: "building",
    does: "Take one piece of an owner's work and return the result to it. They run inside the owner's session.",
    mayDecide: ["Only how to do their piece. The owner checks the result, records the checkpoint and lands the work."],
    talksTo: [{ to: "owners", how: "Report back to the owner that started them" }],
  },
  {
    id: "subagents-codex",
    name: "Codex subagents",
    kind: "Subagents",
    family: "Codex",
    tier: "building",
    does:
      "Take one piece of an owner's work and return the result to it. An outcome can recommend which model does its work, and the project owner follows that by default.",
    mayDecide: ["Only how to do their piece. The owner checks the result, records the checkpoint and lands the work."],
    talksTo: [{ to: "owners", how: "Report back to the owner that started them" }],
  },
  {
    id: "drafter",
    name: "Drafter",
    kind: "Drafting agent",
    family: "Either family",
    tier: "checking",
    does:
      "Turns each of Asher's notes, and his corrections to earlier drafts, into a draft outcome with acceptance criteria, a few small tasks for him, or nothing. In a project with an owner, a small engineering ask goes straight to that owner instead.",
    mayDecide: ["The shape of the proposal only. It can't approve anything or choose an owner: the runtime reverts either attempt."],
    talksTo: [
      { to: "asher", how: "Each draft becomes a card in VISR" },
      { to: "owners", how: "Passes small asks to the project's owner" },
    ],
  },
  {
    id: "strategist",
    name: "Project strategists",
    kind: "Strategy agent",
    family: "Either family",
    tier: "checking",
    does:
      "Once a week for each client project and product bet, or on request, reads the project and pitches up to three next outcomes as drafts. A project can be switched off.",
    mayDecide: ["Nothing beyond proposing. A project's weekly slot waits while its last batch of drafts is still undecided."],
    talksTo: [{ to: "asher", how: "Its drafts arrive as cards in VISR" }],
  },
  {
    id: "arbiter",
    name: "Arbiter",
    kind: "Health check and code review",
    family: "Claude + other family",
    tier: "checking",
    does:
      "A nightly health check of the runtime's records and the company's documents: drift, failed runs, work that never landed, stale docs. A second nightly pass reads a redacted digest of the day's agent sessions for recurring failures and loose ends. It also runs cross-family code review: a model from the other family than the author's reviews each pull request.",
    mayDecide: [
      "Fixing documentation, skills and prompts itself, by exact find-and-replace, outside the protected files (authority rules, project briefs, outcomes, agent guides). Everything else stays a finding.",
      "Review verdicts. A release review covers the exact commit that will merge, so any later push needs a new one, and a failed review never counts as clean.",
    ],
    talksTo: [
      { to: "superintendent", how: "New findings wake its chat" },
      { to: "owners", how: "Returns verdicts and findings to the owner who asked" },
    ],
  },
  {
    id: "vault-reviewer",
    name: "Document reviewer",
    kind: "Reviews edits to company docs",
    family: "The other family",
    tier: "checking",
    does:
      "When an owner or the Superintendent edits the company's own documents, skills or prompts, a model of the other family reviews the exact text: whether it is correct and will stay true.",
    mayDecide: [
      "Routine edits apply first and are reviewed after; findings are fixed forward, never reverted.",
      "Protected edits (project briefs, agent guides, approved outcomes, authority rules) are reviewed first, then wait as a change only Asher, or a standing rule of his, decides.",
    ],
    talksTo: [
      { to: "owners", how: "Returns findings to the editor" },
      { to: "superintendent", how: "Returns findings to the editor" },
      { to: "asher", how: "Protected edits it passes reach him in VISR" },
    ],
  },
  {
    id: "guilty-spark",
    name: "Guilty Spark",
    kind: "Supervisor",
    family: "No model",
    tier: "supervisor",
    does:
      "The runtime's supervisor: a deterministic loop that ticks once a minute and makes no model call. It starts sessions, cleans up after them, raises alerts and keeps the record in sync.",
    mayDecide: [
      "Whether a session may start. Before each one it re-checks that the work is still approved, the owner valid and the code it touches allowed.",
      "How many run at once (four owners by default). A stop switch halts new sessions, and weekly usage is paced across the business days; a run over pace asks Asher first.",
      "Never what the work should be.",
    ],
    talksTo: [
      { to: "superintendent", how: "Wakes it on alerts, handoffs and timers" },
      { to: "owners", how: "Starts, queues and limits owner turns" },
      { to: "drafter", how: "Starts a draft once a note has settled" },
      { to: "strategist", how: "Runs the weekly slots" },
      { to: "arbiter", how: "Runs it nightly, and runs requested reviews" },
      { to: "asher", how: "Asks before starting a run over pace" },
    ],
  },
];

/** Roles linked to `id` either way: the ones it reaches and the ones that reach it. */
export function linkedIds(id: RoleId): Set<RoleId> {
  const out = new Set<RoleId>();
  for (const r of ROLES) {
    if (r.id === id) r.talksTo.forEach((l) => out.add(l.to));
    else if (r.talksTo.some((l) => l.to === id)) out.add(r.id);
  }
  out.delete(id);
  return out;
}

export function roleById(id: RoleId): Role {
  const r = ROLES.find((x) => x.id === id);
  if (!r) throw new Error(`orgchart: no role ${id}`);
  return r;
}
