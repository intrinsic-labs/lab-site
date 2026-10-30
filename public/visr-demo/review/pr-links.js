"use strict";
const PrLinks = {
    REPO: /^[\w.-]+\/[\w.-]+$/,
    STATES: ["open", "draft", "merged", "closed"],
    URL: /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+\/[\w.-]+)\/pull\/(\d+)(?:[/?#]\S*)?$/i,
    clean(pr) {
        if (!pr || typeof pr !== "object")
            return null;
        const given = String(pr.url || "").trim();
        const parsed = this.URL.exec(given);
        const number = Number(pr.number ?? parsed?.[2]);
        const repo = String(pr.repo || parsed?.[1] || "").trim();
        if (!Number.isInteger(number) || number <= 0 || !this.REPO.test(repo))
            return null;
        const url = /^https:\/\//i.test(given) ? given : `https://github.com/${repo}/pull/${number}`;
        const state = this.STATES.includes(pr.state) ? pr.state : null;
        return { url, repo, number, state };
    },
    of(item) {
        const out = [];
        for (const pr of Array.isArray(item?.pullRequests) ? item.pullRequests : []) {
            const c = this.clean(pr);
            if (c && !out.some(o => this.ref(o).toLowerCase() === this.ref(c).toLowerCase()))
                out.push(c);
        }
        return out;
    },
    short: repo => String(repo).split("/").pop(),
    ref: pr => `${pr.repo}#${pr.number}`,
    label(pr, prs = [pr]) {
        const short = this.short(pr.repo).toLowerCase();
        const clash = prs.some(o => o.repo.toLowerCase() !== pr.repo.toLowerCase() && this.short(o.repo).toLowerCase() === short);
        return `#${pr.number} ${clash ? pr.repo : this.short(pr.repo)}`;
    },
    icon(pr) {
        const state = pr.state || "unknown";
        const svg = Icons.node(`pr-${pr.state || "open"}`);
        svg.classList.add("t-pr-icon", `pr-${state}`);
        return svg;
    },
    named(pr) { return [this.ref(pr), pr.state].filter(Boolean).join(", "); },
    link(pr, prs) {
        const named = this.named(pr);
        return T.el("a", { class: "t-pr", href: pr.url, target: "_blank", rel: "noopener noreferrer",
            "data-state": pr.state || "unknown", title: named, "aria-label": `Pull request ${named}, opens GitHub` }, this.icon(pr), T.el("span", { class: "t-pr-label" }, this.label(pr, prs)));
    },
    strip(item, cls = "") {
        const prs = this.of(item);
        if (!prs.length)
            return null;
        return T.el("div", { class: `t-prs ${cls}`.trim() }, ...prs.map(pr => this.link(pr, prs)));
    },
    sig(item) { return this.of(item).map(pr => `${this.ref(pr)} ${pr.url} ${pr.state}`).join("\n"); },
    query(q) {
        const s = String(q || "").trim();
        const link = this.URL.exec(s);
        if (link)
            return { number: Number(link[2]), repo: link[1].toLowerCase() };
        const bare = /^#?(\d+)$/.exec(s);
        if (bare)
            return { number: Number(bare[1]), repo: null };
        const named = /^([\w.-]+(?:\/[\w.-]+)?)\s*#\s*(\d+)$/.exec(s);
        return named ? { number: Number(named[2]), repo: named[1].toLowerCase() } : null;
    },
    matching(item, pq) {
        if (!pq || !(pq.number > 0))
            return [];
        return this.of(item).filter(pr => pr.number === pq.number && (!pq.repo
            || (pq.repo.includes("/") ? pr.repo.toLowerCase() : this.short(pr.repo).toLowerCase()) === pq.repo));
    },
};
