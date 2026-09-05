/* TYCHO KERNEL · core — the registry, boot and the fullscreen program host.
   Rebuilt 2026-09-01 around the cabinet scene: there is no desktop, no window
   manager, no icons and no wallpaper any more (git has them). The dock and
   the trash can are `kernel/dock.js`.

   The shape of the OS now:
     · `#world` is the scene (scene/index.js) — the filing cabinet you boot
       into, and where every file and every program is picked from.
     · `#apps` holds the running programs, each a FULLSCREEN `.t-window` host
       (the class name is kept because programs and the CSS address it). At
       most one is showing; the rest are running behind it, exactly as they
       were when you left them.
     · the HOME icon at the bottom left is the way back to the cabinet. The
       icons beside it are the running programs, and INTAKE stays pinned at
       the end.

   A PROGRAM HAS NO TITLE ROW (Asher, 2026-09-02). The `.t-titlebar` — back ·
   title · ▤ · ✕ — is gone: the title was a word the screen underneath
   already said, ▤ is the HOME icon, and back is each program's own business
   in its own body. Only ✕ survived, as a small square at the far right of
   the STATUSBAR, which is why a program is handed a SLOT inside that bar
   rather than the bar itself: `w.statusbar.replaceChildren(…)` is how every
   program writes it, and the close button may not be something a program can
   wipe out by writing its own status line.

   Opening a program is a DIP TO COLOUR (Asher, 2026-09-01): the view fades
   to the screen's own ground, the program's fullscreen DOM is put on under
   the cover, and the cover fades away. Going back is the same dip, and the
   drawer is exactly as you left it — the sheet you opened still up. `#dip`
   is the cover; the scene never moves for a program. */
"use strict";

