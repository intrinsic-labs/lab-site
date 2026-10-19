/* INTRINSICOS KERNEL · core — power on, then hand the screen to the app.

   IntrinsicOS is one surface now (2026-10-04): the REVIEW desk — a split-flap
   card index, one card per thing waiting on Asher, and the desk a card opens onto.
   The cabinet scene, the dock, TERM, the calibration instruments and the
   old editor are gone (git has them). What the kernel still owns is the
   machine around the app: the once-a-day boot or the quick wake
   (kernel/wake.js), the click blip and the event log, suspension and resume
   (lifecycle.js), the action token (auth.js) and the shared dialogs.

   The app registers itself as `Tycho.app = { prepare(), start() }`:
   `prepare()` begins the first read of the queue (so a boot's readiness
   stages wait on real work), `start()` draws the screen. The global keeps its
   old name on purpose — renaming it is the later migration, not this one. */
"use strict";

const Tycho = {
  VERSION: "0.3",
  app: null,
  small: () => matchMedia("(max-width: 760px)").matches,

  starters: [],
  _started: false,
  /* work that waits for the screen to be up; one failing never stops the rest */
  afterStart(fn) {
    if (this._started) { try { fn(); } catch (e) { console.warn(e); } }
    else this.starters.push(fn);
  },

  init() {
    Log.install();
    document.addEventListener("click", e => {
      if (e.target.closest(".t-btn:not([disabled]), .row")) Sound.click();
      Log.click(e.target);
    });
    this.installEditMenu();
    this.installLifecycle();
    const boot = document.getElementById("boot");
    const ready = this.app?.prepare?.() ?? Promise.resolve();
    if (!Wake.needsBoot()) {
      boot.classList.add("off");
      Boot.worker();
      this.start();
      Log.event("os", LOG.BOOT, "wake", { coldMs: Math.round(performance.now()) });
      Wake.run(document.getElementById("wake"));
      return;
    }
    let started = false;
    const power = () => {
      if (started) return;
      started = true;
      boot.removeEventListener("pointerdown", power);
      removeEventListener("keydown", power);
      Boot.run(boot, ready, () => {
        Wake.booted();
        Log.event("os", LOG.BOOT, "boot", { coldMs: Math.round(performance.now()) });
        this.start();
      });
    };
    boot.addEventListener("pointerdown", power);
    addEventListener("keydown", power);
  },

  start() {
    if (this._started) return;
    this._started = true;
    try { this.app?.start?.(); } catch (e) { console.error(e); }
    for (const fn of this.starters.splice(0)) {
      try { fn(); } catch (e) { console.warn(e); }
    }
  },
};

addEventListener("DOMContentLoaded", () => Tycho.init());
