/* REVIEW · capture — New note, from home's menu: write it down.

   TASK's whole capability, nothing more: one free-text note filed to one
   project's intake through `intrinsic intake file` (tycho/intake.py), where
   the drafter turns it into work. The note is a draft from the first
   keystroke and is cleared only once the Mac says it is filed. On success it
   shows the note's vault path with a one-tap COPY, so Asher can paste it to
   Superintendent to point at the dump.

   Two things the runtime does not do yet, and this screen does not pretend
   to: route a note to Superintendent without naming a project (the CLI
   requires `--project`), and carry attachments (`intake file` reads text
   only). So a project is required (the last one used is preselected), and
   the attachment tray, already built, waits behind CAPTURE_ATTACHMENTS.

   Each note carries a request id minted on its first send and reused while
   the text and project are unchanged, so FILE pressed again after a lost
   answer finds the first note instead of filing a second.

   Under the note, DICTATE and FILE IT share one row, DICTATE left and
   FILE IT right; dictation's status line wraps under them. */
"use strict";

const CAPTURE_ATTACHMENTS = false;
const PROJECT_KEY = "tycho.desk.project";

const Capture = {
  render(ctl) {
    const id = "capture";
    const ta = T.el("textarea", { class: "t-textarea t-capture-note", spellcheck: "true", "data-draft": id,
      autocapitalize: "sentences", placeholder: "Note contents" });
    ta.value = Drafts.get(id).text || "";
    const grow = () => { ta.style.height = "auto"; ta.style.height = Math.max(ta.scrollHeight + 4, 240) + "px"; };
    ta.oninput = () => { Drafts.set(id, { text: ta.value }); grow(); };

    const pick = T.el("select", { class: "t-field t-project" },
      T.el("option", { value: "" }, "Loading projects…"));
    pick.onchange = () => Store.set(PROJECT_KEY, pick.value || null);
    const dictate = Dictate.attach(ta);
    const tray = CAPTURE_ATTACHMENTS ? Attach.tray(id) : null;
    const say = T.el("div", { class: "t-capture-say" });
    const file = T.el("button", { class: "t-btn primary t-file-it" }, "FILE IT");

    Wire.projects().then(out => {
      if (!out.ok) {
        pick.replaceChildren(T.el("option", { value: "" }, "Couldn't read the projects"));
        return;
      }
      const groups = {};
      for (const p of out.projects || []) (groups[p.category] ||= []).push(p);
      pick.replaceChildren(T.el("option", { value: "" }, "Choose a project…"),
        ...Object.entries(groups).map(([cat, ps]) => T.el("optgroup", { label: cat.toUpperCase() },
          ...ps.map(p => T.el("option", { value: p.ref }, p.name)))));
      const last = Store.get(PROJECT_KEY);
      if (last && (out.projects || []).some(p => p.ref === last)) pick.value = last;
    });

    file.onclick = async () => {
      if (!pick.value) return tell("bad", "NOT FILED", "Choose a project first.");
      if (dictate.busy()) return tell("bad", "NOT FILED", "Wait for the dictation to finish.");
      if (!ta.value.trim()) return tell("bad", "NOT FILED", "There is nothing to file yet.");
      /* the same note to the same project is the same request, even after a
         reload: a filing whose answer was lost is never filed twice */
      const request = { project: pick.value, note: ta.value };
      const body = { ...request, requestId: Attempts.id("capture", request) };
      file.disabled = true;
      tell("", "FILING…");
      const out = await Tycho.auth(() => Wire.file(body));
      file.disabled = false;
      Attempts.settle("capture", out);
      if (!out) return tell("bad", "NOT FILED", "The action token wasn't given. Nothing was cleared.");
      if (!out.ok) return tell("bad", "NOT FILED", `${out.reason} Nothing was cleared.`);
      Log.event("capture", LOG.TASK_FILED, out.requestId, { project: out.project });
      Sound.commit();
      if (ta.value === body.note) { ta.value = ""; Drafts.clear(id); grow(); }
      receipt(out);
    };

    const tell = (tone, cap, text) => say.replaceChildren(T.el("div", { class: `t-note ${tone}` },
      T.el("div", { class: "t-label" }, cap), text ? T.el("p", {}, text) : null));

    function receipt(out) {
      const ref = out.path || out.rel || out.requestId;
      say.replaceChildren(T.el("div", { class: "t-note ok" },
        T.el("div", { class: "t-label" }, `FILED · ${Fmt.project(out.project)}`),
        T.el("p", { class: "t-receipt-id" }, ref),
        T.el("div", { class: "t-row" },
          T.el("button", { class: "t-btn primary", onclick: () => Tycho.copy(ref, "copied — paste it to Superintendent") }, "COPY"))));
    }

    const page = T.el("div", { class: "t-capture-page" },
      T.el("div", { class: "t-desk-inner" },
        T.el("label", { class: "t-label" }, "PROJECT"), pick,
        T.el("label", { class: "t-label" }, "NOTE"), ta,
        T.el("div", { class: "t-capture-acts" }, dictate.el, file),
        tray?.el || null,
        say));
    const el = T.el("section", { class: "t-capture", "data-pid": "capture" },
      TopBar.render({ title: "Project intake", back: () => ctl.back() }), page);
    requestAnimationFrame(grow);
    return { el, page, focus: () => ta.focus({ preventScroll: true }) };
  },
};