const Tycho = {
  VERSION: "0.2",
  programs: new Map(),
  apps: new Map(),       /* id → the fullscreen host element */
  wakes: new Map(),
  active: null,          /* the program on screen, or null when the scene is */
  scene: null,
  small: () => matchMedia("(max-width: 760px)").matches,

  register(p) { this.programs.set(p.id, p); },

  /* -- boot ---------------------------------------------------------------- */
  init() {
    Log.install();
    const boot = document.getElementById("boot");
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      boot.removeEventListener("pointerdown", start);
      removeEventListener("keydown", start);
      Boot.run(boot, this.programs, () => {
        Log.event("os", LOG.BOOT, null, { coldMs: Math.round(performance.now()) });
        this.start();
      });
    };
    boot.addEventListener("pointerdown", start);
    addEventListener("keydown", start, { once: false });
    /* every interactive element blips — one delegate, no per-handler calls.
       The same delegate is the event log's ui.click seam. */
    document.addEventListener("click", e => {
      if (e.target.closest(".t-btn:not([disabled]), .ctl, .item, .row"))
        Sound.click();
      Log.click(e.target);
    });
    this.installEditMenu();
    this.installLifecycle();
    this.clock();
  },

  /* the post-boot entrypoint: chrome, then the cabinet. The scene module is
     an ES module and so lands after every classic script; whichever of the
     two arrives second builds the cabinet. */
  start() {
    this.menubar();
    this.dock();
    this._started = true;
    if (this.createScene) this.sceneReady();
  },
  sceneReady() {
    if (!this._started || this.scene) return;
    /* the scene owns the drag GESTURE; the kernel owns where a thing may be
       dropped and what it looks like in flight (kernel/dock.js) */
    this.scene = this.createScene(document.getElementById("world"),
      { zone: this.dropZone });
    this.cabinet();
  },

  clock() {
    const el = document.getElementById("clock");
    const tick = () => {
      const d = new Date();
      el.textContent = d.toTimeString().slice(0, 5) + " · " +
        d.toISOString().slice(this.small() ? 5 : 0, 10);
    };
    tick(); setInterval(tick, 10_000);
  },

  menubar() {
    const bar = document.getElementById("menubar");
    const soundItem = T.el("span", { class: "item",
      onpointerup: () => { Sound.toggle(); this.menubar(); } },
      Sound.on ? "SND:ON" : "SND:OFF");
    bar.replaceChildren(
      T.el("span", { class: "brand" }, "TYCHO"),
      T.el("span", { class: "spacer" }),
      soundItem,
      T.el("span", { class: "item", id: "clock" }));
    this.clock();
  },

  /* -- programs, fullscreen ---------------------------------------------- */
  async open(id, args) {
    if (this.apps.has(id)) {
      if (args !== undefined) this.wakes.get(id)?.(args);
      return this.show(id);
    }
    const p = this.programs.get(id);
    if (!p) return;
    const host = T.el("div", { class: "t-window full" });
    host.dataset.pid = id;
    const body = T.el("div", { class: "t-body" });
    /* the slot is the program's; the bar is the kernel's, and the ✕ on its
       right end is the only chrome a program cannot overwrite */
    const slot = T.el("div", { class: "t-status-slot" });
    const status = T.el("div", { class: "t-statusbar" }, slot,
      T.el("button", { class: "t-close", title: "close " + p.title,
        onclick: () => this.close(id) }, "✕"));
    host.append(body, status);
    document.getElementById("apps").append(host);
    this.apps.set(id, host);
    this.titles.set(id, p.title);
    Log.event(id, LOG.LAUNCH, p.title);
    p.mount({
      body, statusbar: slot,
      /* both are kept as no-ops on purpose: the titlebar they drove is gone,
         but a program calling either must not throw, and the title is still
         worth recording — it is the dock icon's tooltip */
      setTitle: t => { this.titles.set(id, t); this.dock(); },
      setBack: () => {},
      close: () => this.close(id),
      args,
      onWake: fn => this.wakes.set(id, fn),
    });
    await this.show(id);
  },

  /* put a running program on screen. From the scene this is the zoom; from
     another program it is a plain swap, since there is no sheet to rise. */
  async show(id) {
    const host = this.apps.get(id);
    if (!host) return;
    const apps = document.getElementById("apps");
    const fromScene = !this.active;
    for (const [k, el] of this.apps) el.classList.toggle("on", k === id);
    if (this.active !== id) Log.event(id, LOG.FOCUS, this.programs.get(id)?.title);
    this.active = id;
    this.dock();
    if (fromScene) {
      await this.dip(() => {
        apps.classList.add("on");
        /* the scene is under an opaque program now; it need not stay live */
        document.getElementById("world").classList.add("under");
      });
    }
    host.querySelector(".t-body")?.focus?.();
  },

  /* the HOME icon, and the ✕ on a program that is the last one */
  async toScene() {
    if (!this.active) return;
    this.active = null;
    this.dock();
    await this.dip(() => {
      document.getElementById("world").classList.remove("under");
      document.getElementById("apps").classList.remove("on");
      for (const el of this.apps.values()) el.classList.remove("on");
      this.scene?.refresh();
    });
  },

  /* fade the cover up, do `swap` beneath it, fade it away. Serialised, so a
     tap during the dip cannot start a second one over the first. */
  DIP_MS: 300,
  _dip: Promise.resolve(),
  dip(swap) {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const el = document.getElementById("dip");
    return this._dip = this._dip.then(async () => {
      el.classList.add("on");
      await wait(this.DIP_MS);
      swap();
      await wait(40);
      el.classList.remove("on");
      await wait(this.DIP_MS);
    });
  },

  close(id) {
    const host = this.apps.get(id);
    if (!host) return;
    const p = this.programs.get(id);
    Log.event(id, LOG.CLOSE, p?.title);
    const wasActive = this.active === id;
    host.remove(); this.apps.delete(id); this.wakes.delete(id); this.titles.delete(id);
    if (wasActive) {
      /* closing the program on screen shows the next running one if there is
         one, otherwise the drawer you came from */
      const next = [...this.apps.keys()].pop();
      if (next) { this.active = null; this.show(next); this.active = next; this.dock(); }
      else this.toScene();
    } else this.dock();
  },
};

addEventListener("DOMContentLoaded", () => Tycho.init());
