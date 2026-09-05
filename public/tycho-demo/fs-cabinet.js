/* FS-CABINET — what is in the cabinets. The scene knows nothing about files
   or programs; this is the adapter that turns `/api/files` and the program
   registry into cabinets, drawers, folders and verbs.

   A CABINET IS A REAL DIRECTORY (Asher, 2026-09-03). It was a virtual bank —
   the top-level folders chopped into threes, with a name in a sidecar — and
   so "delete this cabinet" could only ever have meant "trash whichever three
   folders happen to be standing here". The shape on disk is now the shape on
   screen:

     ROOT/<cabinet>/<drawer>/<files>

   so a cabinet's name IS its directory's name, DELETE CABINET is one `trash`
   of one directory (and PUT BACK brings the whole thing home intact), and a
   drawer has no delete path at all — you don't take a single drawer out of a
   cabinet. The only two ways to delete anything here are the can, for files,
   and DELETE CABINET, for cabinets.

   THE FIRST CABINET IS NOT ON DISK. It is TYCHO, the system cabinet, and it
   holds PROGRAMS and — when there are loose files at ROOT — DESK. It cannot
   be renamed or deleted (its caption menu offers NEW CABINET and nothing
   else), and keeping it out of the user's cabinets is what leaves every one
   of them three clean slots.

   ONE DRAWER = ONE DIRECTORY, AND THAT IS THE WHOLE DEPTH (Asher, 2026-09-02:
   "get rid of subfolders as a UI thing altogether"). A folder inside a
   drawer's directory is not shown, and neither is a file sitting loose in a
   cabinet's own directory — same rule, one level up. Inside a drawer every
   entry is a hanging folder holding one file. Right-click on a drawer is
   rename / new file / terminal; right-click on a file is open / rename.

   A drawer's caption — the name and the subtitle on its plate — can be
   edited, for a folder AND for the system drawers, and the edit lives in a
   sidecar the server keeps (`files.py` · `label`) keyed by the drawer's
   ROOT-relative path, so it is the same on every device. */
"use strict";

Tycho.fsCabinet = (function () {
  const fdate = ts => new Date(ts * 1000).toISOString().slice(0, 10);
  const fsize = n => n < 1024 ? `${n}b`
    : n < 1048576 ? `${Math.round(n / 1024)}k` : `${(n / 1048576).toFixed(1)}m`;

  /* extensions worth showing the first lines of on the sheet; anything else
     is described by name/size/date rather than by rendering its bytes */
  const TEXTY = new Set(["md", "markdown", "txt", "text", "json", "js", "mjs",
    "cjs", "ts", "py", "css", "html", "htm", "xml", "yml", "yaml", "toml",
    "ini", "cfg", "conf", "sh", "zsh", "bash", "csv", "tsv", "log", "sql",
    "rs", "go", "c", "h", "cpp", "java", "rb", "swift", "kt", "env", "gitignore"]);
  const ext = name => (name.split(".").pop() || "").toLowerCase();
  const isTexty = f => f.name.startsWith(".")
    ? TEXTY.has(f.name.slice(1).toLowerCase())
    : (f.name.includes(".") && TEXTY.has(ext(f.name)));

  /* lazy by design — a 200-file folder must not read 200 files to render */
  function previewFor(f, rel) {
    if (!isTexty(f)) return `${fsize(f.size)} · ${fdate(f.mtime)}\n\n(no text preview for this kind of file)`;
    return async () => (await T.api("/api/files", { op: "read", path: rel })).text || "(empty file)";
  }

  return { fdate, fsize, TEXTY, isTexty, previewFor };
})();

