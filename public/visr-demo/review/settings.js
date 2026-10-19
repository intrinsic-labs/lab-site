/* REVIEW · settings — the gear on home, opened: Mechanical/settings.md as controls.

   IntrinsicOS owns the file (`intrinsic settings read|write`, relayed by
   tycho/settings.py): the schema, every validation, the revision check and
   the comment-preserving edit. This screen draws the schema's groups as
   folds, each field with its control (settings-controls.js), and keeps his
   changes until SAVE, which appears only while something differs from what
   was read. A save names the revision it was read at.

   After a save the screen reads the runtime's verdict until the supervisor
   decides: pending, then accepted, or invalid with the validator's error
   beside its field (the previous settings stay active meanwhile). A save the
   runtime refuses shows its field errors in place; one refused as stale
   re-reads and keeps his changes on top. A runtime from before the verb
   existed gets one plain sentence.

   A phone stacks the groups; a landscape tablet sets them in two columns.

     const v = Settings.render({ back });   // v.el · v.page · v.dispose() */
"use strict";

const Settings = {
  POLL_MS: 2_500,
  WAIT_MS: 120_000,

  render(ctl) {
    const inner = T.el("div", { class: "t-settings-inner" });
    const page = T.el("div", { class: "t-settings-page" }, inner);
    const count = T.el("span", { class: "t-foot" });
    const save = T.el("button", { class: "t-btn primary t-settings-save-btn", type: "button" }, "SAVE");
    const bar = T.el("div", { class: "t-settings-save", hidden: true }, count, save);
    const el = T.el("section", { class: "t-settings", "data-pid": "settings" },
      TopBar.render({ title: "Settings", back: () => ctl.back() }), page, bar);

    const st = { data: null, shown: null, top: null, feet: {}, draft: {}, errors: {}, general: [], note: null, controls: {},
      alive: true, poll: 0, watchRev: null, saving: false, during: {}, waitingFor: null };
    let resolveLoaded;
    const loaded = new Promise(r => { resolveLoaded = r; });

    const fieldOf = path => st.data.fields.find(f => f.path === path);
    /* what the file holds, in the control's shape: a multi's `selected`
       array (its `value` is the runtime's spelling of it), else the text */
    const baseline = path => { const f = fieldOf(path); return f?.type === "multi" ? (f.selected || []) : st.data.values[path]; };
    const equal = (path, a, b) => (fieldOf(path)?.type === "multi" ? SetControls.sameList(a, b) : a === b);
    const value = path => (path in st.draft ? st.draft[path] : baseline(path));
    const changed = () => Object.keys(st.draft).filter(p => !equal(p, st.draft[p], baseline(p)));
    const localProblems = () => changed().map(p => [p, SetControls.local(fieldOf(p), st.draft[p])]).filter(([, why]) => why);

    const syncBar = () => {
      const n = changed().length;
      bar.hidden = !n;
      el.classList.toggle("dirty", !!n);
      const bad = localProblems().length;
      count.textContent = bad ? `${bad} TO FIX` : `${n} CHANGE${n === 1 ? "" : "S"}`;
      save.disabled = st.saving || !!bad;
      save.textContent = st.saving ? "SAVING…" : "SAVE";
      /* each fold says how many of its fields he changed */
      for (const [id, foot] of Object.entries(st.feet)) {
        const k = changed().filter(p => fieldOf(p)?.group === id).length;
        foot.textContent = k ? `${k} CHANGED` : "";
      }
    };

    /* one field: label, control, the help that prevents a mistake, its error */
    const row = field => {
      const err = T.el("div", { class: "t-set-err", role: "alert" });
      const help = T.el("div", { class: "t-set-help" });
      const wrap = T.el("div", { class: `t-set-field t-set-is-${field.type}`, "data-path": field.path });
      const showHelp = () => {
        const v = value(field.path);
        const lines = [];
        if (field.help) lines.push(field.help);
        const o = field.options?.find(x => x.value === v);
        if (o?.help && !SetControls.tag(o)) lines.push(o.help);
        /* a role's size names the pinned version it runs, from the Models group */
        if (field.path.endsWith(".size")) {
          const role = field.path.slice(0, -".size".length);
          const provider = fieldOf(`${role}.provider`) ? value(`${role}.provider`) : "claude";
          const runs = value(`models.${provider}.${v}`);
          if (runs) lines.push(`${v} on ${provider} runs ${runs}.`);
        }
        help.replaceChildren(...lines.map(l => T.el("div", {}, l)));
        const mine = field.path in st.draft;
        const why = st.errors[field.path] || (mine ? SetControls.local(field, st.draft[field.path]) : serverErrors()[field.path]) || null;
        err.textContent = why || "";
        wrap.classList.toggle("bad", !!why);
        wrap.classList.toggle("changed", field.path in st.draft && !equal(field.path, st.draft[field.path], baseline(field.path)));
      };
      const control = SetControls.make(field, value(field.path), v => {
        if (st.saving) st.during[field.path] = v;
        if (equal(field.path, v, baseline(field.path))) delete st.draft[field.path]; else st.draft[field.path] = v;
        delete st.errors[field.path];
        refreshHelp();
        syncBar();
      });
      st.controls[field.path] = { control, showHelp };
      const head = T.el("div", { class: "t-set-head" }, T.el("label", { class: "t-set-label" }, String(field.label)));
      if (field.type === "boolean") head.append(control.el);
      wrap.append(head);
      if (field.type !== "boolean") wrap.append(T.el("div", { class: "t-set-control" }, control.el));
      wrap.append(...SetControls.refusals(field), help, err);
      showHelp();
      return wrap;
    };
    const refreshHelp = () => Object.values(st.controls).forEach(c => c.showHelp());

    /* the supervisor's and the validator's errors on the revision on screen, by field */
    const serverErrors = () => {
      const d = st.data, out = {};
      for (const e of [...(d.status?.state === "invalid" ? d.status.errors : []), ...(d.check?.valid === false ? d.check.errors : [])])
        if (e.path && !(e.path in out)) out[e.path] = e.message;
      return out;
    };

    /* a poll that brings only a new verdict redraws the status and the
       errors, never the controls under his hand */
    const drawStatus = () => {
      const next = statusLine();
      st.top.replaceWith(next);
      st.top = next;
      refreshHelp();
    };

    const statusLine = () => {
      const s = st.data.status || {};
      const mine = st.waitingFor && st.waitingFor === st.data.revision;
      const node = s.state === "accepted"
        ? T.el("div", { class: "t-set-status ok" }, mine ? "ACCEPTED · RUNNING NOW" : "IN USE")
        : s.state === "invalid"
          ? T.el("div", { class: "t-note bad" }, T.el("div", { class: "t-label" }, "REFUSED BY THE SUPERVISOR"),
              T.el("p", {}, "The previous settings stay active. Fix the field marked below and save again."))
          : T.el("div", { class: "t-set-status amber" }, mine || st.waitingFor
              ? "SAVED · WAITING FOR THE SUPERVISOR (ABOUT 15 S)"
              : "NOT CHECKED YET · THE SUPERVISOR CHECKS ABOUT 15 S AFTER A CHANGE");
      const general = [...st.general, ...((s.state === "invalid" ? s.errors : []) || []).filter(e => !e.path || !fieldOf(e.path)).map(e => e.message),
        ...(st.data.check?.valid === false ? st.data.check.errors.filter(e => !e.path || !fieldOf(e.path)).map(e => e.message) : [])];
      return T.el("div", { class: "t-set-top" }, node, st.note,
        ...[...new Set(general)].map(g => T.el("div", { class: "t-note bad" }, T.el("p", {}, g))));
    };

    const draw = () => {
      const d = st.data;
      /* folds he closed stay closed across a redraw */
      const closed = new Set([...inner.querySelectorAll(".t-set-group:not([open])")].map(g => g.dataset.group));
      st.controls = {};
      st.feet = {};
      const groups = d.groups.map(g => {
        const fields = d.fields.filter(f => f.group === g.id);
        const body = T.el("div", { class: "t-fold-body t-set-body" },
          g.help ? T.el("div", { class: "t-set-ghelp" }, g.help) : null);
        for (const f of fields) body.append(row(f));
        st.feet[g.id] = T.el("span", { class: "t-foot amber" });
        return T.el("details", { class: "t-fold t-set-group", open: closed.has(g.id) ? null : true, "data-group": g.id },
          T.el("summary", {}, T.el("span", { class: "t-fold-title" }, g.label), st.feet[g.id]), body);
      });
      const keep = page.scrollTop;
      st.top = statusLine();
      inner.replaceChildren(st.top, T.el("div", { class: "t-set-groups" }, ...groups));
      page.scrollTop = keep;
      st.shown = d.revision;
      syncBar();
    };

    const unsupported = reason => {
      inner.replaceChildren(T.el("div", { class: "t-set-none" },
        T.el("h1", { class: "t-title" }, "Settings need a runtime update."),
        T.el("p", { class: "dim" }, reason && reason !== "Settings need a runtime update." ? reason
          : "This Mac's IntrinsicOS doesn't have the settings command yet. It arrives with the next runtime update; until then, edit Mechanical/settings.md in Obsidian.")));
      bar.hidden = true;
    };

    const fault = reason => {
      inner.replaceChildren(T.el("div", { class: "t-note bad" }, T.el("div", { class: "t-label" }, "COULDN'T READ THE SETTINGS"),
        T.el("p", {}, String(reason || "")), T.el("div", { class: "t-row" },
          T.el("button", { class: "t-btn", type: "button", onclick: () => load() }, "TRY AGAIN"))));
      bar.hidden = true;
    };

    const load = async () => {
      const out = await Wire.settings();
      if (!st.alive) return out;
      if (!out.ok) {
        if (out.code === "unsupported") unsupported(out.reason); else fault(out.reason);
        resolveLoaded();
        return out;
      }
      const same = st.shown === out.revision && st.top?.isConnected;
      st.data = out;
      /* a change he already made that the file now holds is no longer a change */
      for (const p of Object.keys(st.draft)) if (!fieldOf(p) || equal(p, st.draft[p], baseline(p))) delete st.draft[p];
      if (same) { drawStatus(); syncBar(); } else draw();
      resolveLoaded();
      if (out.status?.state === "pending" && st.watchRev !== out.revision) watch(out.revision);
      return out;
    };

    /* while the revision on screen is pending (his save, or one he came
       back to), read until the supervisor accepts or refuses it */
    const watch = rev => {
      clearTimeout(st.poll);
      st.watchRev = rev;
      const started = Date.now();
      const tick = async () => {
        if (!st.alive || st.watchRev !== rev) return;
        /* hidden: no reads; the watch picks up again on the next tick */
        if (document.visibilityState === "hidden") { st.poll = setTimeout(tick, Settings.POLL_MS); return; }
        const out = await load();
        /* load() starts a fresh watch for a newer pending revision */
        if (!st.alive || st.watchRev !== rev) return;
        if (!out.ok || out.status?.state !== "pending") { st.watchRev = null; return; }
        if (Date.now() - started > Settings.WAIT_MS) {
          st.note = T.el("div", { class: "t-note amber" }, T.el("div", { class: "t-label" }, "STILL WAITING"),
            T.el("p", {}, "The supervisor hasn't checked it after two minutes. It may be stopped; the file is saved."));
          drawStatus();
          return;
        }
        st.poll = setTimeout(tick, Settings.POLL_MS);
      };
      st.poll = setTimeout(tick, Settings.POLL_MS);
    };

    save.onclick = async () => {
      const set = Object.fromEntries(changed().map(p => [p, st.draft[p]]));
      if (!Object.keys(set).length || st.saving) return;
      st.saving = true; st.during = {}; st.general = []; st.note = null;
      syncBar();
      let out;
      try { out = await Tycho.auth(() => Wire.settingsWrite({ revision: st.data.revision, set })); }
      finally { st.saving = false; }
      if (!st.alive) return;
      if (!out) { st.general = ["Not saved: the action token wasn't given."]; syncBar(); drawStatus(); return; }
      if (out.ok) {
        /* what he changed while it was saving stays a change, measured
           against the values just saved (a move back included) */
        const base = p => (p in set ? set[p] : baseline(p));
        const latest = { ...st.draft, ...st.during };
        st.draft = Object.fromEntries(Object.entries(latest).filter(([p, v]) => !equal(p, v, base(p))));
        st.errors = {};
        st.waitingFor = out.revision;
        await load();
        return;
      }
      if (out.code === "stale") {
        st.note = T.el("div", { class: "t-note amber" }, T.el("div", { class: "t-label" }, "THE SETTINGS CHANGED SINCE YOU OPENED THEM"),
          T.el("p", {}, "They were reloaded and your changes are kept on top. Check them and save again."));
        await load();
        return;
      }
      if (out.code === "unsupported") { unsupported(out.reason); return; }
      for (const e of out.errors || []) if (e.path && fieldOf(e.path)) st.errors[e.path] = e.message; else st.general.push(e.message);
      if (!(out.errors || []).length) st.general.push(out.reason || "Not saved.");
      syncBar();
      drawStatus();
      const first = inner.querySelector(".t-set-field.bad");
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
    };

    inner.append(T.el("p", { class: "dim t-set-loading" }, "Reading the settings…"));
    load();
    const resume = () => { if (st.alive && document.visibilityState === "visible" && !changed().length && !st.saving) load(); };
    document.addEventListener("visibilitychange", resume);

    return {
      el, page, loaded,
      dispose() { st.alive = false; clearTimeout(st.poll); document.removeEventListener("visibilitychange", resume); },
    };
  },
};
