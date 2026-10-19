/* VISR DEMO · the mock server.

   The real desk talks to the Tycho server over `/api/*`, which relays the
   IntrinsicOS CLI (review.py, docs.py, telemetry.py…). This script is loaded
   before the kernel and wraps `fetch`, XHR (the upload) and `sendBeacon` (the
   event log), so every one of those calls is answered here, from memory,
   against the invented queue in demo/corpus.js. Nothing leaves the page: a
   URL this shim does not recognise falls through to the real `fetch`, and the
   shell only ever asks for its own static files that way.

   The contract mirrored is the review desk's (`{ok:true, …}` or `{ok:false,
   reason, code}`), so the shell runs byte-for-byte unmodified. Acts move the
   in-memory queue and last until the page is reloaded. There is no action
   token here (nothing is ever 401), the service worker never registers, and
   anything that needs the Mac — attachments, dictation, the stop switch,
   settings — refuses in the desk's own voice. */
"use strict";

(function () {
  const C = window.VISR_DEMO_CORPUS;
  if (!C) throw new Error("demo/corpus.js must load before demo/shim.js");
  const { ago } = C;
  const items = C.ITEMS.map(i => structuredClone(i));
  const docs = Object.fromEntries(Object.entries(C.DOCS).map(([p, d]) =>
    [p, { ...d, fingerprint: "demo-1", set: {} }]));
  let edits = 1;

  const DEMO_REASON = "Not in the demo: this needs the real Mac behind VISR.";
  const refuse = (code, reason) => ({ ok: false, code, reason });

  /* -- documents ------------------------------------------------------------ */
  const fieldsOf = d => d.fields().map(f => (f.key in d.set ? { ...f, value: d.set[f.key] } : f));
  const docEntry = path => ({ path, role: docs[path].role, title: docs[path].title,
    fingerprint: docs[path].fingerprint, fields: fieldsOf(docs[path]) });
  const resyncDocs = () => { for (const it of items) it.docs = it.docs.map(d => docEntry(d.path)); };

  function docRead(req) {
    const d = docs[req.path];
    if (!d) return refuse("gone", `${req.path} isn't in the demo vault.`);
    return { ok: true, path: req.path, text: d.text, fingerprint: d.fingerprint, fields: fieldsOf(d) };
  }
  function docSave(req) {
    const d = docs[req.path];
    if (!d) return refuse("gone", `${req.path} isn't in the demo vault.`);
    if (req.fingerprint !== d.fingerprint) return refuse("stale", "This document changed since you opened it.");
    let notes;
    if (req.set && typeof req.set === "object") {
      Object.assign(d.set, req.set);
      notes = ["Saved the fields. Every other line of the document is unchanged."];
    } else {
      const text = String(req.text ?? "");
      if (!text.startsWith("---\n")) return refuse("invalid", "An outcome document must start with its front matter.");
      d.text = text;
      notes = ["Saved in this tab only (demo). The owner would continue on this version at its next turn."];
    }
    d.fingerprint = `demo-${++edits}`;
    resyncDocs();
    return { ok: true, path: req.path, fingerprint: d.fingerprint, notes };
  }

  /* -- the queue -------------------------------------------------------------- */
  const AWAITS = { draft_outcome: "redraft", owner_review: "owner turn", chore: "manager" };
  const AWAITING_ASK = {
    redraft: "Nothing for now: your feedback is waiting for its redraft.",
    "owner turn": "Nothing for now: your feedback is waiting for the owner's next turn.",
    manager: "Nothing for now: the manager has your feedback and acts on the task.",
  };
  const MESSAGES = {
    approve: "Approved. The owner starts on its next tick.",
    reject: "Refused. The drafter is told why.",
    feedback: "Feedback recorded. The owner reads it on its next turn.",
    later: "Filed for later. It comes back tomorrow at 06:00.",
    done: "Marked done. The task moved to tasks/done.",
    accept: "Accepted: open → accepted, with a receipt.",
    park: "Parked. It comes back when you said to look again.",
    route: "Routed to an owner. It leaves Linear's queue for the vault.",
    undo: "Undone: the due date is back where it was.",
    acknowledge: "Got it. The receipt is filed.",
    not_needed: "Closed as not needed.",
    mark_working: "Marked: you're on it.",
    clear_working: "Cleared your working mark.",
  };
  const bump = it => { const [id, r] = it.revision.split(":r"); it.revision = `${id}:r${Number(r) + 1}`; };

  function queue() {
    const waiting = items.filter(i => i.lane !== "happened");
    const later = waiting.filter(i => i.deferred);
    return { ok: true, generatedAt: new Date().toISOString(), reviewUrl: null,
      counts: { active: waiting.length - later.length, later: later.length,
                working: waiting.filter(i => i.working).length },
      unknown: [], projects: C.PROJECTS,
      items: [...items].sort((a, b) => !a.working - !b.working), happened: C.HAPPENED };
  }

  function act(req) {
    const it = items.find(i => i.key === req.key);
    if (!it) return refuse("gone", "That item is no longer waiting on you.");
    if (req.revision !== it.revision) return refuse("stale", "This item changed since you opened it.");
    const action = req.action;
    if (action === "mark_working" || action === "clear_working") {
      it.working = action === "mark_working" ? { since: new Date().toISOString(), by: "you" } : null;
      return { ok: true, result: { kind: action, message: MESSAGES[action] } };
    }
    if (!it.actions.includes(action)) return refuse("unsupported", `${action} isn't something this item takes.`);
    if (req.attachments?.length) return refuse("demo", DEMO_REASON);
    let message = MESSAGES[action] || "Done.";
    if (action === "later") {
      const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(6, 0, 0, 0);
      it.deferred = { until: t.toISOString() };
      bump(it);
    } else if (action === "feedback" && AWAITS[it.kind]) {
      const what = AWAITS[it.kind];
      it.awaiting = { answer: "feedback", what, since: new Date().toISOString() };
      it.ask = AWAITING_ASK[what];
      it.actions = what === "redraft" ? ["later"] : it.actions.filter(a => a !== "feedback");
      bump(it);
    } else {
      items.splice(items.indexOf(it), 1);
      if (action === "approve" && it.ownerChoices) {
        const owner = req.owner || it.defaultOwner;
        message = `Approved ${it.key.split(":").pop()}; ${owner.split("/")[1]} starts on the supervisor's next tick.`;
      }
      if (action === "feedback") message = "Sent. It leaves your deck.";
      if (it.kind === "decision") message = action === "approve" ? "Answered yes. The manager acts on it." : action === "reject" ? "Answered no. The manager is told." : message;
    }
    return { ok: true, result: { kind: action, message: `${message} (Demo: nothing was sent anywhere.)` } };
  }

  /* -- the rest of the desk ---------------------------------------------------- */
  function board() {
    const at = new Date(Date.now() - 40_000);
    const clock = at.toTimeString().slice(0, 5);
    const view = {
      title: `IntrinsicOS status · updated ${clock}`,
      health: ["✅ Supervisor ticking every 1m", "✅ Bridge up", "✅ Dead-man pinged", "STOP released"],
      sections: [
        { title: "Active (2)", items: ["• `nw-launch-checklist` — agent/birch turn, 12m",
                                       "• `lan-depth-calibration` — agent/cedar turn, 3m"] },
        { title: `Waiting on you (${queue().counts.active})`, items: items.filter(i => i.lane !== "happened")
            .slice(0, 4).map(i => `• ${i.title}`) },
      ],
      review: "-# Review and act in VISR.",
      usage: ["Agents 34% of 40% target (read 2m ago)"],
      connectivity: ["Chat ✅ delivered 1m ago", "Push ✅ delivered 3h ago",
                     "Cloud snapshot ✅ published 12m ago"],
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
      content: [view.title, ...view.health, ...view.sections.flatMap(s => [s.title, ...s.items])].join("\n") };
  }

  function monday() {
    const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const day = d.toISOString().slice(0, 10);
    const plus = n => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    return { ok: true, today: new Date().toISOString().slice(0, 10), date: day, dates: [day],
      previous: null, next: null, path: `Projects/meta/docs/monday/${day}.md`,
      note: { lines: 5, writtenAt: d.toISOString(),
        markdown: "**Northwind launches this week.** The checklist is with you for acceptance.\n- Orchard's planner draft is waiting on one frost-date question.\n- Lanternfish's depth calibration is two turns from review.\n\nFocus this week: launch Northwind, approve or reshape the Orchard planner." },
      actions: [
        { dri: "you", due: plus(2), text: "Send Northwind the redirect list to confirm", ref: "task:nw-12",
          reported: false, proof: null, done: false, overdue: false },
        { dri: "agent/birch", due: plus(1), text: "Bring the launch checklist to review", ref: "outcome:nw-launch-checklist",
          reported: true, proof: { kind: "checkpoint", at: ago(60 * 5), detail: "ready_for_review" }, done: true, overdue: false },
        { dri: "agent/cedar", due: plus(4), text: "Calibrate the sonar against the dock's known depth", ref: null,
          reported: false, proof: null, done: false, overdue: false },
      ] };
  }

  const PROJECTS = [
    { category: "engine", ref: "engine/northwind", name: "Northwind" },
    { category: "bets", ref: "bets/orchard", name: "Orchard" },
    { category: "bets", ref: "bets/lanternfish", name: "Lanternfish" },
  ];

  /* -- routing ------------------------------------------------------------------ */
  const PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="240"><rect width="100%" height="100%" fill="#0d1218"/><text x="50%" y="50%" fill="#6b8798" font-family="monospace" font-size="14" text-anchor="middle">demo image</text></svg>`;

  async function answer(url, init) {
    const path = url.pathname;
    const method = (init?.method || "GET").toUpperCase();
    let body = {};
    if (typeof init?.body === "string") { try { body = JSON.parse(init.body); } catch { body = {}; } }
    if (path === "/health") return { ok: true };
    if (path === "/api/log") return { ok: true };
    if (path === "/api/review" && method === "GET") return queue();
    if (path === "/api/review" && body.verb === "act") return act(body);
    if (path === "/api/review/reach") return { ok: true, reachable: true, status: 200 };
    if (path === "/api/review/artifact") return new Response(PLACEHOLDER, { headers: { "Content-Type": "image/svg+xml" } });
    if (path === "/api/doc" && body.verb === "read") return docRead(body);
    if (path === "/api/doc" && body.verb === "save") return docSave(body);
    if (path === "/api/telemetry") return board();
    if (path === "/api/monday") return monday();
    if (path === "/api/intake" && body.verb === "projects") return { ok: true, projects: PROJECTS };
    if (path === "/api/intake" && body.verb === "file") {
      if (!String(body.note || "").trim()) return refuse("invalid", "Nothing to file: the note is empty.");
      return { ok: true, project: body.project, requestId: body.requestId, existing: false,
        path: `Projects/${body.project}/intake/${body.requestId || "note"}.md (demo: kept nowhere)` };
    }
    if (path === "/api/settings") return refuse("unsupported", DEMO_REASON);
    if (path === "/api/stop") return refuse("demo", "There is nothing to stop in the demo: no agents are running.");
    if (path.startsWith("/api/voice") || path.startsWith("/api/upload")) return refuse("demo", DEMO_REASON);
    return refuse("demo", DEMO_REASON);
  }

  const handled = url => url.origin === location.origin && (url.pathname === "/health" || url.pathname.startsWith("/api/"));
  const toResponse = out => out instanceof Response ? out
    : new Response(JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json" } });
  const pause = () => new Promise(r => setTimeout(r, 120 + Math.random() * 220));

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input.url, location.href);
    if (!handled(url)) return realFetch(input, init);
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await pause();
    return toResponse(await answer(url, init));
  };

  /* the upload (review/wire.js) is XHR, for its progress events */
  const RealXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = class extends RealXHR {
    open(method, url, ...rest) { this._demo = handled(new URL(url, location.href)); return super.open(method, url, ...rest); }
    setRequestHeader(k, v) { if (!this._demo) super.setRequestHeader(k, v); }
    send(body) {
      if (!this._demo) return super.send(body);
      const text = JSON.stringify(refuse("demo", "Attachments aren't kept in the demo."));
      Object.defineProperty(this, "status", { value: 200 });
      Object.defineProperty(this, "statusText", { value: "OK" });
      Object.defineProperty(this, "responseText", { value: text });
      setTimeout(() => { this.onload?.(); this.dispatchEvent(new Event("loadend")); }, 200);
    }
  };

  /* the event log's last batch on the way out */
  if (navigator.sendBeacon) {
    const realBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => handled(new URL(url, location.href)) ? true : realBeacon(url, data);
  }

  /* no service worker: an offline cache under the site's origin would outlive the page */
  if (window.ServiceWorkerContainer) {
    ServiceWorkerContainer.prototype.register = () => Promise.resolve(undefined);
  }
})();
