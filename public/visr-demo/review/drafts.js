/* REVIEW · drafts — whatever Asher has written and not yet sent, kept on the
   device until the Mac accepts it.

   One draft per place he writes: `<key>|feedback`, `<key>|reject`, `capture`,
   and `doc|<path>` for a document mid-edit. A draft is `{text, files, base?, nextLook?}`
   — `files` are attachments ALREADY staged on the Mac (their metadata, not
   their bytes), `base` the fingerprint a document edit started from. Kept in
   memory and written to storage a beat after the last keystroke (WRITE_MS),
   and at once when the app is hidden or closed, so an Android tab discard
   loses nothing without rewriting every draft on every key; cleared only
   when the send is accepted. */
"use strict";

const Drafts = {
  KEY: "tycho.desk.drafts",
  WRITE_MS: 300,
  mem: null, timer: 0,
  all() { return this.mem ??= (Store.get(this.KEY, {}) || {}); },
  /* to storage now, or a beat from now */
  write(now = true) {
    clearTimeout(this.timer);
    this.timer = 0;
    if (now) { if (this.mem) Store.set(this.KEY, this.mem); }
    else this.timer = setTimeout(() => this.write(true), this.WRITE_MS);
  },
  get(id) { return { text: "", files: [], ...(this.all()[id] || {}) }; },
  has(id) {
    const d = this.all()[id];
    return Boolean(d && (String(d.text || "").trim() || String(d.nextLook || "").trim() || d.by || (d.files || []).length));
  },
  set(id, patch) {
    const all = this.all();
    all[id] = { ...this.get(id), ...patch, at: Date.now() };
    this.write(false);
  },
  clear(id) {
    const all = this.all();
    delete all[id];
    this.write();
  },
  clearItem(key) {
    const all = this.all();
    for (const id of Object.keys(all)) if (id.startsWith(key + "|")) delete all[id];
    this.write();
  },
};

/* the beat's pending write lands before the page can be frozen or closed */
addEventListener("pagehide", () => Drafts.write());
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") Drafts.write(); });
