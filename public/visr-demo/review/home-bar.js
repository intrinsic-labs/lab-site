"use strict";
const HomeBar = {
    menu: null, filter: null,
    mount({ open, filtered, items }) {
        this.menu = T.el("button", { class: "t-home-corner r t-home-menu", type: "button", "aria-label": "Menu" });
        this.menu.append(Face.node(), T.el("span", { class: "dot" }));
        Dropdown.attach(this.menu, { label: "Menu", align: "right", items: () => [
                { node: Face.node("sm"), label: "Chat", key: HomeKeys.key("chat"), fn: () => open("chat") },
                { icon: "search", label: "Search", key: HomeKeys.key("search"), fn: () => open("search") },
                { icon: "file", label: "Files", fn: () => open("files") },
                { icon: "pencil", label: "Intake", key: HomeKeys.key("capture"), note: Drafts.has("capture") ? "DRAFT" : null, fn: () => open("capture") },
                { icon: "monitor", label: "Telemetry", key: HomeKeys.key("telemetry"), fn: () => open("telemetry") },
                { icon: "calendar", label: "Monday", fn: () => open("monday") },
                { icon: "gear", label: "Settings", fn: () => open("settings") },
            ] });
        this.filter = T.el("button", { class: "t-home-corner l t-home-filter", type: "button" });
        this.filter.innerHTML = Icons.html("filter");
        const change = patch => { DeckFilter.set({ ...DeckFilter.get(), ...patch }); this.sync(); filtered(DeckFilter.get()); };
        const back = { icon: "back", label: "Back", fn: () => Dropdown.open(this.filter, top) };
        const hide = { label: "Hide", align: "left", items: () => {
                const f = DeckFilter.get();
                return [back, ...DeckFilter.HIDE.map(h => ({ label: DeckFilter.HIDE_LABEL[h], checked: f.hide.includes(h), keep: true,
                        fn: () => change({ hide: f.hide.includes(h) ? f.hide.filter(x => x !== h) : [...f.hide, h] }) }))];
            } };
        const lane = { label: "Lane", align: "left", items: () => {
                const f = DeckFilter.get();
                return [back, ...Lanes.ALL.map(l => ({ label: Lanes.LABEL[l], checked: f.lanes.includes(l), keep: true,
                        fn: () => {
                            if (f.lanes.includes(l) && f.lanes.length === 1)
                                return;
                            change({ lanes: f.lanes.includes(l) ? f.lanes.filter(x => x !== l) : [...f.lanes, l] });
                        } }))];
            } };
        const byProject = { label: "Project", align: "left", items: () => {
                const f = DeckFilter.get();
                const list = DeckFilter.projects(items(), f);
                if (f.project && !list.some(p => p.path === f.project))
                    list.push({ path: f.project, name: Fmt.project(f.project), count: 0 });
                return [back, { label: "Any project", checked: !f.project, fn: () => change({ project: null }) },
                    ...list.map(p => ({ label: p.name, count: p.count, checked: p.path === f.project, fn: () => change({ project: p.path }) }))];
            } };
        const top = { label: "Show", align: "left", items: () => {
                const f = DeckFilter.get();
                return [
                    { label: "All", checked: DeckFilter.all(f), fn: () => change(DeckFilter.NONE) },
                    { label: "Lane", note: DeckFilter.lanes(f).toUpperCase(), checked: !DeckFilter.defaultLanes(f), next: true,
                        fn: () => Dropdown.open(this.filter, lane) },
                    { label: "I'm on it", checked: f.working, keep: true, fn: () => change({ working: !f.working }) },
                    { label: "Hide", note: f.hide.length ? DeckFilter.hidden(f).toUpperCase() : null, checked: f.hide.length > 0, next: true,
                        fn: () => Dropdown.open(this.filter, hide) },
                    { label: "By project", note: f.project ? Fmt.project(f.project) : null, checked: !!f.project, next: true,
                        fn: () => Dropdown.open(this.filter, byProject) },
                ];
            } };
        Dropdown.attach(this.filter, top);
        this.sync();
        return { left: this.filter, right: this.menu };
    },
    sync() {
        const draft = Drafts.has("capture");
        this.menu.classList.toggle("draft", draft);
        this.menu.setAttribute("aria-label", draft ? "Menu, unsent intake draft" : "Menu");
        const f = DeckFilter.get();
        this.filter.classList.toggle("on", !DeckFilter.all(f));
        this.filter.setAttribute("aria-label", DeckFilter.all(f) ? "Filter the deck: showing all"
            : `Filter the deck: ${DeckFilter.label(f)}`);
    },
};
