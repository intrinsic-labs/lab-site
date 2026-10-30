/* VISR DEMO · the mock server, and the desk the scripted Superintendent acts on.

   The real desk talks to the Tycho server over `/api/*`, which relays the
   IntrinsicOS CLI. This script loads after demo/corpus.js and demo/supt/*.js
   and before the first shell script that can touch storage or the network
   (kernel/net.js; kernel/platform.js in <head> only reads the user agent).
   It does four things:

   1. STORAGE. `window.localStorage` is replaced, for this document only, by an
      in-memory Storage. The demo never reads or writes the origin's real
      storage (older demos on this origin used the same `tycho.*` keys), and a
      reload restores the defaults below: the daily power-on ritual already
      done today (`tycho.boot.last`, kernel/wake.js), so a load is the short
      wake; a seeded action token (`tycho.term.token`, kernel/auth.js), as the
      server's REVIEW_AUTH=synthetic `/review-auth.js` would seed it, so no
      token prompt ever appears; the docked chat open on a wide screen
      (`tycho.chat.dock`, superintendent/dock.js); sound off.
   2. MARK. A small fixed note, "Demo · invented data · scripted
      Superintendent", in place of the review preview's marker.
   3. NETWORK. `fetch`, XHR (uploads) and `sendBeacon` (the event log) are
      wrapped. `/health` and every `/api/*` path on this origin are answered
      here, from memory, in the desk's contract: `{ok: true, …}` (HTTP 200) or
      `{ok: false, reason, code}` (HTTP 400, `error` = `reason`, as the server
      sends a refusal). An `/api/*` path this file does not know is refused
      locally; it never reaches the network. Requests to another origin are
      refused too. Only this origin's static files go out. The service worker
      never registers.
   4. THE DESK. `window.VISR_DEMO_DESK`, the queue as state, which the shell's
      routes and the scripted Superintendent share:

        desk.queue()      the payload GET /api/review answers (a fresh object)
        desk.items()      the live array of waiting items (do not mutate)
        desk.act({key, action, owner?, text?})
                          an act as the review route applies it, without the
                          revision check (an agent-initiated act). → the
                          route's answer: {ok, result: {kind, message}} or
                          {ok: false, reason, code}
        desk.fileIntake({project, note, source})
                          files an intake note (project: ref or slug)
                          → {ok, path, project, id} or a refusal
        desk.reopen(key)  undo: puts a card back as it was before its last
                          act → {ok} or {ok: false, reason}
        desk.intake()     every filed note, newest first:
                          [{id, project, note, source, at}]
        desk.projects     the fictional projects [{slug, category, ref, name, relDir}]
        desk.on(fn)       fn(event) after every act and every filed note, from
                          any source: {type: "act", key, action, source,
                          result, item, at} or {type: "intake", id, project,
                          note, source, at}. Returns an unsubscribe function.

      `/api/superintendent/*` is answered by the scripted Superintendent:
      `window.VISR_DEMO_SUPT.answer(path, method, body, desk)` → a plain
      object (sent as JSON, 200 when `ok`, else 400) or a Response, or a
      Promise of either. `path` is the pathname with the query string kept
      (`/api/superintendent/thread?after=…`); `body` the parsed JSON body, or
      {} for a GET. Without that module the routes refuse. */
"use strict";

