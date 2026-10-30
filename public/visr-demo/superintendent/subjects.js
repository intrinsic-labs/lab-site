"use strict";
const Subjects = {
    is: t => t?.kind === "project",
    list: t => (Array.isArray(t?.subjects) ? t.subjects : []).filter(s => s && s.id && s.title),
    count(t) {
        const n = kind => this.list(t).filter(s => s.kind === kind).length;
        const say = (k, word) => k ? `${k} ${word}${k === 1 ? "" : "s"}` : "";
        return [say(n("outcome"), "outcome"), say(n("task"), "task")].filter(Boolean).join(" · ");
    },
    titles(t, messages = []) {
        const out = new Map();
        for (const m of messages)
            if (m.subject?.id && m.subject.title)
                out.set(m.subject.id, m.subject.title);
        for (const s of this.list(t))
            out.set(s.id, s.title);
        return out;
    },
    of(m) {
        if (m.role === "event")
            return m.subject?.id ? [m.subject.id] : [];
        if (m.role === "assistant")
            return Array.isArray(m.subjects) ? m.subjects.filter(x => typeof x === "string") : [];
        return typeof m.subject === "string" ? [m.subject] : [];
    },
    about(m, id) { return this.of(m).includes(id); },
    bar(t, chosen, pick) {
        const chip = (id, label, title = "") => T.el("button", { class: `t-subject-chip${(id || null) === (chosen || null) ? " on" : ""}`,
            type: "button", "data-subject": id || "", "aria-pressed": String((id || null) === (chosen || null)),
            ...(title ? { "aria-label": title, title } : {}), onclick: () => pick(id || null) }, label);
        return T.el("div", { class: "t-subjects", role: "toolbar", "aria-label": "Show one outcome" }, chip(null, "All"), ...this.list(t).map(s => chip(s.id, s.id, s.title)));
    },
    earlier(subject, open) {
        if (!subject?.legacyThread)
            return null;
        return T.el("button", { class: "t-subject-earlier t-foot", type: "button", "data-thread": subject.legacyThread,
            "aria-label": `Open the earlier thread for ${subject.title}`, onclick: () => open(subject) }, "Earlier thread", T.el("span", { class: "t-navrow-go", "aria-hidden": "true" }, "›"));
    },
};
