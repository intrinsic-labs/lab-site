"use strict";
const Cards = {
    title(it) {
        const ready = it.brief?.state === "ready" && it.brief.brief;
        return String(ready?.cardTitle || it.brief?.previous?.cardTitle || "").trim() || String(it.title || it.key);
    },
    paper({ meta, status = [], prs = null, question, extra = [] }) {
        const marks = status.filter(Boolean);
        return T.el("div", { class: "t-paper" }, meta ? T.el("div", { class: "t-paper-meta" }, meta) : null, marks.length ? T.el("div", { class: "t-paper-status" }, ...marks.flatMap((m, i) => (i ? [" · ", m] : [m]))) : null, prs, T.el("div", { class: "t-paper-q" }, question), ...extra);
    },
    item(it) {
        const ready = it.brief?.state === "ready" && it.brief.brief;
        const awaiting = Fmt.awaiting(it);
        const rec = awaiting ? null : ready ? ready.recommendation : it.recommendation;
        const name = String(it.brief?.previous?.question || it.title || it.key);
        const extra = [];
        if (rec?.text)
            extra.push(T.el("div", { class: "t-paper-rec" }, T.el("span", { class: "t-paper-label" }, ready ? "RECOMMENDED " : `${String(rec.by || "").toUpperCase()} RECOMMENDS `), String(rec.text)));
        const rule = Fmt.rule(it);
        if (rule)
            extra.push(T.el("div", { class: "t-paper-rec" }, T.el("span", { class: "t-paper-label" }, "BY RULE "), rule));
        const lead = Content.lead(it);
        if (lead)
            extra.push(T.el("div", { class: "t-paper-lead" }, T.el("div", { class: "t-label" }, String(lead.title || "").toUpperCase()), T.md(lead.text || "")));
        if (!awaiting && (it.brief?.state === "pending" || !it.brief))
            extra.push(T.el("div", { class: "t-paper-label" }, "THE BRIEF IS BEING WRITTEN"));
        const due = Fmt.day(Fmt.due(it));
        const status = () => [
            Working.tag(it),
            Interactive.tag(it),
            Pending.tag(it.key),
            it.blocked ? T.el("span", { class: "t-paper-later" }, "BLOCKED") : null,
            it.deferred && !it.blocked ? T.el("span", { class: "t-paper-later" }, "LATER") : null,
            awaiting ? T.el("span", { class: "t-paper-awaiting" }, awaiting.mark) : null,
            due ? `DUE ${due}` : null,
            ["feedback", "reject", "park", "handback", "block", "route", "undo"].some(a => Drafts.has(`${it.key}|${a}`)) ? "UNSENT DRAFT" : null,
        ];
        return {
            key: it.key, item: it,
            title: this.title(it),
            paper: () => this.paper({ meta: Fmt.meta(it), status: status(), prs: PrLinks.strip(it, "t-paper-prs"), extra,
                question: awaiting ? T.el("span", { class: "t-paper-awaiting-q" }, awaiting.line) : ready ? Fmt.question(it) : name }),
        };
    },
    empty(checked, { question, filter } = {}) {
        return {
            key: "empty", title: "Nothing waiting",
            paper: () => this.paper({ question: question || "Nothing is waiting on you.",
                meta: filter ? `SHOWING · ${filter.toUpperCase()}` : null,
                extra: checked ? [T.el("div", { class: "t-paper-label" }, `CHECKED ${checked}`)] : [] }),
        };
    },
    fault(e) {
        return {
            key: "fault", title: "No signal",
            paper: () => this.paper({ question: "The queue couldn't be read.",
                extra: [T.el("div", { class: "t-paper-text" }, T.fault(e).head),
                    T.el("div", { class: "t-paper-label" }, "TAP TO TRY AGAIN")] }),
        };
    },
};
