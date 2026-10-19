/* REVIEW · one document — read it rendered, tap the text to edit the source.

   Asher never needs Obsidian to correct a document: the desk shows it as
   markdown, and EDIT (or a tap on the text) swaps it for its raw source in a
   plain textarea (no live preview — the source IS the thing being edited). SAVE
   writes through `intrinsic doc save` against the fingerprint of the version
   he opened and returns to the rendered view with the runtime's notes;
   CANCEL throws the edit away. SAVE and CANCEL take EDIT's place in the header, so
   the controls stay put and in view however long the document is.

   The edit is a draft (`doc|<path>`) from the first keystroke, so a reload, a
   tab discard or a STALE refusal never loses it. Stale says so plainly and
   offers the fresh version: KEEP MINE re-bases his text on it (SAVE then
   replaces the new version, knowingly), USE THE NEW ONE drops his.

     const v = DocView.create({ path, role, onSaved, hide? });   // hide: field keys shown elsewhere
     v.el · v.load() */
"use strict";

const DocView = {
  create(o) {
    const id = `doc|${o.path}`;
    let doc = null, editing = false;
    const fields = T.el("div");
    const say = T.el("div", { class: "t-doc-say" });
    const body = T.el("div", { class: "t-doc-body" }, T.el("p", { class: "t-foot" }, "READING…"));
    const editBtn = T.el("button", { class: "t-btn", hidden: true, onclick: () => edit(null) }, "EDIT");
    const actions = T.el("div", { class: "t-doc-acts" }, editBtn);
    const el = T.el("article", { class: "t-doc", "data-path": o.path },
      T.el("div", { class: "t-doc-head" },
        T.el("span", { class: "t-label" }, `${String(o.role || "doc").toUpperCase()} · ${o.path.split("/").pop()}`),
        actions),
      fields, say, body);

    /* a note is said where he is looking: brought into view if it landed off-screen */
    const tell = (...nodes) => {
      say.replaceChildren(...nodes.filter(Boolean));
      if (say.firstChild) requestAnimationFrame(() => say.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    };
    const box = (tone, cap, text, ...acts) => T.el("div", { class: `t-note ${tone}` },
      T.el("div", { class: "t-label" }, cap),
      text ? T.el("p", {}, text) : null,
      acts.length ? T.el("div", { class: "t-row" }, ...acts) : null);
    const btn = (label, fn, cls = "") => T.el("button", { class: "t-btn " + cls, onclick: fn }, label);

    const strip = text => text.startsWith("---\n") && text.indexOf("\n---", 4) > 0
      ? text.slice(text.indexOf("\n---", 4) + 4).replace(/^\n+/, "") : text;

    async function load() {
      const out = await Wire.docRead(o.path);
      if (!out.ok) {
        body.replaceChildren(box("bad", "COULDN'T READ THIS DOCUMENT", out.reason, btn("TRY AGAIN", load)));
        return false;
      }
      doc = out;
      drawFields();
      const d = Drafts.get(id);
      if (d.base && d.text) edit(d.text, "Your unsaved edit was restored.");
      else rendered();
      return true;
    }

    function drawFields() {
      const shown = (doc.fields || []).filter(f => !(o.hide || []).includes(f.key));
      fields.replaceChildren(Fields.render(shown, { set: setField }) || "");
      fields.querySelectorAll("button, input, select").forEach(c => { c.disabled = editing; });
    }

    function rendered() {
      editing = false;
      editBtn.hidden = false;
      actions.replaceChildren(editBtn);
      drawFields();
      const md = T.md(strip(doc.text), { base: o.path });
      const view = T.el("div", { class: "t-doc-rendered", role: "button", tabindex: "0",
        "aria-label": "tap to edit the source" }, md);
      view.addEventListener("click", e => {
        if (e.target.closest("a, button, summary")) return;
        if (String(getSelection() || "").trim()) return;
        edit(null);
      });
      view.addEventListener("keydown", e => { if (e.key === "Enter" && e.target === view) edit(null); });
      body.replaceChildren(view);
    }

    function edit(text, note) {
      editing = true;
      editBtn.hidden = true;
      drawFields();
      const ta = T.el("textarea", { class: "t-textarea t-source", spellcheck: "true",
        autocapitalize: "sentences" });
      ta.value = text ?? doc.text;
      const grow = () => T.keepScroll(ta, () => {
        ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 4 + "px";
      });
      ta.oninput = () => { Drafts.set(id, { text: ta.value, base: doc.fingerprint }); grow(); };
      const save = btn("SAVE", () => submit(ta, save), "primary");
      /* SAVE and CANCEL take EDIT's place at the top, so the controls never move */
      actions.replaceChildren(btn("CANCEL", () => { Drafts.clear(id); tell(); rendered(); }), save);
      body.replaceChildren(ta);
      if (note) tell(box("", "EDITING", note));
      requestAnimationFrame(grow);
      if (text == null) ta.focus({ preventScroll: true });
    }

    async function submit(ta, save) {
      save.disabled = true;
      const base = Drafts.get(id).base || doc.fingerprint;
      const sent = ta.value;
      const out = await Tycho.auth(() => Wire.docSave({ path: o.path, fingerprint: base, text: sent }));
      save.disabled = false;
      if (!out) return tell(box("bad", "NOT SAVED", "The action token wasn't given."));
      if (out.ok && ta.isConnected && ta.value !== sent) return savedWhileTyping(ta, out);
      if (out.ok) return saved(out);
      if (out.code === "stale") return stale(ta);
      tell(box("bad", "NOT SAVED", out.reason));
    }

    function stale(ta) {
      Drafts.set(id, { text: ta.value, base: Drafts.get(id).base || doc.fingerprint });
      tell(box("amber", "THIS DOCUMENT CHANGED ON THE MAC",
        "Someone saved it after you opened it. Nothing was saved. Your text is kept.",
        btn("RELOAD IT", async () => {
          const mine = Drafts.get(id).text;
          const out = await Wire.docRead(o.path);
          if (!out.ok) return tell(box("bad", "RELOAD FAILED", out.reason));
          doc = out;
          tell(box("amber", "RELOADED",
            "Your text is still in the editor. KEEP MINE makes SAVE replace the new version; USE THE NEW ONE drops yours.",
            btn("KEEP MINE", () => { Drafts.set(id, { text: mine, base: doc.fingerprint }); tell(); edit(mine); }),
            btn("USE THE NEW ONE", () => { Drafts.clear(id); tell(); rendered(); })));
        })));
    }

    /* he kept typing while the save was out: what he had at SAVE is on the
       Mac, and what he typed since stays in the editor as an unsaved edit on
       top of it, never thrown away by the reload */
    async function savedWhileTyping(ta, out) {
      Sound.commit();
      const fresh = await Wire.docRead(o.path);
      if (fresh.ok) { doc = fresh; drawFields(); }
      Drafts.set(id, { text: ta.value, base: doc.fingerprint });
      tell(box("ok", "SAVED", "Saved what you had when you tapped SAVE. What you typed since is still here, not yet saved.",
        ...(out.notes || []).map(n => T.el("p", {}, String(n)))));
      o.onSaved?.(out);
    }

    async function saved(out) {
      Drafts.clear(id);
      Sound.commit();
      await load();
      tell(T.el("div", { class: "t-note ok" }, T.el("div", { class: "t-label" }, "SAVED"),
        ...(out.notes || []).map(n => T.el("p", {}, String(n)))));
      o.onSaved?.(out);
    }

    async function setField(key, value) {
      if (!doc || editing) return;
      const out = await Tycho.auth(() => Wire.docSave({ path: o.path, fingerprint: doc.fingerprint, set: { [key]: value } }));
      if (!out) return tell(box("bad", "NOT SET", "The action token wasn't given."));
      if (out.ok) return saved(out);
      if (out.code === "stale") {
        await load();
        return tell(box("amber", "THIS DOCUMENT CHANGED ON THE MAC", "It was reloaded; nothing was set. Try again."));
      }
      tell(box("bad", "NOT SET", out.reason));
    }

    return { el, load, get editing() { return editing; } };
  },
};
