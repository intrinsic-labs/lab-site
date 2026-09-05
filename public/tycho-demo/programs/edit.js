/* EDIT — the plain text editor. One concern: a textarea that autosaves
   (debounced + on blur, no save button). WHERE the text lives is the
   caller's concern, passed through Tycho.open args as a source:

     { path }                  a desktop file (/api/files, token-gated)
     { name, load, save }      anything else — a program hands text over
                               this way, and the rules for saving it stay
                               with that program rather than moving here.

   save(text) resolves truthy when the write landed; null/undefined means
   it didn't and the editor keeps the text dirty. */
"use strict";

Tycho.register({
  id: "edit", kind: null, hidden: true,
  title: "EDIT", glyph: "≣",

  mount(w) {
    const ta = T.el("textarea", { class: "t-editor", spellcheck: "false",
      placeholder: "empty file" });
    let src = null, persisted = "", timer = null;

    /* the save state is the ONLY feedback this program gives — there is no
       save button — so it carries a machine-readable `kind` beside its words.
       At desktop width the styling is unchanged (`.dim`, as it always was);
       the mobile stylesheet is what turns it into something readable at arm's
       length, because a phone is where "did that save?" is actually asked. */
    const state = (msg, kind = "note") => w.statusbar.replaceChildren(
      T.el("b", {}, src ? src.name : "no file"),
      T.el("span", { style: "flex:1" }),
      T.el("span", { class: "dim save-state", "data-state": kind }, msg));

    const fileSource = path => ({
      name: path.split("/").pop(),
      load: async () => (await T.api("/api/files", { op: "read", path })).text,
      save: text => Tycho.auth(() => T.api("/api/files",
        { op: "write", path, text, token: Tycho.token() })),
    });

    const persist = async () => {
      if (!src || ta.value === persisted) return;
      const want = ta.value;
      const out = await src.save(want);
      if (out) { persisted = want; state("SAVED", "saved"); }
      else state("NOT SAVED", "fail");
    };

    ta.oninput = () => { state("UNSAVED", "dirty");
      clearTimeout(timer); timer = setTimeout(persist, 900); };
    ta.onblur = () => { clearTimeout(timer); persist(); };
    /* tab inserts a tab — an editor that changes focus on Tab isn't one */
    ta.onkeydown = e => {
      if (e.key !== "Tab") return;
      e.preventDefault();
      const s = ta.selectionStart;
      ta.setRangeText("\t", s, ta.selectionEnd, "end");
      ta.oninput();
    };

    async function open(spec) {
      await persist();                  /* don't drop the previous source's tail */
      src = spec.path ? fileSource(spec.path) : spec;
      w.setTitle(`EDIT — ${src.name}`);
      try {
        ta.value = persisted = String(await src.load() ?? "");
        state("SAVED", "saved");
      } catch (e) {
        ta.value = persisted = "";
        state(String(e.message), "fail");
      }
      ta.focus();
    }

    w.body.style.padding = "0";
    w.body.replaceChildren(ta);
    w.onWake(spec => { if (spec) open(spec); });
    if (w.args) open(w.args);
    else state("opened with no file — use FILES or the desktop");
  },
});
