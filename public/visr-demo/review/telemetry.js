/* REVIEW · telemetry — the board the supervisor keeps, opened from home's menu.

   The #telemetry status board the supervisor last rendered (`intrinsic
   telemetry board`, relayed by tycho/telemetry.py), the same lines laid out
   for reading under the shared top bar (topbar.js): the board's title and how
   long ago it was rendered, its health line, then its sections (what is
   active, what waits on Asher), THIS WEEK (the week in numbers, `Weekly` below,
   when the board carries it), usage and connectivity. Read again every
   minute while open, and on a return to the app. `#board` opens it from a
   link (deeplink.js).

   A phone reads it in one column; a landscape tablet sets the sections in
   two. If the board stopped moving, or the latest read failed, it says so
   over the last board it had.

   The board's lines carry Discord marks: a leading `• ` or `-#` is dropped,
   `**` is dropped, `code`, <https://…> links and email addresses (a tap
   copies, email.js) are kept as nodes (never HTML), and a leading emoji (☑️ 📥 🔍 ✅) stays, since it says the kind.

     const v = Telemetry.render({ back });   // v.el · v.page · v.dispose() */
"use strict";

const Telemetry = {
  REFRESH_MS: 60_000,
  /* the supervisor edits its board about once a minute; older than this and
     the board says the supervisor may have stopped */
  STALE_MS: 5 * 60_000,

  render(ctl) {
    const box = T.el("div", { class: "t-tele" });
    const page = T.el("div", { class: "t-telemetry-page" }, T.el("div", { class: "t-telemetry-inner" }, box));
    const el = T.el("section", { class: "t-telemetry", "data-pid": "telemetry" },
      TopBar.render({ title: "Telemetry", back: () => ctl.back() }), page);

    /* `local`: a stop this device engaged, shown until the board catches up */
    let board = null, fault = null, at = 0, alive = true, local = null;
    const engaged = out => { local = out; draw(); read(); };
    const draw = () => box.replaceChildren(...Telemetry.block(board, fault),
      Panic.row(Panic.state(board, local), { engaged }));
    /* one read at a time; a tick or a return while one is out joins it */
    let reading = null;
    const read = () => reading ||= (async () => {
      at = Date.now();
      try { board = await Wire.telemetry(); fault = null; }
      catch (e) { fault = e; }
      if (alive) draw();
    })().finally(() => { reading = null; });

    box.replaceChildren(T.el("p", { class: "dim" }, "Reading the board…"));
    read();
    /* the age line moves between reads; a read every minute while open */
    const timer = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      if (Date.now() - at >= Telemetry.REFRESH_MS) read(); else if (board) draw();
    }, 15_000);
    const resume = () => { if (alive && document.visibilityState === "visible" && Date.now() - at >= 5_000) read(); };
    document.addEventListener("visibilitychange", resume);

    return {
      el, page,
      dispose() { alive = false; clearInterval(timer); document.removeEventListener("visibilitychange", resume); },
    };
  },

  block(board, fault) {
    if (!board) return [T.el("div", { class: "t-note amber" }, T.el("div", { class: "t-label" }, "BOARD UNAVAILABLE"),
      T.el("p", {}, String(fault?.message || "No status board yet.")))];
    const v = board.view || {};
    const age = Date.now() - Date.parse(board.renderedAt || "");
    const ago = Number.isFinite(age) ? this.span(age) : null;
    const out = [T.el("div", { class: "t-tele-head" },
      T.el("h1", { class: "t-title t-tele-title" }, this.inline(v.title || "")),
      T.el("div", { class: "t-foot" }, ago ? `RENDERED ${ago} AGO` : "RENDER TIME UNKNOWN"))];
    if (fault) out.push(T.el("div", { class: "t-note amber" }, T.el("div", { class: "t-label" }, "LAST READ FAILED"),
      T.el("p", {}, `${fault.message} This is the board from before.`)));
    if (!ago || age > this.STALE_MS) out.push(T.el("div", { class: "t-note amber" },
      T.el("div", { class: "t-label" }, "THE BOARD HAS STOPPED MOVING"),
      T.el("p", {}, "The supervisor edits it each minute. It may have stopped.")));
    out.push(this.list("t-tele-health", v.health));
    const sec = (title, lines) => T.el("section", { class: "t-tele-sec" }, T.el("div", { class: "t-label" }, title), this.list("", lines));
    /* the week in numbers (`Weekly`, below), when the board carries it */
    const week = Weekly.groups(v.weekly);
    out.push(T.el("div", { class: "t-tele-secs" },
      ...(v.sections || []).map(s => sec(this.plain(s.title), s.items)),
      week.length ? T.el("section", { class: "t-tele-sec t-tele-week" }, T.el("div", { class: "t-label" }, "THIS WEEK"),
        ...week.flatMap(g => [g.title ? T.el("div", { class: "t-foot" }, this.plain(g.title)) : null, this.list("", g.lines)])) : null,
      sec("USAGE", v.usage), sec("CONNECTIVITY", v.connectivity)));
    return out;
  },

  list(cls, lines) {
    return T.el("ul", { class: `t-list t-tele-list ${cls}`.trim() },
      ...(lines || []).map(line => T.el("li", {}, this.inline(line))));
  },

  /* the board's Discord marks, read as plain text: no bullet, no `-#`, no
     **; a leading emoji is the line's kind and stays */
  plain: text => String(text || "").replace(/^\s*(?:•|-#)\s*/, "").replace(/\*\*/g, ""),

  /* one line as nodes, never HTML: `code` spans and <https://…> links */
  inline(text) {
    const frag = document.createDocumentFragment();
    this.plain(text).split(/(`[^`]*`|<https?:\/\/[^>\s]+>)/).forEach(part => {
      if (!part) return;
      if (part.startsWith("`") && part.endsWith("`") && part.length > 1) frag.append(T.el("code", {}, part.slice(1, -1)));
      else if (/^<https?:\/\//.test(part)) {
        const url = part.slice(1, -1);
        frag.append(T.el("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, url));
      } else this.emails(frag, part);
    });
    return frag;
  },

  /* plain text, with each email address as a link a tap copies (email.js) */
  emails(frag, text) {
    let at = 0;
    for (const m of text.matchAll(Email.RE)) {
      frag.append(text.slice(at, m.index), Email.link(m[0]));
      at = m.index + m[0].length;
    }
    frag.append(text.slice(at));
  },

  span(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return `${s}S`;
    const m = Math.round(s / 60);
    return m < 60 ? `${m}M` : `${Math.round(m / 60)}H`;
  },
};

/* The board's week in numbers, as plain lines: the runtime's
   `BoardView.weekly` (intrinsicOS src/telemetry/weekly.ts), an
   Observation: `{ known: true, value: WeeklyView }` or `{ known: false,
   reason }`. A known week reads one line per number:
     Owner turns per touch: 0.6 (3 turns, 5 touches)
     Judgment share: 75% (3 of 4 acts)
     Accepted: meta 1 · engine 0 · bets 1 · other 1
     Card to decision: median 2h 0m (3 decisions)
     Approved, no run in 72h: 2 (vlt-idle, vlt-unrecorded)
     R1: applied 2, undone 1        (one per standing rule)
   An unknown week says why. Any other plain shape (lines, titled sections,
   named values) is read generically. Absent or empty, there is no THIS WEEK.

     Weekly.groups(weekly) → [{ title?, lines: [string] }]  ([] when none) */
const Weekly = {
  groups(w) {
    if (!w) return [];
    if (typeof w === "object" && !Array.isArray(w) && typeof w.known === "boolean")
      return w.known ? this.groups(w.value) : [{ lines: [`Not read: ${String(w.reason || "unknown")}`] }];
    if (typeof w === "object" && w.ownerTurnsPerTouch && typeof w.ownerTurnsPerTouch === "object") return [{ lines: this.view(w) }];
    if (Array.isArray(w)) {
      if (w.every(x => typeof x === "string")) return w.length ? [{ lines: w }] : [];
      return w.filter(s => s && typeof s === "object")
        .map(s => ({ title: s.title ? String(s.title) : "", lines: this.lines(s.items ?? s.lines ?? s) }))
        .filter(g => g.lines.length);
    }
    if (typeof w !== "object") return [];
    if (Array.isArray(w.sections)) return this.groups(w.sections);
    if (Array.isArray(w.lines)) return this.groups(w.lines);
    const lines = this.lines(w);
    return lines.length ? [{ lines }] : [];
  },

  /* a WeeklyView, number by number */
  view(v) {
    const n = (x, one, many) => `${x} ${x === 1 ? one : many}`;
    const t = v.ownerTurnsPerTouch || {}, j = v.judgmentShare || {}, c = v.cardToDecision || {}, a = v.approvedWithoutRun || {};
    const lines = [
      `Owner turns per touch: ${t.ratio ?? "none yet"} (${n(t.ownerTurns ?? 0, "turn", "turns")}, ${n(t.touches ?? 0, "touch", "touches")})`,
      `Judgment share: ${j.share == null ? "none yet" : `${Math.round(j.share * 100)}%`} (${j.decideActs ?? 0} of ${n(j.acts ?? 0, "act", "acts")})`,
      `Accepted: ${this.value(v.acceptedByCategory) || "none"}`,
      `Card to decision: ${c.medianSeconds == null ? "none recorded" : `median ${this.span(c.medianSeconds)}`} (${n(c.decisions ?? 0, "decision", "decisions")})`,
      `Approved, no run in ${a.hours ?? 72}h: ${a.count ?? 0}${a.outcomeIds?.length ? ` (${a.outcomeIds.join(", ")})` : ""}`,
    ];
    const rules = Array.isArray(v.standingByRule) ? v.standingByRule : [];
    if (!rules.length) lines.push("Standing rules: none applied");
    for (const r of rules) lines.push(`${r.ruleId}: applied ${r.applied ?? 0}, undone ${r.undone ?? 0}`);
    return lines;
  },

  /* seconds → "2h 10m", "4m", "30s" */
  span(sec) {
    const s = Math.round(Number(sec) || 0);
    if (s < 60) return `${s}s`;
    const m = Math.round(s / 60);
    return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
  },

  lines(v) {
    if (Array.isArray(v)) return v.map(x => this.value(x)).filter(Boolean);
    if (v && typeof v === "object") return Object.entries(v)
      .filter(([k, x]) => x != null && k !== "title")
      .map(([k, x]) => `${this.name(k)}: ${this.value(x) || "none"}`);
    return v == null || v === "" ? [] : [String(v)];
  },

  /* one value, read inline */
  value(x) {
    if (x == null) return "";
    if (Array.isArray(x)) return x.map(y => this.value(y)).filter(Boolean).join(" · ");
    if (typeof x === "object") return Object.entries(x).filter(([, y]) => y != null)
      .map(([k, y]) => `${k} ${this.value(y)}`).join(" · ");
    return String(x);
  },

  /* ownerTurnsPerTouch / owner_turns_per_touch → "Owner turns per touch",
     approvedWithNoRun72h → "Approved with no run 72h" */
  name(k) {
    const s = String(k).replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([a-z])([0-9])/g, "$1 $2").toLowerCase().trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  },
};
