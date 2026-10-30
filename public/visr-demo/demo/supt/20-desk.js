/* VISR DEMO · SUPERINTENDENT · the desk, as the Superintendent reaches it.

   demo/shim.js hands every call the in-memory review desk (`desk`): the
   queue, the live items, an act, intake filing, the projects and an event
   feed. This wraps it so nothing here breaks when the desk lacks a method:
   a missing `items()` falls back to the queue, a missing `fileIntake` keeps
   the note in memory with a made-up path, a missing `reopen` means no act
   offers UNDO. Acts the Superintendent makes itself are remembered for a
   few seconds, so the desk's own event for them isn't logged twice as if the
   visitor had acted on the deck.

     L.desk.use(desk) → whether this is the first desk seen
     L.desk.items() → live, waiting items · L.desk.all() → also deferred ones
     L.desk.act({key, action, owner?, text?}) → {ok, result?, reason?}   (async)
     L.desk.reopen(key, action) → {ok, reason?}   (async) · L.desk.canReopen()
     L.desk.file({project, note}) → {ok, path, project, id}   (async)
     L.desk.projects() → [{slug, ref, name}] · L.desk.project(slugOrRef) → one of them
     L.desk.happened() → the queue's `happened` lane · L.desk.title(key) → the last title seen
     L.desk.self(key, action) → whether that event was the Superintendent's own act */
"use strict";

(function (L) {
  const FALLBACK_PROJECTS = [
    { category: "engine", ref: "engine/northwind", name: "Northwind" },
    { category: "bets", ref: "bets/orchard", name: "Orchard" },
    { category: "bets", ref: "bets/lanternfish", name: "Lanternfish" },
  ];
  const SELF_MS = 4000;

  const call = async (fn, ...args) => {
    try { return await fn(...args); } catch (e) { return { ok: false, reason: String(e?.message || e) }; }
  };

  const desk = {
    raw: null,
    titles: new Map(),
    mine: new Map(),            // `${key}|${action}` → until when an event for it is ours
    local: [],                  // intake kept here when the desk has no fileIntake
    listeners: [],

    use(d) {
      const first = !this.raw && !!d;
      if (d) this.raw = d;
      if (first && typeof d.on === "function") {
        try { d.on(e => { for (const fn of this.listeners) fn(e); }); } catch { /* no feed: fine */ }
      }
      return first;
    },

    on(fn) { this.listeners.push(fn); },

    queue() {
      try { return this.raw?.queue?.() || {}; } catch { return {}; }
    },

    /* everything still waiting, deferred or not */
    all() {
      let list = null;
      try { list = this.raw?.items?.(); } catch { list = null; }
      if (!Array.isArray(list)) list = Array.isArray(this.queue().items) ? this.queue().items : [];
      list = list.filter(i => i && i.key && i.lane !== "happened");
      for (const i of list) this.titles.set(i.key, L.cards ? L.cards.name(i) : i.title);
      return list;
    },

    items() { return this.all().filter(i => !i.deferred); },

    find(key) { return this.all().find(i => i.key === key) || null; },

    title(key) { return this.titles.get(key) || String(key || "").split(":").pop(); },

    happened() { const h = this.queue().happened; return Array.isArray(h) ? h : []; },

    projects() {
      let list = this.raw?.projects;
      if (typeof list === "function") { try { list = list.call(this.raw); } catch { list = null; } }
      if (!Array.isArray(list) || !list.length) list = this.queue().projects;
      if (list && !Array.isArray(list) && typeof list === "object")
        list = Object.entries(list).map(([slug, name]) => ({ ref: slug, name }));
      if (!Array.isArray(list) || !list.length) list = FALLBACK_PROJECTS;
      return list.filter(p => p && (p.ref || p.name)).map(p => {
        const ref = String(p.ref || p.name).toLowerCase();
        const known = FALLBACK_PROJECTS.find(f => f.ref.endsWith(`/${ref}`) || f.ref === ref);
        const full = ref.includes("/") ? ref : known?.ref || ref;
        return { slug: full.split("/").pop(), ref: full, name: String(p.name || full.split("/").pop()) };
      });
    },

    project(x) {
      const s = String(x || "").toLowerCase();
      return this.projects().find(p => p.slug === s || p.ref === s || p.name.toLowerCase() === s) || null;
    },

    self(key, action) {
      const k = `${key}|${action}`;
      const until = this.mine.get(k);
      if (until && until >= L.clock.now()) { this.mine.delete(k); return true; }
      return false;
    },

    async act({ key, action, owner, text }) {
      const it = this.find(key);
      if (!this.raw?.act) return { ok: false, reason: "The deck isn't answering on this page." };
      this.mine.set(`${key}|${action}`, L.clock.now() + SELF_MS);
      const req = { key, action, ...(it?.revision ? { revision: it.revision } : {}),
        ...(owner ? { owner } : {}), ...(text ? { text } : {}) };
      const out = await call(r => this.raw.act(r), req);
      if (!out?.ok) this.mine.delete(`${key}|${action}`);
      return out || { ok: false, reason: "The deck didn't answer." };
    },

    canReopen() { return typeof this.raw?.reopen === "function" || typeof this.raw?.undo === "function"; },

    async reopen(key, action) {
      const r = this.raw;
      const out = typeof r?.reopen === "function" ? await call(k => r.reopen(k), key)
        : typeof r?.undo === "function" ? await call(q => r.undo(q), { key, action })
          : { ok: false, reason: "This deck can't put a card back." };
      return out === true ? { ok: true } : out || { ok: false, reason: "The deck didn't answer." };
    },

    async file({ project, note }) {
      const p = this.project(project) || { ref: project, name: project };
      if (typeof this.raw?.fileIntake === "function") {
        this.mine.set(`${p.ref}|intake`, L.clock.now() + SELF_MS);
        const out = await call(q => this.raw.fileIntake(q), { project: p.ref, note, source: "superintendent" });
        if (out?.ok) return { ...out, project: out.project || p.ref };
        this.mine.delete(`${p.ref}|intake`);
        return out || { ok: false, reason: "The deck didn't answer." };
      }
      const id = `in-${String(this.local.length + 1).padStart(3, "0")}`;
      this.local.push({ id, project: p.ref, note, at: L.clock.iso() });
      return { ok: true, id, project: p.ref, path: `Projects/${p.ref}/intake/${id}.md` };
    },
  };

  L.desk = desk;
})(window.VISR_SUPT_LIB ||= {});
