"use strict";
const Lanes = {
    ALL: ["decide", "do", "happened"],
    LABEL: { decide: "Decide", do: "Do", happened: "Happened" },
    DO_KINDS: ["chore", "linear"],
    of(item) {
        if (this.ALL.includes(item?.lane))
            return item.lane;
        if (item?.kind === "receipt" || item?.kind === "owner_release")
            return "happened";
        return this.DO_KINDS.includes(item?.kind) ? "do" : "decide";
    },
    happened(item) { return this.of(item) === "happened"; },
    focused(item) { return item?.inFocus !== false; },
    items(data) {
        const items = data?.items || [];
        const released = Array.isArray(data?.happened) ? data.happened : [];
        return released.length ? [...items, ...released.map(r => this.release(r))] : items;
    },
    release(r) {
        const facts = [["outcome", r.outcomeId], ["run", r.runId], ["released", r.at],
            ...(r.destination ? [["where", r.destination]] : [])].filter(([, v]) => v);
        const evidence = (r.evidence || []).filter(Boolean);
        return {
            key: String(r.key), kind: "owner_release", lane: "happened", inFocus: true,
            outcomeId: r.outcomeId ? String(r.outcomeId) : null,
            revision: String(r.runId || r.at || ""), project: r.project, title: String(r.title || r.outcomeId || r.key),
            why: "", recommendation: null, since: r.at, actions: [], notes: [], deferred: null,
            working: null, workingCleared: null, awaiting: null, docs: [],
            pullRequests: Array.isArray(r.pullRequests) ? r.pullRequests : [],
            ask: "Nothing to decide: this already happened.",
            brief: { state: "not_applicable", reason: "A release receipt asks nothing." },
            content: [
                { type: "markdown", title: "What happened", text: String(r.summary || "Released after your accept.") },
                { type: "facts", rows: facts },
                ...(evidence.length ? [{ type: "markdown", title: "Evidence", text: evidence.map(e => `- ${e}`).join("\n") }] : []),
            ],
        };
    },
};
const DeckFilter = {
    KEY: "tycho.deck.filter",
    HIDE: ["later", "blocked", "linear"],
    HIDE_LABEL: { later: "Later", blocked: "Blocked", linear: "Linear" },
    LANES: ["decide", "do"],
    NONE: Object.freeze({ working: false, hide: [], project: null, lanes: ["decide", "do"] }),
    normal(v) {
        const none = () => ({ ...this.NONE, lanes: [...this.LANES] });
        if (v === "hide-later")
            return { ...none(), hide: ["later"] };
        if (v === "working")
            return { ...none(), working: true };
        if (typeof v === "string" && v.startsWith("project:") && v.length > 8)
            return { ...none(), project: v.slice(8) };
        if (!v || typeof v !== "object")
            return none();
        const lanes = Lanes.ALL.filter(l => Array.isArray(v.lanes) && v.lanes.includes(l));
        return {
            working: v.working === true,
            hide: this.HIDE.filter(h => Array.isArray(v.hide) && v.hide.includes(h)),
            project: typeof v.project === "string" && v.project ? v.project : null,
            lanes: lanes.length ? lanes : [...this.LANES],
        };
    },
    defaultLanes(f) { return f.lanes.join() === this.LANES.join(); },
    all(f) { return !f.working && !f.hide.length && !f.project && this.defaultLanes(f); },
    get() { return this.normal(Store.get(this.KEY)); },
    set(f) { const n = this.normal(f); Store.set(this.KEY, this.all(n) ? null : n); },
    apply(items, f) {
        return (items || []).filter(i => f.lanes.includes(Lanes.of(i)) &&
            (f.project ? i.project === f.project : Lanes.focused(i)) &&
            (!f.working || !!i.working) &&
            !(f.hide.includes("later") && i.deferred) &&
            !(f.hide.includes("blocked") && i.blocked) &&
            !(f.hide.includes("linear") && i.kind === "linear"));
    },
    hidden(f) { return f.hide.map(h => this.HIDE_LABEL[h].toLowerCase()).join(", "); },
    lanes(f) { return f.lanes.map(l => Lanes.LABEL[l]).join(", "); },
    label(f) {
        if (this.all(f))
            return "All";
        return [this.defaultLanes(f) ? null : this.lanes(f), f.project ? Fmt.project(f.project) : null,
            f.working ? "I'm on it" : null, f.hide.length ? `Hide ${this.hidden(f)}` : null].filter(Boolean).join(" · ");
    },
    empty(f, items = []) {
        const lanes = !this.defaultLanes(f);
        const only = [lanes, f.project, f.working, f.hide.length].filter(Boolean).length === 1;
        if (only && lanes && f.lanes.join() === "happened")
            return "Nothing has happened lately.";
        if (only && lanes)
            return `Nothing in ${this.lanes(f).replace(/, ([^,]*)$/, " or $1")}.`;
        if (only && f.project)
            return `Nothing waiting in ${Fmt.project(f.project)}.`;
        if (only && f.working)
            return "Nothing you're on.";
        if (only)
            return `Nothing waiting except ${this.hidden(f).replace(", ", " or ")} items.`;
        if (this.all(f))
            return items.some(i => !Lanes.focused(i) && f.lanes.includes(Lanes.of(i)))
                ? "Nothing in focus is waiting. By project shows the rest." : "Nothing is waiting on you.";
        return "Nothing waiting under these filters.";
    },
    reveal(f, item) {
        if (this.apply([item], f).length)
            return f;
        const lane = Lanes.of(item);
        const next = {
            lanes: f.lanes.includes(lane) ? f.lanes : [...f.lanes, lane],
            working: f.working && !!item.working,
            hide: f.hide.filter(h => !(h === "later" && item.deferred) && !(h === "blocked" && item.blocked)
                && !(h === "linear" && item.kind === "linear")),
            project: !Lanes.focused(item) ? item.project || null : f.project === item.project ? f.project : null,
        };
        return this.apply([item], next).length ? next : { ...this.NONE, lanes: [...Lanes.ALL], project: item.project || null };
    },
    projects(items, f = this.NONE) {
        const n = new Map();
        for (const i of items || [])
            if (i.project && f.lanes.includes(Lanes.of(i)))
                n.set(i.project, (n.get(i.project) || 0) + 1);
        return [...n].map(([path, count]) => ({ path, name: Fmt.project(path), count }))
            .sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
    },
};
