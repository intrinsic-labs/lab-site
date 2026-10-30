"use strict";
const Brief = {
    label: text => T.el("div", { class: "t-label" }, text),
    render(item, o) {
        const st = item.brief || { state: "pending" };
        if (st.state !== "ready" || !st.brief)
            return this.waiting(item, st, o);
        const b = st.brief;
        const sec = T.el("section", { class: "t-brief" }, T.el("p", { class: "t-brief-q" }, b.question || item.ask));
        if (o.status)
            sec.append(o.status);
        if (b.recommendation) {
            const r = b.recommendation;
            sec.append(this.label("RECOMMENDATION"), T.el("div", { class: "t-rec" }, T.el("p", { class: "t-rec-text" }, String(r.text || "")), r.reason ? T.el("p", {}, T.el("span", { class: "t-inline-label" }, "WHY "), String(r.reason)) : null, r.doubt ? T.el("p", { class: "t-doubt" }, T.el("span", { class: "t-inline-label" }, "DOUBT "), String(r.doubt)) : null));
        }
        if (o.go)
            sec.append(o.go);
        if (b.changed?.length)
            sec.append(this.label("CHANGED SINCE YOU LAST LOOKED"), T.el("ul", { class: "t-list" }, ...b.changed.map(c => T.el("li", {}, String(c)))));
        if (b.body)
            sec.append(T.md(b.body));
        if (b.visual?.html)
            sec.append(Visual.frame(b.visual));
        return sec;
    },
    waiting(item, st, o) {
        const rec = item.recommendation;
        const lead = Content.lead(item);
        const foot = st.state === "not_applicable" ? null : st.state === "failed" ? "NO BRIEF" : "THE BRIEF IS BEING WRITTEN";
        return T.el("section", { class: "t-brief quiet" }, T.el("p", { class: "t-brief-q" }, item.ask || item.title), foot ? T.el("p", { class: "t-foot" }, foot) : null, item.why ? T.el("p", { class: "dim" }, String(item.why)) : null, rec ? T.el("div", { class: "t-rec" }, T.el("div", { class: "t-label" }, `${String(rec.by || "someone").toUpperCase()} RECOMMENDS`), T.md(String(rec.text || ""))) : null, lead ? T.el("div", { class: "t-lead" }, this.label(String(lead.title || "").toUpperCase()), T.md(lead.text || "")) : null, o.go || null);
    },
    answers(b) {
        return T.el("div", { class: "t-answers" }, ...b.answers.map(a => T.el("div", { class: "t-answer" }, T.el("span", { class: "t-verb " + (["approve", "done", "accept"].includes(a.action) ? "ok"
                : a.action === "reject" ? "bad" : "") }, Fmt.verb(a.action)), T.el("span", {}, String(a.effect || "")))));
    },
    source(s, o) {
        const ref = String(s.ref || "");
        const label = String(s.label || ref);
        if (/^https?:\/\//i.test(ref))
            return T.el("a", { class: "t-chip", href: ref, target: "_blank", rel: "noopener noreferrer" }, label + " ↗");
        const path = T.vaultPath(ref);
        if (!path)
            return T.el("span", { class: "t-chip flat", title: ref }, label);
        return T.el("button", { class: "t-chip", type: "button", onclick: () => o.openDoc(path) }, label + " ›");
    },
};
