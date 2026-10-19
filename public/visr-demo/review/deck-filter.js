/* REVIEW · deck filter — which items the deck shows.

   A filter is a few facets that stack, chosen from the funnel top left of
   home (home-bar.js) and remembered on this device (`tycho.deck.filter`):
     lanes     which lanes (`Lanes`, below): any of "decide", "do" and "happened";
               Decide and Do unless he chooses otherwise, never none
     working   only the items he marked I'M ON IT (`working`, working.js)
     hide      any of "later" (filed for LATER, `deferred`), "blocked"
               (held by a free-text block, `blocked`, block.js) and
               "linear" (Linear cards, kind `linear`)
     project   only one project's items (`item.project`, as the runtime
               names it: "meta/ops")
   Decide and Do with no other facet is All, the default. Every other facet
   narrows the deck further. The deck also leaves out what the runtime says
   is out of focus (`inFocus: false`, from the focus settings), except that
   a project chosen by name shows all of its items. Filtering only changes
   what the deck shows: a deep link or a phone alert still opens any item,
   shown or not. A remembered project with nothing waiting stays chosen and
   says so, rather than silently showing all. The single modes this replaced
   ("hide-later", "working", "project:<p>") read as the facet they were, and
   a filter saved before lanes reads with the default lanes.

     DeckFilter.get() → { working, hide: [...], project, lanes: [...] }   · DeckFilter.set(f)
     DeckFilter.all(f) · DeckFilter.apply(items, f)
     DeckFilter.label(f)     → "OPS · I'm on it · Hide later, blocked", or "All"
     DeckFilter.empty(f, items) → what an empty deck says under that filter
     DeckFilter.projects(items, f) → [{ path, name, count }] by name */
"use strict";

/* REVIEW · lanes — which of the deck's three lanes an item belongs to.

   Every item carries the runtime's `lane` (intrinsicOS src/standing/README.md):
     decide    a judgment: drafts, owners, proposals, rules…
     do        work he does himself: chores, Linear cards
     happened  what already happened: receipts of a standing approval (kind
               `receipt`) and the owner releases the queue lists apart, in
               its top-level `happened`
   An item from a runtime before lanes is placed by its kind. Happened items
   ask nothing of him, so they are never counted as waiting (home.js).

   The queue's `happened` owner releases are not items. Each becomes a
   read-only card here (`kind: "owner_release"`, no actions), so the deck,
   the paper and the desk show them like any other card and no verb is
   ever drawn for them.

     Lanes.ALL · Lanes.of(item) → "decide" | "do" | "happened"
     Lanes.happened(item) → bool · Lanes.focused(item) → bool
     Lanes.items(data) → the items, then the owner releases as cards */

const Lanes = {
  ALL: ["decide", "do", "happened"],
  LABEL: { decide: "Decide", do: "Do", happened: "Happened" },
  DO_KINDS: ["chore", "linear"],

  of(item) {
    if (this.ALL.includes(item?.lane)) return item.lane;
    if (item?.kind === "receipt" || item?.kind === "owner_release") return "happened";
    return this.DO_KINDS.includes(item?.kind) ? "do" : "decide";
  },

  happened(item) { return this.of(item) === "happened"; },

  /* out of focus only when the runtime says so; a runtime before focus has
     everything in focus */
  focused(item) { return item?.inFocus !== false; },

  items(data) {
    const items = data?.items || [];
    const released = Array.isArray(data?.happened) ? data.happened : [];
    return released.length ? [...items, ...released.map(r => this.release(r))] : items;
  },

  /* one owner release (contract `Receipt`) as a card that asks nothing */
  release(r) {
    const facts = [["outcome", r.outcomeId], ["run", r.runId], ["released", r.at],
      ...(r.destination ? [["where", r.destination]] : [])].filter(([, v]) => v);
    const evidence = (r.evidence || []).filter(Boolean);
    return {
      key: String(r.key), kind: "owner_release", lane: "happened", inFocus: true,
      revision: String(r.runId || r.at || ""), project: r.project, title: String(r.title || r.outcomeId || r.key),
      why: "", recommendation: null, since: r.at, actions: [], notes: [], deferred: null,
      working: null, workingCleared: null, awaiting: null, docs: [],
      ask: "Nothing to decide: this already happened.",
      brief: { state: "not_applicable", reason: "A release receipt asks nothing." },
      content: [
        { type: "markdown", title: "What happened", text: String(r.summary || "Released after your accept.") },
        { type: "facts", rows: facts },
        ...(evidence.length ? [{ type: "markdown", title: "Evidence", text: evidence.map(e => `- ${e}`).join("\n") }] : []),
      ],
    };
  },
};

