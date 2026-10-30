"use strict";
const Search = {
    render(ctl) {
        const field = T.el("input", { class: "t-field t-search-field", type: "search", inputmode: "search",
            enterkeyhint: "go", autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false",
            placeholder: "Card ID or PR, e.g. vlt-card-id-search, #54", "aria-label": "Search cards by ID or pull request" });
        const x = T.el("button", { class: "t-topbar-back t-search-close", type: "button", "aria-label": "Close search",
            onclick: () => ctl.close() }, "✕");
        const bar = T.el("nav", { class: "t-topbar t-search-bar" }, T.el("div", { class: "t-topbar-row" }, x, field));
        const notice = T.el("div", { class: "t-search-notice", role: "status" });
        const head = T.el("div", { class: "t-foot t-search-count", "aria-live": "polite" });
        const list = T.el("div", { class: "t-search-list", role: "list" });
        const page = T.el("div", { class: "t-search-page" }, T.el("div", { class: "t-search-inner" }, notice, head, list));
        const el = T.el("section", { class: "t-search", "data-pid": "search" }, bar, page);
        let hits = [];
        const draw = () => {
            const all = ctl.items();
            const q = field.value;
            hits = CardSearch.find(all, q);
            const f = ctl.filter();
            if (!CardSearch.normal(q)) {
                head.textContent = `${all.length} CARD${all.length === 1 ? "" : "S"} · EVERY LANE AND PROJECT, WHATEVER THE FILTER`;
                list.replaceChildren(T.el("p", { class: "dim t-search-say" }, "Type or paste a card's ID, or a PR: 54, tycho#54 or its link. Part of an ID works too."));
                return;
            }
            const pq = PrLinks.query(q);
            if (!hits.length) {
                head.textContent = "NO MATCHES";
                list.replaceChildren(T.el("p", { class: "dim t-search-say" }, !pq ? `No card's ID contains “${q.trim()}”.`
                    : pq.repo ? `No card has PR ${pq.repo}#${pq.number}.`
                        : `No card has PR #${pq.number}, and no card's ID contains “${q.trim()}”.`));
                return;
            }
            head.textContent = `${hits.length} MATCH${hits.length === 1 ? "" : "ES"}`;
            list.replaceChildren(...hits.map(h => this.row(h, CardSearch.normal(q).length, f, () => choose(h), pq)));
        };
        const choose = h => {
            if (ctl.pick(h.item.key) !== false)
                return;
            notice.replaceChildren(T.el("div", { class: "t-note amber" }, T.el("div", { class: "t-label" }, "THAT CARD LEFT THE DECK"), T.el("p", {}, `${h.id || Cards.title(h.item)} was resolved or removed since the list was drawn. Nothing was opened.`)));
            draw();
        };
        field.addEventListener("input", () => { notice.replaceChildren(); draw(); });
        field.addEventListener("keydown", e => {
            if (e.key === "Enter" && hits[0]) {
                e.preventDefault();
                choose(hits[0]);
            }
        });
        const esc = e => {
            if (e.key !== "Escape")
                return;
            if (!el.contains(e.target) && SuptDock.on) {
                const inChat = !!e.target.closest?.(".t-chat-layer, .t-chat-pick");
                if (inChat !== el.classList.contains("t-chat-pick"))
                    return;
            }
            e.preventDefault();
            ctl.close();
        };
        document.addEventListener("keydown", esc);
        draw();
        return {
            el, page,
            focus() { field.focus(); },
            reread: draw,
            dispose() { document.removeEventListener("keydown", esc); },
        };
    },
    row(h, n, f, choose, pq = null) {
        const prs = (h.prs || []).map(pr => T.el("span", { class: "t-search-pr", "data-state": pr.state || "unknown" }, PrLinks.icon(pr), T.el("mark", {}, `#${pr.number}`), " · ", pq?.repo ? T.el("mark", {}, pr.repo) : pr.repo));
        const id = h.id ? T.el("span", { class: "t-search-id" }, h.id.slice(0, h.at), T.el("mark", {}, h.id.slice(h.at, h.at + n)), h.id.slice(h.at + n)) : null;
        const hidden = !DeckFilter.apply([h.item], f).length;
        const meta = [Fmt.kind(h.item), Fmt.project(h.item.project), hidden ? "HIDDEN BY FILTER" : null].filter(Boolean);
        return T.el("button", { class: "t-search-row", type: "button", role: "listitem", "data-key": h.item.key, onclick: choose }, ...prs, id, T.el("span", { class: "t-search-title" }, Cards.title(h.item)), T.el("span", { class: "t-foot t-search-meta" }, ...meta.flatMap((m, i) => {
            const s = T.el("span", { class: m === "HIDDEN BY FILTER" ? "amber" : "" }, m);
            return i ? [" · ", s] : [s];
        })));
    },
};
