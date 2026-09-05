/* TYCHO KERNEL · filesystem verbs — the token gate and the kernel-level file actions (menus, terminal-here, rename, new file) the cabinet and programs share. Every rule is server-side (files.py); this is the asking. */
"use strict";

Object.assign(Tycho, {
  /* -- filesystem verbs (shared by the cabinet and the programs) ------------ */
  fsroot: "",
  token: () => localStorage.getItem("tycho.term.token") || "",

  /* generic token gate for kernel-level writes. Try, and on "bad token" ask
     once — same store TERM uses, so it's still one paste per device. */
  async auth(fn) {
    try { return await fn(); }
    catch (e) {
      if (!/bad token/i.test(String(e.message))) { this.toast(e.message); return null; }
      return new Promise(res => {
        const tok = T.el("input", { class: "t-field", type: "password",
          placeholder: "terminal token — same one TERM uses" });
        const go = T.el("button", { class: "t-btn primary", onclick: async () => {
          localStorage.setItem("tycho.term.token", tok.value.trim());
          ov.remove();
          try { res(await fn()); }
          catch (e2) { this.toast(e2.message); res(null); }
        } }, "AUTHORIZE");
        const ov = this.dialog("AUTHORIZATION REQUIRED",
          T.el("p", { class: "small dim", style: "margin-bottom:8px" },
            "Writing to the Mac rides the TERM token. Once per device."),
          tok, T.el("div", { style: "height:8px" }), go);
        tok.onkeydown = ev => { if (ev.key === "Enter") go.click(); };
        tok.focus();
      });
    }
  },

  /* the menu on one file in a drawer: open, rename, trash. `dir` is where it
     lives (ROOT-relative, "" = the root); `then` redraws whoever asked. */
  fileMenu(x, y, f, dir, then) {
    const rel = dir ? `${dir}/${f.name}` : f.name;
    this.ctxmenu(x, y, [
      { label: "OPEN", icon: "doc", fn: () => this.open("edit", { path: rel }) },
      { label: "RENAME", icon: "doc", fn: () => this.rename(f, dir, then) },
      /* no MOVE TO TRASH: the can is the one way to delete (fs-cabinet.js
         · trashNow) */
    ]);
  },

  /* the menu on a drawer's front (Asher, 2026-09-02: rename on top, then new
     file, a terminal; the trash item went 2026-09-03 — one way to delete). `d` is `{key, path?, dir?, label?}`: a
     folder drawer carries its directory entry and its ROOT-relative path
     ("CABINET 01/notes"), DESK the root path (""), PROGRAMS only its key.

     A DRAWER HAS NO DELETE (Asher, 2026-09-03: "you don't just take a single
     drawer out of a cabinet") — it goes when its cabinet goes, and that verb
     lives on the caption menu (fs-cabinet.js · cabinetMenu). */
  drawerMenu(x, y, d, then) {
    const items = [{ label: "RENAME", icon: "doc", fn: () => this.renameDrawer(d, then) }];
    /* a file is born in a drawer, and the drawer's menu is where (the idle
       action row went 2026-09-02); PROGRAMS has no directory to put one in */
    if (d.path != null) items.push({ label: "NEW FILE", icon: "doc",
      fn: () => this.newFile(d.path, then) });
    if (d.dir) items.push(
      { label: "NEW TERMINAL HERE", icon: "term",
        fn: () => this.termAt(`${this.fsroot}/${d.path}`) });
    this.ctxmenu(x, y, items);
  },

  /* both lines of the plate. The NAME of a folder drawer is the folder's own
     name (renaming it renames the directory, the honest move); the SUBTITLE,
     and a system drawer's name, are captions kept in the server's sidecar. */
  renameDrawer(d, then) {
    const cur = d.label || {};
    const name = T.el("input", { class: "t-field", placeholder: "name",
      value: cur.name || (d.dir ? d.dir.name : d.key.slice(1).toUpperCase()) });
    const meta = T.el("input", { class: "t-field", placeholder: "subtitle (blank = the default)",
      value: cur.meta || "" });
    const go = T.el("button", { class: "t-btn primary", onclick: async () => {
      const n = name.value.trim(), m = meta.value.trim();
      let ok = true, key = d.key;
      if (d.dir && n && n !== d.dir.name) {
        ok = await this.auth(() => T.api("/api/files",
          { op: "rename", path: d.path, name: n, token: this.token() }));
        /* the caption key is the drawer's PATH, so a rename moves it — the
           server carries the existing caption over, and the subtitle below
           has to be written at the new key rather than the old one */
        key = d.path.replace(/[^/]+$/, n);
      }
      if (ok) ok = await this.auth(() => T.api("/api/files",
        { op: "label", path: key, name: d.dir ? "" : n, meta: m, token: this.token() }));
      if (ok) { ov.remove(); Sound.commit(); then(); }
    } }, "RENAME");
    const ov = this.dialog("RENAME DRAWER", name, T.el("div", { style: "height:8px" }), meta,
      T.el("div", { style: "height:8px" }), go);
    const enter = ev => { if (ev.key === "Enter") go.click(); };
    name.onkeydown = enter; meta.onkeydown = enter;
    name.focus(); name.select();
  },

  /* -- the cabinet's own verbs ----------------------------------------------
     A CABINET IS A REAL DIRECTORY (Asher, 2026-09-03), so all four of these
     are ordinary filesystem ops on ROOT and its children rather than sidecar
     bookkeeping. A cabinet has no caption of its own any more: its name IS
     the directory's name, which is why RENAME here is `rename` and not
     `label`. `cab` is what fs-cabinet.js built — `{name, path, drawers,
     system}` — and the system cabinet reaches none of these. */
  renameCabinet(cab, then) {
    const name = T.el("input", { class: "t-field", value: cab.path });
    const go = T.el("button", { class: "t-btn primary", onclick: async () => {
      const next = name.value.trim();
      if (!next || next === cab.path) { ov.remove(); return; }
      const ok = await this.auth(() => T.api("/api/files",
        { op: "rename", path: cab.path, name: next, token: this.token() }));
      if (ok) { ov.remove(); Sound.commit(); then(); }
    } }, "RENAME");
    const ov = this.dialog("RENAME CABINET", name,
      T.el("div", { style: "height:8px" }), go);
    name.onkeydown = ev => { if (ev.key === "Enter") go.click(); };
    name.focus(); name.select();
  },

  /* `count` is how many cabinets there are, so the default carries on the
     numbering; `then` is handed the new directory's name, which is how the
     scene pages to the cabinet you just made rather than leaving you looking
     at the one you were on. */
  newCabinet(count, then) {
    const def = `CABINET ${String(count + 1).padStart(2, "0")}`;
    const name = T.el("input", { class: "t-field", value: def });
    const go = T.el("button", { class: "t-btn primary", onclick: async () => {
      const n = name.value.trim();
      if (!n) return;
      const ok = await this.auth(() => T.api("/api/files",
        { op: "mkdir", path: "", name: n, token: this.token() }));
      if (ok) { ov.remove(); Sound.commit(); then(n); }
    } }, "CREATE");
    const ov = this.dialog("NEW CABINET", name,
      T.el("div", { style: "height:8px" }), go);
    name.onkeydown = ev => { if (ev.key === "Enter") go.click(); };
    name.focus(); name.select();
  },

  /* THREE DRAWERS TO A CABINET, and the server is what says so — a fourth is
     refused there ("this cabinet is full") and the refusal arrives here as
     the toast every other refused write already wears (`auth`). The menu
     does not pre-empt it: one rule, in one place. */
  newDrawer(cab, then) {
    const name = T.el("input", { class: "t-field", placeholder: "name" });
    const go = T.el("button", { class: "t-btn primary", onclick: async () => {
      const n = name.value.trim();
      if (!n) return;
      const ok = await this.auth(() => T.api("/api/files",
        { op: "mkdir", path: cab.path, name: n, token: this.token() }));
      if (ok) { ov.remove(); Sound.commit(); then(); }
    } }, "CREATE");
    const ov = this.dialog("NEW DRAWER", name,
      T.el("div", { style: "height:8px" }), go);
    name.onkeydown = ev => { if (ev.key === "Enter") go.click(); };
    name.focus();
  },

  /* THE ONE PLACE A FOLDER IS DELETED. A file is carried to the can and the
     carry IS the confirmation; a cabinet cannot be carried, and it takes its
     drawers with it, so this one asks — and asks by NAMING what goes, because
     "are you sure?" over three folders you cannot see is not a question
     anybody can answer. ONE `trash` of ONE directory: it lands in ~/.Trash as
     a single item and PUT BACK brings the whole cabinet home intact. */
  deleteCabinet(cab, then) {
    const ds = (cab.drawers || []).map(d => d.label);
    const what = ds.length
      ? `${cab.name} and its ${ds.length} drawer${ds.length === 1 ? "" : "s"} — ${ds.join(", ")} —`
      : `${cab.name}, which is empty,`;
    this.confirm("DELETE CABINET", `Move ${what} to the Trash?`,
      "MOVE TO TRASH", async () => {
        const ok = await this.auth(() => T.api("/api/files",
          { op: "trash", path: cab.path, token: this.token() }));
        if (ok) { Sound.commit(); this.toast(`${cab.name} moved to the Trash`); then(); }
      });
  },

  async termAt(abs) {
    const r = await this.auth(() => T.api("/api/term",
      { token: this.token(), op: "start", cols: 100, rows: 30, cwd: abs }));
    if (r?.sid) this.open("term", { sid: r.sid });
  },

  rename(f, dir, then) {
    const rel = dir ? `${dir}/${f.name}` : f.name;
    const name = T.el("input", { class: "t-field", value: f.name });
    const go = T.el("button", { class: "t-btn primary", onclick: async () => {
      const next = name.value.trim();
      if (!next || next === f.name) { ov.remove(); return; }
      const out = await this.auth(() => T.api("/api/files",
        { op: "rename", path: rel, name: next, token: this.token() }));
      if (out) { ov.remove(); Sound.commit(); then(); }
    } }, "RENAME");
    const ov = this.dialog("RENAME " + (f.kind === "dir" ? "FOLDER" : "FILE"), name,
      T.el("div", { style: "height:8px" }), go);
    name.onkeydown = ev => { if (ev.key === "Enter") go.click(); };
    name.focus();
    const dot = f.kind === "dir" ? -1 : f.name.lastIndexOf(".");
    name.setSelectionRange(0, dot > 0 ? dot : f.name.length);
  },

  newFile(dir, then) {
    const name = T.el("input", { class: "t-field", placeholder: "name",
      style: "flex:2" });
    const ext = T.el("input", { class: "t-field", placeholder: "ext",
      value: "txt", style: "flex:1" });
    const go = T.el("button", { class: "t-btn primary", onclick: async () => {
      const e = ext.value.trim().replace(/^\./, "");
      const fname = name.value.trim() + (e ? "." + e : "");
      const rel = dir ? `${dir}/${fname}` : fname;
      const out = await this.auth(() => T.api("/api/files",
        { op: "write", path: rel, text: "", fresh: true, token: this.token() }));
      if (out) { ov.remove(); Sound.commit(); then(); this.open("edit", { path: rel }); }
    } }, "CREATE");
    const ov = this.dialog("NEW FILE",
      T.el("div", { style: "display:flex;gap:8px" }, name, ext),
      T.el("div", { style: "height:8px" }), go);
    const enter = ev => { if (ev.key === "Enter") go.click(); };
    name.onkeydown = enter; ext.onkeydown = enter;
    name.focus();
  },
});