const DeckFilter = {
  KEY: "tycho.deck.filter",
  HIDE: ["later", "blocked", "linear"],
  HIDE_LABEL: { later: "Later", blocked: "Blocked", linear: "Linear" },
  LANES: ["decide", "do"],
  NONE: Object.freeze({ working: false, hide: [], project: null, lanes: ["decide", "do"] }),

  /* any stored shape → a clean filter */
  normal(v) {
    const none = () => ({ ...this.NONE, lanes: [...this.LANES] });
    if (v === "hide-later") return { ...none(), hide: ["later"] };
    if (v === "working") return { ...none(), working: true };
    if (typeof v === "string" && v.startsWith("project:") && v.length > 8) return { ...none(), project: v.slice(8) };
    if (!v || typeof v !== "object") return none();
    const lanes = Lanes.ALL.filter(l => Array.isArray(v.lanes) && v.lanes.includes(l));
    return {
      working: v.working === true,
      hide: this.HIDE.filter(h => Array.isArray(v.hide) && v.hide.includes(h)),
      project: typeof v.project === "string" && v.project ? v.project : null,
      lanes: lanes.length ? lanes : [...this.LANES],
    };
  },

  defaultLanes(f) { return f.lanes.join() === this.LANES.join(); },

  all(f) { return !f.working && !f.hide.length && !f.project && this.defaultLanes(f); },

  get() { return this.normal(Store.get(this.KEY)); },

  set(f) { const n = this.normal(f); Store.set(this.KEY, this.all(n) ? null : n); },

  apply(items, f) {
    return (items || []).filter(i =>
      f.lanes.includes(Lanes.of(i)) &&
      (f.project ? i.project === f.project : Lanes.focused(i)) &&
      (!f.working || !!i.working) &&
      !(f.hide.includes("later") && i.deferred) &&
      !(f.hide.includes("blocked") && i.blocked) &&
      !(f.hide.includes("linear") && i.kind === "linear"));
  },

  hidden(f) { return f.hide.map(h => this.HIDE_LABEL[h].toLowerCase()).join(", "); },

  lanes(f) { return f.lanes.map(l => Lanes.LABEL[l]).join(", "); },

  label(f) {
    if (this.all(f)) return "All";
    return [this.defaultLanes(f) ? null : this.lanes(f), f.project ? Fmt.project(f.project) : null,
      f.working ? "I'm on it" : null, f.hide.length ? `Hide ${this.hidden(f)}` : null].filter(Boolean).join(" · ");
  },

  /* `items`: everything the deck could show, to say when focus is what
     emptied it */
  empty(f, items = []) {
    const lanes = !this.defaultLanes(f);
    const only = [lanes, f.project, f.working, f.hide.length].filter(Boolean).length === 1;
    if (only && lanes && f.lanes.join() === "happened") return "Nothing has happened lately.";
    if (only && lanes) return `Nothing in ${this.lanes(f).replace(/, ([^,]*)$/, " or $1")}.`;
    if (only && f.project) return `Nothing waiting in ${Fmt.project(f.project)}.`;
    if (only && f.working) return "Nothing you're on.";
    if (only) return `Nothing waiting except ${this.hidden(f).replace(", ", " or ")} items.`;
    if (this.all(f)) return items.some(i => !Lanes.focused(i) && f.lanes.includes(Lanes.of(i)))
      ? "Nothing in focus is waiting. By project shows the rest." : "Nothing is waiting on you.";
    return "Nothing waiting under these filters.";
  },

  /* each project with something in the chosen lanes, whatever its focus:
     choosing one shows all of it */
  projects(items, f = this.NONE) {
    const n = new Map();
    for (const i of items || []) if (i.project && f.lanes.includes(Lanes.of(i))) n.set(i.project, (n.get(i.project) || 0) + 1);
    return [...n].map(([path, count]) => ({ path, name: Fmt.project(path), count }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
  },
};
