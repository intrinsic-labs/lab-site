"use strict";
const AwayBox = {
    ROUTINE: "◷",
    gist(text) {
        const line = String(text || "").split("\n").map(l => l.trim()).find(Boolean) || "";
        return line.replace(/^(#+|[-*+]|\d+\.)\s+/, "").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
            .replace(/(\*\*|__|`)/g, "").replace(/(^|\s)[*_]([^*_]+)[*_](?=\s|$)/g, "$1$2").trim();
    },
    line(items) {
        const routine = items.find(m => m.routine);
        if (routine)
            return { mark: this.ROUTINE, who: String(routine.routine.title || "Routine"), what: this.gist(routine.text), kind: "routine", extra: 0 };
        const wakes = Episodes.wakes(items);
        const w = wakes[0];
        if (w)
            return { mark: Messages.MARKS[w.source?.kind] || "·", who: String(w.source?.name || ""), what: String(w.text || ""),
                kind: w.source?.kind || "", extra: wakes.length - 1 };
        return { mark: "·", who: "Reply", what: this.gist(items[0].text), kind: "reply", extra: 0 };
    },
    title(items) { return `${this.line(items).who} · ${Messages.when(items[0].at)}`; },
    mark(kind) { return Messages.MARKS[kind] || { task: "→", project: "□" }[kind] || "·"; },
    thread(t, open) {
        const who = String(t.title || "");
        const what = String(t.line || "");
        const when = Messages.clock(t.at);
        const end = t.busy ? T.el("span", { class: "t-away-busy" }, Messages.spin())
            : t.error ? T.el("span", { class: "t-away-err t-foot" }, "NO REPLY")
                : when ? T.el("span", { class: "t-away-time t-foot" }, when) : null;
        const state = t.busy ? "; working on it now" : t.error ? `; no reply: ${t.error}` : "";
        const cls = ["t-away", "thread", t.kind, t.busy && "busy", t.error && !t.busy && "failed"].filter(Boolean).join(" ");
        const count = Subjects.is(t) ? Subjects.count(t) : "";
        return T.el("button", { class: cls,
            type: "button", "data-thread": String(t.id || ""), "data-kind": String(t.kind || ""),
            "aria-label": `${who}${count ? `, ${count}` : ""}${when ? ` at ${when}` : ""}${what ? `: ${what}` : ""}${state}. Open the thread`,
            onclick: () => open(t) }, T.el("span", { class: "t-event-mark", "aria-hidden": "true" }, this.mark(t.kind)), T.el("span", { class: "t-away-text" }, T.el("b", {}, who)), end, T.el("span", { class: "t-navrow-go", "aria-hidden": "true" }, "›"), what || count ? T.el("span", { class: "t-away-line what" }, count ? T.el("span", { class: `t-away-count${what ? " lead" : ""}` }, count) : null, what) : null);
    },
    node(items, open) {
        const { mark, who, what, kind, extra } = this.line(items);
        const when = Messages.clock(items[0].at);
        return T.el("button", { class: `t-away ${kind}`.trim(), type: "button", "data-first": items[0].id || "", "data-kind": kind,
            "aria-label": `${who}${when ? ` at ${when}` : ""}: ${what}. Open it`, onclick: () => open(items) }, T.el("span", { class: "t-event-mark", "aria-hidden": "true" }, mark), T.el("span", { class: "t-away-text" }, T.el("b", {}, who), extra ? ` +${extra}` : "", " · ", T.el("span", { class: "what" }, what)), when ? T.el("span", { class: "t-away-time t-foot" }, when) : null, T.el("span", { class: "t-navrow-go", "aria-hidden": "true" }, "›"));
    },
};
