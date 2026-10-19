/* REVIEW · format — how the contract's words read on screen. No logic here
   beyond naming: kinds, verbs, projects and ages, in the fewest characters. */
"use strict";

const Fmt = {
  KINDS: {
    draft_outcome: "DRAFT OUTCOME",
    owner_review: "OWNER · READY",
    owner_waiting: "OWNER · WAITING",
    owner_unstarted: "OWNER · NOT STARTED",
    owner_interrupted: "OWNER · INTERRUPTED",
    status_request: "STATUS REQUEST",
    proposal: "PROPOSAL",
    decision: "DECISION",
    chore: "CHORE",
    linear: "LINEAR",
    calibration: "CALIBRATION",
    receipt: "RECEIPT",
    owner_release: "RELEASED",
    standing_edit: "RULES EDITED",
    rule_proposal: "RULE PROPOSAL",
  },
  kind: item => Fmt.KINDS[item?.kind] || String(item?.kind || "ITEM").toUpperCase(),

  /* where a draft came from (the contract's `origin`): only the strategist is
     worth a tag, so Asher sees at a glance what it put in his queue; a
     drafter correction of its pitch adds REDRAFT. Nothing for the drafter, a
     hand-written draft, or a runtime from before `origin` */
  origin: item => item?.kind === "draft_outcome" && item.origin === "strategist"
    ? (item.redrafted ? "STRATEGIST · REDRAFT" : "STRATEGIST") : "",

  VERBS: { approve: "APPROVE", reject: "REFUSE", feedback: "FEEDBACK", later: "LATER", done: "DONE",
           accept: "ACCEPT", park: "PARK", interactive: "OPEN INTERACTIVE", handback: "HAND BACK", route: "ROUTE TO OWNER", refresh: "REFRESH",
           undo: "UNDO", acknowledge: "GOT IT", not_needed: "NOT NEEDED" },
  verb: a => Fmt.VERBS[a] || String(a).toUpperCase().replace(/_/g, " "),

  /* a kind whose verbs read differently: an edit to his rules file is kept
     as his own or reverted (src/standing/README.md) */
  KIND_VERBS: { standing_edit: { approve: "KEEP AS MINE", reject: "REVERT" } },
  verbFor: (item, a) => Fmt.KIND_VERBS[item?.kind]?.[a] || Fmt.verb(a),

  /* the standing rule(s) behind a receipt: "R1 · My words decide". The
     runtime (read-receipts.ts) writes them as an "Under" markdown block, one
     "- R1 · sentence" line each; a `rule` field ({ ids, names }), a `rule`
     facts row or a note naming it are read too. Empty when none is named. */
  rule(item) {
    const under = (item?.content || []).find(b => b.type === "markdown" && /^under$/i.test(String(b.title || "")));
    if (under) {
      const rules = String(under.text || "").split("\n").map(l => l.replace(/^\s*[-*]\s*/, "").trim()).filter(Boolean);
      if (rules.length) return rules.join("; ");
    }
    const r = item?.rule;
    if (r && Array.isArray(r.ids) && r.ids.length)
      return r.ids.map((id, i) => [id, r.names?.[i]].filter(Boolean).join(" · ")).join("; ");
    const row = (item?.content || []).flatMap(b => b.type === "facts" ? b.rows || [] : [])
      .find(([k]) => /^rules?$/i.test(String(k)));
    if (row) return String(row[1]);
    const note = (item?.notes || []).map(String).find(n => /^(?:by )?rules?\b/i.test(n));
    return note ? note.replace(/^(?:by )?rules?\s*:?\s*/i, "") : "";
  },

  /* the queue's `projects` map (category/slug → the brief's name), set by App when a read
     lands; a project it lacks falls back to its slug: "bets/liturgos" → "LITURGOS" */
  names: {},
  project: p => (Fmt.names[p] || String(p || "").split("/").pop().replace(/-/g, " ")).toUpperCase(),

  age(since) {
    const t = Date.parse(since || "");
    if (!Number.isFinite(t)) return "";
    const m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 60) return `${m}M`;
    const h = Math.round(m / 60);
    return h < 48 ? `${h}H` : `${Math.round(h / 24)}D`;
  },

  /* where the runtime takes files (src/review/act.ts takesUploads): feedback
     on a draft or an owner's work, and refusing a draft. Anywhere else it
     refuses the whole act, so the tray is not offered. */
  takesFiles: (item, action) =>
    (item.kind === "draft_outcome" && (action === "feedback" || action === "reject")) ||
    ((item.kind === "owner_review" || item.kind === "owner_waiting") && action === "feedback"),

  /* kind · origin · project · age, the footnote every card and the desk start with */
  meta: item => [Fmt.kind(item), Fmt.origin(item), Fmt.project(item.project), Fmt.age(item.since)]
    .filter(Boolean).join(" · "),

  /* the thing to decide, in the brief's words when it has them; while a new
     brief is written, the previous revision's */
  question: item => item.brief?.state === "ready" && item.brief.brief?.question
    ? item.brief.brief.question : (item.brief?.previous?.question || item.ask || item.title || item.key),

  /* Asher already answered and the item waits on the system (the contract's
     `awaiting`): the short mark for a status line and the sentence that
     replaces the question. Null when it waits on him, or the runtime is too
     old to say. */
  AWAITING: {
    redraft: ["REDRAFT PENDING", "Your feedback is with the drafter. The redraft comes back here."],
    "owner turn": ["OWNER TURN PENDING", "Your feedback is with the owner. Its next turn comes back here."],
    superintendent: ["WITH SUPERINTENDENT", "Superintendent has your feedback and acts on the task."],
  },
  awaiting(item) {
    const a = item?.awaiting;
    if (!a || typeof a !== "object") return null;
    const [what, line] = Fmt.AWAITING[a.what] || [String(a.what || "SYSTEM").toUpperCase() + " PENDING", "Your answer is with the system; it comes back here."];
    const sent = a.answer === "feedback" ? "FEEDBACK SENT" : `${Fmt.verb(a.answer || "answer")} SENT`;
    return { mark: `${sent} · ${what}`, line };
  },

  until(d) {
    const t = new Date(d || "");
    return Number.isFinite(t.getTime())
      ? t.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }).toUpperCase()
      : "";
  },

  /* a calendar date, "2026-10-07" → "7 OCT"; a bare date is read as local,
     so it never slips a day west of UTC */
  day(d) {
    const s = String(d || "");
    const t = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00:00") : new Date(s);
    return Number.isFinite(t.getTime())
      ? `${t.getDate()} ${t.toLocaleDateString("en", { month: "short" }).toUpperCase()}` : "";
  },

  /* a moment, as a wall clock: "2:14 PM" today, "6 OCT 2:14 PM" another day */
  clock(d) {
    const t = new Date(d || "");
    if (!Number.isFinite(t.getTime())) return "";
    const time = t.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" }).toUpperCase();
    return t.toDateString() === new Date().toDateString() ? time : `${Fmt.day(t)} ${time}`;
  },

  /* the due date the item's task carries, if any (a readonly doc field) */
  due: item => (item.docs || []).flatMap(d => d.fields || []).find(f => f.key === "due" && f.value)?.value || "",

  size(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  },
};