Object.assign(Tycho, {
  /* the move itself, with no question asked. THERE IS ONE WAY TO DELETE A
     FILE: carry it to the can (Asher, 2026-09-03 — "everything on this
     system there should only be one way to do it"). The DELETE pill and the
     MOVE TO TRASH menu item were removed the same day; carrying a file the
     width of the screen and releasing it over the can IS the confirmation,
     and asking again after that is asking the same question twice.

     It is the Mac's own Trash, so the undo is real: the can opens
     (kernel/trash-view.js) and PUT BACK is right there. A DRAWER has no
     delete path at all, on purpose (Asher, 2026-09-03: "you don't just take
     a single drawer out of a cabinet") — it goes when its CABINET goes, and
     DELETE CABINET on the caption menu is the one verb that does it. */
  async trashNow(f, dir, then) {
    const rel = dir ? `${dir}/${f.name}` : f.name;
    const out = await this.auth(() => T.api("/api/files",
      { op: "trash", path: rel, token: this.token() }));
    if (out) { Sound.commit(); then(); }
    return out;
  },

  /* -- one folder's contents, as scene items ------------------------------
     Files only: a subdirectory is not a thing the drawer can show. */
  async folderContents(path) {
    const { fdate, fsize, isTexty, previewFor } = this.fsCabinet;
    const out = await T.api("/api/files", { op: "list", path });
    this.fsroot = out.root || this.fsroot;
    const refresh = () => this.scene?.refresh();
    const items = [];
    for (const f of (out.entries || []).filter(e => e.kind !== "dir")) {
      const rel = path ? `${path}/${f.name}` : f.name;
      const acts = [
        { label: "OPEN", icon: "doc", primary: true, fn: () => this.open("edit", { path: rel }) },
      ];
      items.push({
        label: f.name,
        meta: `${isTexty(f) ? "TEXT" : "FILE"} · ${fsize(f.size)} · ${fdate(f.mtime)}`,
        preview: previewFor(f, rel),
        actions: acts,
        onOpen: () => acts[0].fn(),
        /* what a DROP ON THE CAN means (scene/index.js) — the unconfirmed
           move, as against the DELETE pill's confirmed one */
        trash: () => this.trashNow(f, path, refresh),
        menu: (x, y) => this.fileMenu(x, y, f, path, refresh),
      });
    }
    return { title: path ? "/" + path : "DESK", items };
  },

  async programsContents() {
    let inst = [];
    try { inst = await T.api("/api/instruments"); } catch { /* offline */ }
    const items = [];
    for (const p of this.programs.values()) {
      if (p.hidden) continue;
      const running = this.apps.has(p.id);
      const stat = inst.find?.(s => s.kind === p.kind);
      const state = running ? "RUNNING"
        : (stat && stat.done < stat.total ? `${stat.done}/${stat.total}` : "AVAILABLE");
      items.push({
        label: p.title,
        meta: `${p.glyph}  ·  ${state}`,
        preview: p.blurb || `${p.title} — no description on file.`,
        actions: [{ label: running ? "RESUME" : "RUN", icon: "focus", primary: true,
          fn: () => this.open(p.id) }],
      });
    }
    return { title: "PROGRAMS", items };
  },

  /* -- the cabinets ----------------------------------------------------------
     One `list` of ROOT names the cabinets; one `list` per cabinet names its
     drawers. Sorted as the server sorts, which is case-insensitive by name,
     so the order a cabinet stands in is a fact about the desktop rather than
     about this session. The system cabinet is built here and is FIRST.

     The caption menu is the cabinet's own — the scene asks the cabinet at
     the bank it is showing, so there is no index arithmetic anywhere. */
  SYSTEM_CABINET: "TYCHO",

  /* the caption menu. NEW CABINET is on every one of them, because it is the
     only place a cabinet can be made; the other three are a user cabinet's. */
  cabinetMenu(cab, e, count) {
    const then = () => this.refreshCabinet();
    const items = [];
    if (!cab.system) items.push(
      { label: "RENAME", icon: "doc", fn: () => this.renameCabinet(cab, then) },
      { label: "NEW DRAWER", icon: "doc", fn: () => this.newDrawer(cab, then) });
    items.push({ label: "NEW CABINET", icon: "doc",
      fn: () => this.newCabinet(count, n => this.goToCabinet(n)) });
    if (!cab.system) items.push({ label: "DELETE CABINET", icon: "doc",
      danger: true, fn: () => this.deleteCabinet(cab, then) });
    this.ctxmenu(e.clientX, e.clientY, items);
  },

  /* the drawers of one cabinet directory. `labels` is read once for the whole
     build and passed down, so this costs one `list` per cabinet and nothing
     else. */
  async cabinetOf(dir, labels) {
    const { fdate } = this.fsCabinet;
    const refresh = () => this.refreshCabinet();
    let entries = [];
    try { entries = (await T.api("/api/files",
      { op: "list", path: dir.name })).entries || []; } catch { /* offline */ }
    const drawers = [];
    /* a file loose in a cabinet's own directory is not a drawer and is not
       shown — the same rule a folder inside a drawer follows */
    for (const f of entries.filter(e => e.kind === "dir")) {
      const key = `${dir.name}/${f.name}`;
      const l = labels[key] || {};
      drawers.push({
        label: (l.name || f.name).toUpperCase(),
        meta: l.meta || `FOLDER · ${fdate(f.mtime)}`,
        load: () => this.folderContents(key),
        menu: (x, y) => this.drawerMenu(x, y,
          { key, path: key, dir: f, label: labels[key] }, refresh),
      });
    }
    return { name: dir.name.toUpperCase(), path: dir.name, system: false, drawers };
  },

  /* PROGRAMS and DESK, in a cabinet that is not on disk */
  systemCabinet(labels, loose) {
    const refresh = () => this.refreshCabinet();
    const cap = (key, name, meta) => {
      const l = labels[key] || {};
      return { label: (l.name || name).toUpperCase(), meta: l.meta || meta };
    };
    const drawers = [{
      ...cap("@programs", "PROGRAMS",
        `${[...this.programs.values()].filter(p => !p.hidden).length} INSTALLED`),
      load: () => this.programsContents(),
      menu: (x, y) => this.drawerMenu(x, y, { key: "@programs", label: labels["@programs"] }, refresh),
    }];
    if (loose) drawers.push({
      ...cap("@desk", "DESK", `${loose} LOOSE FILE${loose === 1 ? "" : "S"}`),
      load: () => this.folderContents(""),
      menu: (x, y) => this.drawerMenu(x, y, { key: "@desk", path: "", label: labels["@desk"] }, refresh),
    });
    return { name: this.SYSTEM_CABINET, path: null, system: true, drawers };
  },

  async cabinets() {
    let fsl = { entries: [], root: "" }, labels = {};
    try {
      fsl = await T.api("/api/files", { op: "list", path: "" });
      labels = (await T.api("/api/files", { op: "labels" })).labels || {};
    } catch { /* offline */ }
    this.fsroot = fsl.root || this.fsroot;
    const entries = fsl.entries || [];
    const list = [this.systemCabinet(labels,
      entries.filter(e => e.kind !== "dir").length)];
    for (const d of entries.filter(e => e.kind === "dir"))
      list.push(await this.cabinetOf(d, labels));
    return list;
  },

  /* the one shape the scene is ever handed: the cabinets, and the hook that
     opens the caption menu of whichever one is standing in view */
  async cabinetView() {
    const list = await this.cabinets();
    return {
      cabinets: list,
      /* the count NEW CABINET numbers its default from is the count of
         cabinets on disk — TYCHO is not one of them, and a default of
         CABINET 03 beside a lone CABINET 01 would be a lie about the shelf */
      cabinetMenu: (cab, e) =>
        this.cabinetMenu(cab, e, list.filter(c => !c.system).length),
    };
  },

  async cabinet() {
    this.scene.boot(await this.cabinetView());
  },

  async refreshCabinet() {
    const view = await this.cabinetView();
    this.scene?.refresh(view);
  },

  /* page the cabinet to the one with this directory name — how a freshly
     made cabinet becomes the one you are looking at, and how a delete lands
     you on the nearest survivor */
  async goToCabinet(name) {
    const view = await this.cabinetView();
    await this.scene?.refresh(view);
    const i = view.cabinets.findIndex(c => c.path === name);
    if (i >= 0) this.scene?.goBank(i);
  },
});
