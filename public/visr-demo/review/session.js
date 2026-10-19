/* REVIEW · session — where Asher was, so the app reopens where he left it
   (closed and reopened, or a tab Android discarded).

   `{ view: "ring" | "desk" | "capture" | "telemetry" | "monday" | "settings", key,
   front, frontIndex, scroll, sheet }`: which screen, which item is open, which
   card was in front of the deck (by key, and its index for when that item has
   gone), how far down the desk he had read, and which writing sheet was up.
   ("ring" is the home view's stored name, kept from the first build.)

   Plus `open[key]` — how long he has actually had an item on screen, summed
   over every visit while the screen was visible. That is a draft approve's
   `reviewMinutes`, and it lives here so a reload or a discard cannot reset
   it. */
"use strict";

const Session = {
  KEY: "tycho.desk.view",
  get() { return Store.get(this.KEY, {}) || {}; },
  patch(part) { Store.patch(this.KEY, part); },

  _open() { return this.get().open || {}; },
  enter(key) {
    const open = this._open();
    const t = open[key] || { ms: 0, since: null };
    if (!t.since) t.since = Date.now();
    open[key] = t;
    this.patch({ open });
  },
  leave(key) {
    const open = this._open();
    const t = open[key];
    if (!t?.since) return;
    t.ms += Date.now() - t.since;
    t.since = null;
    this.patch({ open });
  },
  forget(key) {
    const open = this._open();
    delete open[key];
    this.patch({ open });
  },
  /* whole minutes on screen, at least one */
  minutes(key) {
    const t = this._open()[key] || { ms: 0, since: null };
    const ms = t.ms + (t.since ? Date.now() - t.since : 0);
    return Math.max(1, Math.round(ms / 60000));
  },
};
