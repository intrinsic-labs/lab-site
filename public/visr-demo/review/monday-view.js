"use strict";
const MondayView = {
    date: s => new Date(`${s}T00:00:00`),
    title(s, today) {
        const d = this.date(s);
        const year = d.getFullYear() !== this.date(today || s).getFullYear();
        return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", ...(year ? { year: "numeric" } : {}) });
    },
    due: s => MondayView.date(s).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
        .replace(/,/g, "").toUpperCase(),
    short: s => MondayView.date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase(),
    at(iso) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) {
            return MondayView.date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
        const t = new Date(iso || "");
        return Number.isFinite(t.getTime()) ? t.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
    },
    ago(s, today) {
        const days = Math.round((this.date(today) - this.date(s)) / 86_400_000);
        if (!Number.isFinite(days) || days < 0)
            return "";
        const weeks = Math.floor(days / 7);
        return weeks === 0 ? "THIS WEEK" : weeks === 1 ? "LAST WEEK" : `${weeks} WEEKS AGO`;
    },
    head(m, step) {
        const nav = (to, label, cls, aria) => T.el("button", { class: `t-btn t-monday-step ${cls}`, type: "button",
            disabled: to ? null : "", "aria-label": to ? `${aria}: ${this.title(to, m.today)}` : `No ${aria.toLowerCase()} meeting`,
            onclick: () => to && step(to) }, label);
        return T.el("header", { class: "t-monday-head" }, T.el("div", { class: "t-foot" }, this.ago(m.date, m.today) || "MONDAY MEETING"), T.el("h1", { class: "t-title t-monday-title" }, this.title(m.date, m.today)), T.el("div", { class: "t-monday-nav" }, nav(m.previous, m.previous ? `‹ ${this.short(m.previous)}` : "‹ PREVIOUS", "prev", "Previous"), nav(m.next, m.next ? `${this.short(m.next)} ›` : "NEXT ›", "next", "Next")));
    },
    body(m) {
        const out = [T.el("div", { class: "t-label" }, "STATE OF THE COMPANY")];
        out.push(m.note?.markdown
            ? T.el("div", { class: "t-monday-note" }, T.md(m.note.markdown, { base: m.path || "" }))
            : T.el("p", { class: "dim" }, "No note was written for this meeting."));
        const actions = m.actions || [];
        const done = actions.filter(a => a.done).length;
        out.push(T.el("div", { class: "t-label" }, actions.length ? `ACTIONS · ${done} OF ${actions.length} DONE` : "ACTIONS"));
        out.push(actions.length ? T.el("ul", { class: "t-monday-actions" }, ...actions.map(a => this.action(a)))
            : T.el("p", { class: "dim" }, "No actions were recorded."));
        const problems = (m.problems || []).filter(p => p && p.date);
        if (problems.length)
            out.push(T.el("div", { class: "t-monday-problems t-foot" }, ...problems.map(p => T.el("p", {}, `${this.short(p.date)} COULDN'T BE READ: `, T.el("span", { class: "why" }, String(p.reason || ""))))));
        return out;
    },
    state: a => a.proof ? "proven" : a.done || a.reported ? "reported" : a.overdue ? "overdue" : "open",
    action(a) {
        const state = this.state(a);
        const word = { proven: "PROVEN", reported: "REPORTED DONE", overdue: "OVERDUE", open: "" }[state];
        const box = T.el("span", { class: "t-monday-box", role: "img", "aria-label": word ? word.toLowerCase() : "open" });
        if (state === "proven" || state === "reported")
            box.append(Icons.node("check"));
        const text = T.el("span", { class: "t-monday-text" });
        text.innerHTML = T.mdInline(String(a.text || ""));
        const meta = T.el("div", { class: "t-monday-meta t-foot" }, T.el("span", {}, String(a.dri || "")), a.due ? T.el("span", { class: "when" }, this.due(a.due)) : null, word ? T.el("span", { class: "state" }, word) : null);
        const when = a.proof && this.at(a.proof.at);
        const proof = a.proof ? T.el("div", { class: "t-monday-proof" }, String(a.proof.detail || ""), a.proof.detail && when ? " · " : null, when ? T.el("span", { class: "nowrap" }, when) : null) : null;
        return T.el("li", { class: `t-monday-action ${state}` }, box, T.el("div", { class: "t-monday-what" }, text, meta, proof));
    },
};
