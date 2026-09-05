/* TYCHO KERNEL · lifecycle — suspension and resume: a backgrounded PWA is frozen or discarded, and coming back is a first-class event. */
"use strict";

Object.assign(Tycho, {
  /* -- suspension & resume --------------------------------------------------
     A backgrounded PWA is frozen and may be DISCARDED outright: in-flight
     fetches abort mid-body, sockets die, timers stop. Coming back therefore
     has to be a first-class event rather than something each program discovers
     by failing. Three sources, because Chrome gives three and they mean
     different things: `visibilitychange` (the screen is back), `resume` (the
     Page Lifecycle API's own un-freeze), and `document.wasDiscarded` on load
     (the tab was thrown away entirely and this is a fresh document wearing the
     old one's session). All three land on one call, deduped, carrying how long
     we were away — a program decides for itself whether 4 seconds and 4 hours
     mean the same thing. */
  epoch: 0,
  hiddenAt: 0,
  resumers: new Set(),

  onResume(fn) {
    this.resumers.add(fn);
    return () => this.resumers.delete(fn);
  },

  resumed(why) {
    const awayMs = this.hiddenAt ? Date.now() - this.hiddenAt : 0;
    this.hiddenAt = 0;
    this.epoch++;
    for (const fn of [...this.resumers]) {
      try { fn({ awayMs, why, epoch: this.epoch }); }
      catch { /* one program's resume may not take the others down */ }
    }
  },

  installLifecycle() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.hiddenAt ||= Date.now();
        return;
      }
      this.resumed("visible");
    });
    /* the Page Lifecycle pair — `freeze` is the only honest signal that work
       stopped, and `resume` fires on un-freeze even when the tab was never
       hidden (a Chrome tab may be frozen in a background window) */
    addEventListener("freeze", () => { this.hiddenAt ||= Date.now(); });
    addEventListener("resume", () => this.resumed("unfrozen"));
    /* pageshow with persisted = restored from the back/forward cache */
    addEventListener("pageshow", e => { if (e.persisted) this.resumed("bfcache"); });
    /* a full discard: this document never ran before, so nothing is stale —
       but programs restoring from localStorage want to know it happened */
    if (document.wasDiscarded) this.discarded = true;
  },
});
