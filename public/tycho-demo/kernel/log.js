/* TYCHO KERNEL · event log — append-only, structured, a closed vocabulary; never content, never a throw into UI code. */
"use strict";

/* ------------------------------------------------------------- event log
   TychoOS keeps a system log the way a real OS does: append-only, structured,
   one event per line, a small CLOSED vocabulary, rotated by day on the server
   (~/Library/Logs/intrinsic/tycho/). It exists so the machine's own process
   becomes measurable later — how long a mission takes, where the hesitation
   sits, which programs get opened and abandoned.

   Two rules it never breaks. It never blocks or throws into UI code: every
   entry point is wrapped, and a dead server costs one dropped batch, never a
   click. And it never carries CONTENT — ids and UI labels only, never prompt
   text, note bodies, chat turns or file contents. `.txt` is the class those
   things wear in this OS, and the label reader skips it structurally.

   Coverage is structural, not per-call-site: `ui.click` rides the one delegated
   click listener the kernel already had for the click blip, and reads the owning
   program off the window's `data-pid`. A program added tomorrow is instrumented
   the moment it opens a window — there is nothing for its author to remember. */

const LOG = Object.freeze({
  BOOT: "os.boot",
  SHUTDOWN: "os.shutdown",
  VISIBILITY: "os.visibility",
  LAUNCH: "app.launch",
  CLOSE: "app.close",
  FOCUS: "app.focus",
  CLICK: "ui.click",
  MISSION_SHOWN: "mission.shown",
  /* MISSION_START has no verb behind it yet — the campaign engine gains an
     explicit "start" the way it gained "select". It is in the vocabulary now so
     the seam is already there when it lands, and so the analysis tool can be
     written once. */
  MISSION_START: "mission.start",
  MISSION_COMPLETE: "mission.complete",
  MISSION_SKIP: "mission.skip",
  MISSION_SELECT: "mission.select",
  TERM_DROPIN: "term.dropin",
  /* INTAKE filed one task into the vault. The label is the id create-task
     actually allocated and `data` carries the project — never the title, which
     is content and stays out of the log like every other body of text. */
  TASK_FILED: "task.filed",
});

const Log = {
  VOCAB: new Set(Object.values(LOG)),
  boot: Math.random().toString(16).slice(2, 8),   /* one id per page load */
  seq: 0,
  q: [],
  timer: null,
  retried: false,
  deafFor: null,        /* the token the server refused — retry on a new one */
  MAX: 200,             /* queue cap: an offline server may not leak memory */
  SEND: 100,            /* per-POST cap — the server's own, so nothing it
                           accepts is ever silently over the limit */
  BATCH: 20,
  EVERY: 5000,
  LABEL: 48,

  install() {
    try {
      document.addEventListener("visibilitychange", () => {
        this.event("os", LOG.VISIBILITY, null,
                   { state: document.visibilityState });
        /* away/back is the hesitation signal, so it must survive the tab being
           frozen — hidden flushes on a beacon, not on the 5s timer */
        if (document.visibilityState === "hidden") this.flush(true);
      });
      addEventListener("pagehide", () => this.flush(true));
    } catch { /* an OS that cannot log is still an OS */ }
  },

  event(app, event, label, data) {
    try {
      if (!this.VOCAB.has(event))
        return console.warn("Log: outside the vocabulary —", event);
      const e = { ts: new Date().toISOString(), boot: this.boot,
                  seq: ++this.seq, app: String(app || "os"), event };
      if (label) e.label = String(label).slice(0, this.LABEL);
      if (data && Object.keys(data).length) e.data = data;
      this.q.push(e);
      if (this.q.length > this.MAX) this.q.splice(0, this.q.length - this.MAX);
      if (this.q.length >= this.BATCH) this.flush();
      else this.arm();
    } catch { /* telemetry may never break the thing it measures */ }
  },

  arm() {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); },
                            this.EVERY);
  },

  flush(beacon) {
    try {
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      if (!this.q.length) return;
      const token = Tycho.token();
      if (this.deafFor && this.deafFor === token) { this.q.length = 0; return; }
      const batch = this.q.splice(0, this.SEND);
      if (this.q.length) this.arm();   /* a backlog goes out on the next beat */
      const body = JSON.stringify({ token, events: batch });
      if (beacon && navigator.sendBeacon) {
        /* the page is going away: a beacon outlives it, and there is no
           response to react to — one shot, then gone */
        navigator.sendBeacon("/api/log",
                             new Blob([body], { type: "application/json" }));
        return;
      }
      fetch("/api/log", { method: "POST", keepalive: true,
                          headers: { "Content-Type": "application/json" },
                          body })
        .then(r => {
          if (r.status === 401) {
            /* no TERM token pasted on this device yet — say it once, in the
               console, and stop tarpitting the server until a new one appears */
            this.deafFor = token;
            console.warn("Log: /api/log refused the TERM token — TychoOS events " +
                         "are not being recorded on this device");
            return;
          }
          if (!r.ok) throw new Error(r.status);
          this.retried = false;
        })
        .catch(() => {
          if (this.retried) return;   /* one retry, then the batch is gone */
          this.retried = true;
          this.q.unshift(...batch);
          this.arm();
        });
    } catch { /* see above — never into the UI */ }
  },

  /* the label of something clicked: its own words, minus the parts that carry
     CONTENT (`.txt` is a filename, a task's prose, a chat turn) and minus the
     decorative filler. An icon-only control falls back to its icon's name. */
  text(node, depth = 0) {
    let out = "";
    for (const kid of node.childNodes) {
      if (kid.nodeType === 3) out += kid.nodeValue;
      else if (kid.nodeType === 1 && depth < 3 &&
               !kid.matches(".txt, .dots, .hint, .badge"))
        out += " " + this.text(kid, depth + 1) + " ";
    }
    return out;
  },

  label(hit) {
    const words = this.text(hit).replace(/\s+/g, " ").trim();
    if (words) return words;
    const ico = hit.querySelector("[data-ico]");
    return ico ? "#" + ico.getAttribute("data-ico") : "";
  },

  /* one delegated listener covers every button in every program, present and
     future: the owning program comes off the window root's data-pid, and
     shell chrome (menu bar, dock, desktop, dialogs) is "os" */
  HITS: ".t-btn:not([disabled]), .t-icon, .ctl, .item, .row, .cell, .swatch",

  click(target) {
    try {
      const hit = target?.closest?.(this.HITS);
      if (!hit) return;
      const id = hit.querySelector(".id")?.textContent?.trim();
      this.event(hit.closest(".t-window")?.dataset.pid || "os",
                 LOG.CLICK, this.label(hit),
                 id && id.length <= 40 ? { id } : null);
    } catch { /* a click must land whether or not it is recorded */ }
  },
};