(function () {
  /* -- 1. storage ---------------------------------------------------------------- */
  const SEED = {
    "tycho.boot.last": String(Date.now()),
    "tycho.term.token": "demo-token",
    "tycho.chat.dock": JSON.stringify("open"),
    "tycho.sound": "false",
  };
  class MemoryStorage {
    #m = new Map(Object.entries(SEED));
    get length() { return this.#m.size; }
    key(i) { return [...this.#m.keys()][i] ?? null; }
    getItem(k) { k = String(k); return this.#m.has(k) ? this.#m.get(k) : null; }
    setItem(k, v) { this.#m.set(String(k), String(v)); }
    removeItem(k) { this.#m.delete(String(k)); }
    clear() { this.#m.clear(); }
  }
  const memory = new MemoryStorage();
  Object.defineProperty(window, "localStorage", { configurable: true, enumerable: true, get: () => memory });
  if (window.localStorage !== memory) throw new Error("demo/shim.js: could not replace localStorage");

  /* -- 2. the mark ------------------------------------------------------------------ */
  addEventListener("DOMContentLoaded", () => {
    const m = document.createElement("div");
    m.className = "t-demo-mark";
    m.setAttribute("role", "note");
    m.textContent = "Demo · invented data · scripted Superintendent";
    m.style.cssText = "position:fixed;left:50%;top:env(safe-area-inset-top,0px);transform:translateX(-50%);"
      + "z-index:2147483647;pointer-events:none;padding:1px 6px;font:10px/1.4 var(--mono);letter-spacing:1px;"
      + "white-space:nowrap;color:var(--bg);background:var(--amber);opacity:.85";
    document.body.append(m);
  });

  /* -- 4. the desk -------------------------------------------------------------------- */
  const C = window.VISR_DEMO_CORPUS;
  if (!C) throw new Error("demo/corpus.js must load before demo/shim.js");
  const { ago } = C;
  const now = () => new Date().toISOString();
  const refuse = (code, reason) => ({ ok: false, code, reason });
  const DEMO = "Not in the demo: this needs the real Mac behind VISR.";

  const items = C.ITEMS.map(i => structuredClone(i));
  const docs = Object.fromEntries(Object.entries(C.DOCS).map(([p, d]) => [p, { ...d, fingerprint: "demo-1", set: {} }]));
  const filed = [];
  const listeners = new Set();
  let edits = 1;

  const emit = ev => {
    for (const fn of [...listeners]) {
      try { fn(ev); } catch (e) { console.warn("demo desk listener failed", e); }
    }
  };

  /* documents */
  const fieldsOf = d => d.fields().map(f => (f.key in d.set ? { ...f, value: d.set[f.key] } : f));
  const docEntry = path => ({ path, role: docs[path].role, title: docs[path].title,
    fingerprint: docs[path].fingerprint, fields: fieldsOf(docs[path]) });
  const bump = it => { const [id, r] = it.revision.split(":r"); it.revision = `${id}:r${Number(r) + 1}`; };

  function docRead(req) {
    const d = docs[req.path];
    if (!d) return refuse("gone", `${req.path} isn't in the demo's documents.`);
    return { ok: true, path: req.path, text: d.text, fingerprint: d.fingerprint, fields: fieldsOf(d) };
  }
  function docSave(req) {
    const d = docs[req.path];
    if (!d) return refuse("gone", `${req.path} isn't in the demo's documents.`);
    if (req.fingerprint !== d.fingerprint) return refuse("stale", "This document changed since you opened it.");
    let notes;
    if (req.set && typeof req.set === "object") {
      Object.assign(d.set, req.set);
      notes = ["Saved the fields. Every other line of the document is unchanged."];
    } else {
      const text = String(req.text ?? "");
      if (!text.startsWith("---\n")) return refuse("invalid", "An outcome document must start with its front matter.");
      d.text = text;
      notes = ["Saved in this tab only. The owner would continue on this version at its next turn."];
    }
    d.fingerprint = `demo-${++edits}`;
    for (const it of items) {
      if (!it.docs.some(x => x.path === req.path)) continue;
      it.docs = it.docs.map(x => docEntry(x.path));
      bump(it);
    }
    return { ok: true, path: req.path, fingerprint: d.fingerprint, notes };
  }

  /* the queue */
  function queue() {
    const sorted = [...items].sort((a, b) => !a.working - !b.working);
    const waiting = sorted.filter(i => i.lane !== "happened");
    const later = waiting.filter(i => i.deferred);
    return structuredClone({ ok: true, generatedAt: now(), reviewUrl: null,
      counts: { active: waiting.length - later.length, later: later.length,
                working: waiting.filter(i => i.working).length },
      unknown: [], projects: C.PROJECT_NAMES, items: sorted, happened: C.HAPPENED });
  }

  const MESSAGES = {
    approve: "Approved. The owner starts on its next tick.",
    reject: "Refused. The drafter is told why.",
    feedback: "Feedback recorded. The owner reads it on its next turn.",
    later: "Filed for later. It comes back tomorrow at 06:00.",
    done: "Marked done. The task moved to tasks/done.",
    undo: "Undone: put back as it was. The rule's disagreement is recorded.",
    acknowledge: "Got it. The receipt is filed.",
  };
  const RESULT_KIND = { undo: "undone", acknowledge: "acknowledged" };
  const AWAITS = { draft_outcome: "redraft", owner_review: "owner turn", owner_waiting: "owner turn", chore: "superintendent" };
  const AWAITING_ASK = {
    redraft: "Nothing for now: your feedback is waiting for its redraft.",
    "owner turn": "Nothing for now: your feedback is waiting for the owner's next turn.",
    superintendent: "Nothing for now: the Superintendent has your feedback and acts on the task.",
  };
  const REDRAFTING = "Your feedback is waiting for its redraft on the next supervisor tick; the fresh draft comes back here.";
  const WORKING = {
    working_marked: "Marked: you're working on this.",
    working_cleared: "Cleared: you're no longer marked as working on this.",
    working_unchanged: "Nothing changed.",
  };
  const settle = it => items.splice(items.indexOf(it), 1);
  const words = s => String(s ?? "").split(/\s+/).filter(Boolean).join(" ");

  /* one act, as tycho/tools/fake_intrinsic.py `queue act` applies it */
  function apply(req, { checkRevision }) {
    const it = items.find(i => i.key === req.key);
    if (!it) return refuse("gone", "That item is no longer waiting on you.");
    if (checkRevision && req.revision !== it.revision) return refuse("stale", "This item changed since you opened it.");
    const action = req.action;

    if (action === "mark_working" || action === "clear_working") {
      let kind = "working_unchanged";
      if (action === "mark_working" && !it.working) { it.working = { since: now() }; it.workingCleared = null; kind = "working_marked"; }
      if (action === "clear_working" && (it.working || it.workingCleared)) { it.working = it.workingCleared = null; kind = "working_cleared"; }
      return { ok: true, result: { kind, message: WORKING[kind] } };
    }
    if (!it.actions.includes(action)) return refuse("unsupported", `${action} isn't something this item takes.`);
    if (req.attachments?.length) return refuse("demo", "Attachments aren't kept in the demo. Send it without them.");
    if (action === "interactive" || action === "handback") return refuse("demo", "Not in the demo: there is no agent session to open.");

    if (action === "block" || action === "unblock") {
      if (action === "unblock") {
        if (!it.blocked) return { ok: true, result: { kind: "unblocked", message: "Nothing to unblock: this is not blocked." } };
        it.blocked = null;
        it.notes = it.notes.filter(n => !n.startsWith("Blocked: "));
        it.actions = it.actions.filter(a => a !== "unblock");
        return { ok: true, result: { kind: "unblocked", message: "Unblocked." } };
      }
      const by = req.blockedBy, text = req.text;
      if ((by == null) === (text == null)) return refuse("invalid", "A block needs exactly one of blockedBy (the task or outcome it waits on) or text (why it is blocked).");
      if (by != null) {
        if (by === it.blockerId) return refuse("invalid", "An item cannot be blocked by itself.");
        if (!items.some(i => i.blockerId === by)) return refuse("invalid", `There is no task or outcome ${by}.`);
        settle(it);
        return { ok: true, result: { kind: "blocked_by", message: `Blocked by ${by}: this leaves the deck and comes back when ${by} is done or accepted.` } };
      }
      const reason = words(text);
      if (!reason) return refuse("invalid", "Say what it is blocked on.");
      if (reason.length > 281) return refuse("invalid", `A block reason is at most 281 characters (this one is ${reason.length}); shorten it.`);
      it.blocked = { reason, since: now() };
      it.notes = [`Blocked: ${reason}`, ...it.notes.filter(n => !n.startsWith("Blocked: "))];
      if (!it.actions.includes("unblock")) it.actions = [...it.actions, "unblock"];
      return { ok: true, result: { kind: "blocked", message: "Blocked. It stays on the deck with your reason until you unblock it." } };
    }

    if (action === "accept" || action === "park") {
      if (action === "accept" && (req.text != null || req.nextLook != null)) return refuse("invalid", "Accept takes no text; send only the key, revision and action.");
      if (action === "park" && !words(req.text)) return refuse("invalid", "Park needs a reason.");
      if (action === "park" && !words(req.nextLook)) return refuse("invalid", "Park needs a next look: a date, a file, or what to wait for.");
      const to = action === "accept" ? "accepted" : "parked";
      const doc = it.docs.find(d => d.role === "outcome");
      if (doc) docs[doc.path].set.status = to;
      settle(it);
      const receipt = { key: `owner-${action}-${it.key.split(":").pop()}`, from: "open", to, at: now(), decidedBy: "you" };
      return { ok: true, result: { kind: to, message: `${action === "accept" ? "Accepted" : "Parked"}: open → ${to}.`, receipt } };
    }
    if (req.nextLook != null) return refuse("invalid", "nextLook is taken only by park.");

    if (it.kind === "chore" && it.textMax && words(req.text).length > it.textMax) {
      return refuse("invalid", `A task note is at most ${it.textMax} characters (this one is ${words(req.text).length}); shorten it.`);
    }
    if (req.owner != null) {
      if (action !== "approve" || !it.ownerChoices) return refuse("invalid", "An owner is picked only when approving a draft; leave it out here.");
      if (!it.ownerChoices.includes(req.owner)) return refuse("invalid", `Unknown owner ${JSON.stringify(req.owner)}; pick one of: ${it.ownerChoices.join(", ")}.`);
    }
    if (req.repos != null && (action !== "approve" || !it.repoChoices)) return refuse("invalid", "Repos are picked only when approving a draft; leave them out here.");
    if (action === "approve" && it.repoChoices && req.repos != null) {
      const outside = req.repos.filter(r => !it.repoChoices.includes(r));
      if (!req.repos.length) return refuse("invalid", `Set repos: before approving. The project declares: ${it.repoChoices.join(", ")}.`);
      if (outside.length) return refuse("invalid", `Not approved: ${outside[0]} is not one of the project's repos.`);
    }

    let message = MESSAGES[action] || "Done.";
    if (action === "later") {
      const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(6, 0, 0, 0);
      it.deferred = { until: t.toISOString() };
    } else if (action === "feedback" && AWAITS[it.kind]) {
      const what = AWAITS[it.kind];
      it.awaiting = { answer: "feedback", what, since: now() };
      it.ask = AWAITING_ASK[what];
      it.actions = what === "redraft" ? ["later"] : it.actions.filter(a => a !== "feedback");
      if (what === "redraft") {
        for (const k of ["ownerChoices", "defaultOwner", "repoChoices", "defaultRepos", "blockMax"]) delete it[k];
        if (!it.notes.includes(REDRAFTING)) it.notes = [...it.notes, REDRAFTING];
      }
    } else {
      settle(it);
      if (action === "approve" && it.ownerChoices) {
        const chosen = req.owner || it.defaultOwner;
        const who = chosen.split("/")[1];
        message = `Approved ${it.key.split(":").pop()}; ${who[0].toUpperCase() + who.slice(1)} starts on the supervisor's next tick.`;
      } else if (it.kind === "decision") {
        message = action === "approve" ? "Answered yes. The Superintendent acts on it."
          : action === "reject" ? "Answered no. The Superintendent is told." : "Sent. The Superintendent reads your answer as written.";
      }
    }
    return { ok: true, result: { kind: RESULT_KIND[action] || action, message } };
  }

  /* the card as it was before its last act, so the Superintendent's UNDO can put it back */
  const undoable = new Map();
  function reopen(key) {
    const prior = undoable.get(key);
    if (!prior) return { ok: false, reason: "There's nothing to undo for that card." };
    undoable.delete(key);
    const i = items.findIndex(x => x.key === key);
    const restored = structuredClone(prior.snapshot);
    if (i >= 0) items[i] = restored; else items.splice(Math.min(prior.at, items.length), 0, restored);
    emit({ type: "act", key, action: "reopen", source: "superintendent", item: restored, at: now() });
    return { ok: true };
  }

  function act(req, source) {
    const before = items.find(i => i.key === req.key);
    const snapshot = before ? structuredClone(before) : null;
    const at = before ? items.indexOf(before) : -1;
    const out = apply(req, { checkRevision: source === "visitor" });
    if (out.ok) {
      if (snapshot) undoable.set(req.key, { snapshot, at });
      emit({ type: "act", key: req.key, action: req.action, source, text: req.text ?? null,
             result: out.result, item: snapshot, at: now() });
    }
    return out;
  }

  /* intake */
  const projectRef = v => {
    const want = String(v ?? "").trim().toLowerCase();
    return C.PROJECTS.find(p => want && (p.slug === want || p.ref === want))?.ref ?? null;
  };
  let notes = 0;
  function fileNote({ project, note, source = "intake", requestId }) {
    const ref = projectRef(project);
    if (!ref) return refuse("invalid", "pick a project — that one isn't a working project in the vault");
    if (typeof note !== "string" || !note.trim()) return refuse("invalid", "there's nothing to file — write the note");
    const id = String(requestId || `demo-${Date.now().toString(36)}-${++notes}`);
    const path = `${C.PROJECTS.find(p => p.ref === ref).relDir}/intake/${id}.md`;
    const again = filed.find(n => n.id === id);
    if (again) return { ok: true, path: again.path, rel: again.path.replace(/\.md$/, ""), project: again.project, requestId: id, id, existing: true };
    const entry = { id, project: ref, note, source, at: now(), path };
    filed.unshift(entry);
    emit({ type: "intake", id, project: ref, note, source, at: entry.at });
    return { ok: true, path, rel: path.replace(/\.md$/, ""), project: ref, requestId: id, id, existing: false };
  }

  const desk = {
    queue,
    items: () => items,
    act: ({ key, action, owner, text } = {}) =>
      act({ key, action, ...(owner != null ? { owner } : {}), ...(text != null ? { text } : {}) }, "superintendent"),
    fileIntake({ project, note, source = "superintendent" } = {}) {
      const out = fileNote({ project, note, source });
      return out.ok ? { ok: true, path: out.path, project: out.project, id: out.id } : out;
    },
    reopen,
    intake: () => filed.map(({ id, project, note, source, at }) => ({ id, project, note, source, at })),
    projects: C.PROJECTS,
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
  window.VISR_DEMO_DESK = desk;

  /* the rest of the desk */
  function board() {
    const at = new Date(Date.now() - 40_000);
    const q = queue();
    const view = {
      title: `IntrinsicOS status · updated ${at.toTimeString().slice(0, 5)}`,
      health: ["✅ Supervisor ticking every 1m", "✅ Bridge up", "✅ Dead-man pinged"],
      sections: [
        { title: "Active (2)", items: ["• `nw-launch-checklist` — agent/birch turn, 12m",
                                       "• `lan-sonar-tuning` — agent/cedar, waiting on you"] },
        { title: `Waiting on you (${q.counts.active})`,
          items: q.items.filter(i => i.lane !== "happened" && !i.deferred).slice(0, 4).map(i => `• ${i.title}`) },
      ],
      review: "-# Review and act in VISR.",
      usage: ["Agents 34% of 40% target (read 2m ago)"],
      connectivity: ["Chat ✅ delivered 1m ago", "Cloud snapshot ✅ published 12m ago"],
      footer: "-# Edited in place by the supervisor each minute. Demo: invented figures.",
      weekly: { known: true, value: {
        since: ago(60 * 24 * 7), days: 7,
        ownerTurnsPerTouch: { ownerTurns: 17, touches: 5, ratio: 3.4 },
        judgmentShare: { decideActs: 31, acts: 50, share: 0.62 },
        acceptedByCategory: { meta: 0, engine: 2, bets: 1, other: 0 },
        cardToDecision: { medianSeconds: 11400, decisions: 29 },
        approvedWithoutRun: { hours: 72, count: 0, outcomeIds: [] },
        standingByRule: [{ ruleId: "R2", applied: 4, undone: 1 }],
      } },
    };
    return { ok: true, renderedAt: at.toISOString(), view,
      content: [view.title, view.health.join(" · "), ...view.sections.flatMap(s => [s.title, ...s.items])].join("\n") };
  }

  function monday(want) {
    const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const date = d.toISOString().slice(0, 10);
    if (want && want !== date) return refuse("not_found", `No Monday meeting is recorded for ${want}.`);
    const plus = n => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    const today = new Date().toISOString().slice(0, 10);
    const actions = [
      { dri: "you", due: plus(2), text: "Send Northwind the redirect list to confirm", ref: "task:nw-12", reported: false, proof: null },
      { dri: "agent/birch", due: plus(1), text: "Bring the launch checklist to review", ref: "outcome:nw-launch-checklist",
        reported: true, proof: { kind: "checkpoint", at: ago(60 * 5), detail: "ready_for_review" } },
      { dri: "agent/cedar", due: plus(4), text: "Tune the sonar against the tank's known depth", ref: "outcome:lan-sonar-tuning", reported: false, proof: null },
    ].map(a => ({ ...a, done: Boolean(a.proof || a.reported), overdue: !(a.proof || a.reported) && a.due < today }));
    return { ok: true, today, date, dates: [date], previous: null, next: null,
      path: `Projects/meta/monday/${date}.md`,
      note: { lines: 5, writtenAt: d.toISOString(),
        markdown: "**Northwind launches this week.** The checklist is with you for acceptance.\n- Orchard's planner draft is waiting on one frost-date question.\n- Lanternfish's depth tuning waits on your answer about the tank test.\n\nFocus this week: launch Northwind, approve or reshape the Orchard planner." },
      actions, actionsWrittenAt: d.toISOString(), problems: [] };
  }

  /* an evidence image: a drawn placeholder (the corpus has no real screenshots) */
  const artifact = ref => {
    const name = String(ref).split("/").pop();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="260" viewBox="0 0 390 260">`
      + `<rect width="390" height="260" fill="#0d1218"/><rect x="24" y="24" width="342" height="212" fill="none" stroke="#2a3a44"/>`
      + [56, 84, 112, 140, 168].map((y, i) => `<rect x="44" y="${y}" width="${[220, 260, 180, 240, 150][i]}" height="10" fill="#2a3a44"/>`
        + `<rect x="${330}" y="${y}" width="16" height="10" fill="#6ee7a0"/>`).join("")
      + `<text x="44" y="214" fill="#6b8798" font-family="monospace" font-size="12">${name.replace(/[<&]/g, "")} · demo image</text></svg>`;
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
  };

  /* -- 3. routing -------------------------------------------------------------------- */
  async function supt(url, method, body) {
    const S = window.VISR_DEMO_SUPT;
    if (!S || typeof S.answer !== "function") {
      return refuse("unsupported", "The scripted Superintendent isn't loaded in this copy of the demo.");
    }
    return S.answer(url.pathname + url.search, method, body, desk);
  }

  async function answer(url, method, body) {
    const path = url.pathname;
    const q = url.searchParams;
    if (path === "/health") return { ok: true, service: "demo" };
    if (path.startsWith("/api/superintendent/")) return supt(url, method, body);
    if (method === "GET") {
      switch (path) {
        case "/api/review": return queue();
        case "/api/review/artifact": return artifact(q.get("ref") || "");
        case "/api/review/reach": return refuse("demo", "Links aren't checked in the demo.");
        case "/api/telemetry": return board();
        case "/api/monday": return monday(q.get("date"));
        case "/api/settings": return refuse("unsupported", DEMO);
        case "/api/voice/recordings": return { ok: true, recordings: [] };
        case "/api/push/key": return refuse("unsupported", "Notifications aren't part of the demo.");
      }
      return refuse("not_found", `${path} isn't part of the demo.`);
    }
    switch (path) {
      case "/api/log": return { ok: true, wrote: 0, dropped: 0 };
      case "/api/review":
        if (body.verb !== "act") return refuse("invalid", `unknown review verb ${JSON.stringify(body.verb)}`);
        return act(body, "visitor");
      case "/api/doc":
        if (body.verb === "read") return docRead(body);
        if (body.verb === "save") return docSave(body);
        if (body.verb === "list") return refuse("demo", "The demo has no folders to browse.");
        return refuse("invalid", `unknown doc verb ${JSON.stringify(body.verb)}`);
      case "/api/intake":
        if (body.verb === "projects") return { ok: true, projects: C.PROJECTS, vaultName: "demo" };
        if (body.verb === "file") {
          if (body.attachments?.length) return refuse("demo", "Attachments aren't kept in the demo. File the note without them.");
          return fileNote({ project: body.project, note: body.note, source: "intake", requestId: body.requestId });
        }
        return refuse("invalid", `unknown intake verb ${JSON.stringify(body.verb)}`);
      case "/api/stop": return refuse("demo", "There is nothing to stop in the demo: no agents are running.");
      case "/api/settings": return refuse("unsupported", DEMO);
      case "/api/upload/discard": return { ok: true };
      case "/api/voice/dictate":
      case "/api/voice/recover":
      case "/api/voice/forget": return refuse("demo", "Dictation isn't part of the demo.");
    }
    if (path.startsWith("/api/push/")) return refuse("unsupported", "Notifications aren't part of the demo.");
    return refuse("not_found", `${path} isn't part of the demo.`);
  }

  const ours = url => url.origin === location.origin && (url.pathname === "/health" || url.pathname.startsWith("/api/"));
  const toResponse = out => {
    if (out instanceof Response) return out;
    const body = out && typeof out === "object" ? out : { ok: false, reason: "No answer." };
    if (!body.ok && body.reason && !body.error) body.error = body.reason;
    return new Response(JSON.stringify(body), { status: body.ok ? 200 : 400,
      headers: { "Content-Type": "application/json" } });
  };
  const pause = () => new Promise(r => setTimeout(r, 90 + Math.random() * 180));
  const parse = text => {
    if (typeof text !== "string" || !text) return {};
    try { const v = JSON.parse(text); return v && typeof v === "object" ? v : {}; } catch { return {}; }
  };

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const req = input instanceof Request ? input : null;
    const url = new URL(req ? req.url : String(input), location.href);
    if (url.protocol === "data:" || url.protocol === "blob:") return realFetch(input, init);
    if (url.origin !== location.origin) throw new TypeError(`The demo makes no requests to other sites (${url.origin}).`);
    if (!ours(url)) return realFetch(input, init);
    const signal = init.signal || req?.signal;
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const method = String(init.method || req?.method || "GET").toUpperCase();
    const body = method === "GET" ? {} : parse(typeof init.body === "string" ? init.body : req ? await req.clone().text() : "");
    await pause();
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    let out;
    try { out = await answer(url, method, body); }
    catch (e) { console.warn("demo: a route failed", url.pathname, e); out = refuse("demo", "The demo couldn't answer that."); }
    return toResponse(out);
  };

  /* uploads (review/wire.js) are XHR, for their progress events: refused here */
  const RealXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = class extends RealXHR {
    open(method, url, ...rest) {
      const u = new URL(url, location.href);
      this._demo = ours(u) || u.origin !== location.origin;
      return super.open(method, this._demo ? "about:blank" : url, ...rest);
    }
    setRequestHeader(k, v) { if (!this._demo) super.setRequestHeader(k, v); }
    send(body) {
      if (!this._demo) return super.send(body);
      const text = JSON.stringify(refuse("demo", "Attachments aren't kept in the demo."));
      Object.defineProperty(this, "readyState", { value: 4 });
      Object.defineProperty(this, "status", { value: 400 });
      Object.defineProperty(this, "statusText", { value: "Bad Request" });
      Object.defineProperty(this, "responseText", { value: text });
      Object.defineProperty(this, "response", { value: text });
      setTimeout(() => {
        this.onload?.(new ProgressEvent("load"));
        this.dispatchEvent(new ProgressEvent("loadend"));
      }, 150);
    }
  };

  /* the event log's last batch on the way out */
  if (navigator.sendBeacon) {
    const realBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => {
      const u = new URL(url, location.href);
      return ours(u) || u.origin !== location.origin ? true : realBeacon(url, data);
    };
  }

  /* no service worker: an offline cache under the site's origin would outlive the page */
  if (window.ServiceWorkerContainer) {
    ServiceWorkerContainer.prototype.register = () => Promise.resolve(undefined);
  }
})();
