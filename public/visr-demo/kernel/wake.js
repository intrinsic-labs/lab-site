/* INTRINSICOS KERNEL · wake — the full boot once a day, a wake every other time.

   Asher opens this many times a day from his phone. The power-on ritual is a
   pleasure the first time and a toll the tenth, so (2026-10-04) it runs only
   when there has been no boot since the most recent 06:00 local time. Every
   other open — a reload, a tab Android discarded, the PWA brought back — is a
   short sleep→wake: a line of light that opens into the screen in under
   600ms, with no tap and no sound, straight to where he was. */
"use strict";

const Wake = {
  KEY: "tycho.boot.last",
  DAY_STARTS: 6,          /* local hour */
  MS: 520,

  /* the most recent 06:00 local at or before `now` */
  dayStart(now = new Date()) {
    const d = new Date(now);
    d.setHours(this.DAY_STARTS, 0, 0, 0);
    if (d > now) d.setDate(d.getDate() - 1);
    return d;
  },

  needsBoot(now = new Date()) {
    const last = Number(Store.get(this.KEY, 0)) || 0;
    return last < this.dayStart(now).getTime();
  },

  booted() { Store.set(this.KEY, Date.now()); },

  /* the wake itself. The screen is already drawn underneath; this only lifts
     the dark off it. Resolves when it is safe to touch. */
  run(el) {
    return new Promise(resolve => {
      el.classList.add("on");
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("go")));
      setTimeout(() => { el.classList.remove("on", "go"); resolve(); }, this.MS);
    });
  },
};
