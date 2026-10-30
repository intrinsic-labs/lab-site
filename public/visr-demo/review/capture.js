"use strict";
const PROJECT_KEY = "tycho.desk.project";
const INSPECTION = { inspected: "inspected", limited: "partly inspected", "not-inspected": "stored, not inspected" };
const Capture = {
    render(ctl) {
        const id = "capture";
        const ta = T.el("textarea", { class: "t-textarea t-capture-note", spellcheck: "true", "data-draft": id,
            autocapitalize: "sentences", placeholder: "Note contents" });
        ta.value = Drafts.get(id).text || "";
        const grow = () => { ta.style.height = "auto"; ta.style.height = Math.max(ta.scrollHeight + 4, 240) + "px"; };
        ta.oninput = () => { Drafts.set(id, { text: ta.value }); grow(); };
        const pick = T.el("select", { class: "t-field t-project" }, T.el("option", { value: "" }, "Loading projects…"));
        pick.onchange = () => Store.set(PROJECT_KEY, pick.value || null);
        const dictate = Dictate.attach(ta);
        const tray = Attach.tray(id);
        const say = T.el("div", { class: "t-capture-say" });
        const file = T.el("button", { class: "t-btn primary t-file-it" }, "FILE IT");
        Wire.projects().then(out => {
            if (!out.ok) {
                pick.replaceChildren(T.el("option", { value: "" }, "Couldn't read the projects"));
                return;
            }
            const groups = {};
            for (const p of out.projects || [])
                (groups[p.category] ||= []).push(p);
            pick.replaceChildren(T.el("option", { value: "" }, "Choose a project…"), ...Object.entries(groups).map(([cat, ps]) => T.el("optgroup", { label: cat.toUpperCase() }, ...ps.map(p => T.el("option", { value: p.ref }, p.name)))));
            const last = Store.get(PROJECT_KEY);
            if (last && (out.projects || []).some(p => p.ref === last))
                pick.value = last;
        });
        file.onclick = async () => {
            if (!pick.value)
                return tell("bad", "NOT FILED", "Choose a project first.");
            if (dictate.busy())
                return tell("bad", "NOT FILED", "Wait for the dictation to finish.");
            if (tray.busy())
                return tell("bad", "NOT FILED", "Wait for the attachments to finish uploading.");
            if (!ta.value.trim())
                return tell("bad", "NOT FILED", tray.count()
                    ? "Write the note too. Attachments are filed with a note, not on their own."
                    : "There is nothing to file yet.");
            const attachments = tray.files();
            const request = { project: pick.value, note: ta.value };
            if (attachments.length)
                request.attachments = attachments.map(a => a.path);
            const body = { project: request.project, note: request.note, attachments,
                requestId: Attempts.id("capture", request) };
            file.disabled = true;
            tray.el.inert = true;
            tell("", "FILING…");
            const out = await Tycho.auth(() => Wire.file(body));
            file.disabled = false;
            tray.el.inert = false;
            Attempts.settle("capture", out);
            if (!out)
                return tell("bad", "NOT FILED", "The action token wasn't given. Nothing was cleared.");
            if (!out.ok)
                return tell("bad", "NOT FILED", `${out.reason} Nothing was cleared.`);
            Log.event("capture", LOG.TASK_FILED, out.requestId, { project: out.project, attachments: attachments.length });
            Sound.commit();
            tray.clear(attachments.map(a => a.path));
            if (Drafts.get(id).text === body.note)
                Drafts.set(id, { text: "" });
            if (ta.value === body.note) {
                ta.value = "";
                grow();
            }
            const left = Drafts.get(id);
            if (!left.text && !left.files.length)
                Drafts.clear(id);
            receipt(out);
        };
        const tell = (tone, cap, text) => say.replaceChildren(T.el("div", { class: `t-note ${tone}` }, T.el("div", { class: "t-label" }, cap), text ? T.el("p", {}, text) : null));
        function receipt(out) {
            const ref = out.path || out.rel || out.requestId;
            const filed = Array.isArray(out.attachments) ? out.attachments : [];
            say.replaceChildren(T.el("div", { class: "t-note ok" }, T.el("div", { class: "t-label" }, `FILED · ${Fmt.project(out.project)}`), T.el("p", { class: "t-receipt-id" }, ref), filed.length ? T.el("ul", { class: "t-capture-filed" }, ...filed.map(filedLine)) : null, T.el("div", { class: "t-row" }, T.el("button", { class: "t-btn primary", onclick: () => Tycho.copy(ref, "copied — paste it to Superintendent") }, "COPY"))));
        }
        const filedLine = a => T.el("li", {}, T.el("span", { class: "t-chip-name" }, String(a.filename || a.name || "attachment")), ` · ${INSPECTION[a.inspection] || "stored"}`, a.note ? T.el("span", { class: "t-foot" }, String(a.note)) : null);
        const page = T.el("div", { class: "t-capture-page" }, T.el("div", { class: "t-desk-inner" }, T.el("label", { class: "t-label" }, "PROJECT"), pick, T.el("label", { class: "t-label" }, "NOTE"), ta, tray.el, T.el("div", { class: "t-capture-acts" }, dictate.el, file), say));
        const el = T.el("section", { class: "t-capture", "data-pid": "capture" }, TopBar.render({ title: "Project intake", back: () => ctl.back() }), page);
        requestAnimationFrame(grow);
        return { el, page, focus: () => ta.focus({ preventScroll: true }) };
    },
};
