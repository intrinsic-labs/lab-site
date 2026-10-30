"use strict";
const Files = {
    ROOTS: [{ name: "Prompts", path: "Prompts" }, { name: "Skills", path: "Tools/skills" }],
    render({ back, state = null }) {
        const page = T.el("div", { class: "t-desk-page" });
        const el = T.el("section", { class: "t-files t-desk-screen t-sub", "data-pid": "files" });
        let current = null, seq = 0;
        const places = new Map();
        const key = route => route?.path || "";
        const valid = route => route && ["directory", "file"].includes(route.kind)
            && typeof route.path === "string"
            && Files.ROOTS.some(r => route.path === r.path || route.path.startsWith(r.path + "/"));
        async function navigate(route, { push = false } = {}) {
            if (current)
                places.set(key(current), page.scrollTop);
            current = valid(route) ? { path: route.path, kind: route.kind } : null;
            const mine = ++seq;
            if (push)
                Nav.push({ view: "files", files: current });
            Session.patch({ view: "files", files: current, key: null });
            const title = current ? current.path.split("/").pop() : "Files";
            const bar = TopBar.render({ title, back, label: current ? "Back" : "Back to the cards" });
            const inner = T.el("div", { class: "t-desk-inner t-sub-inner" });
            if (current)
                inner.append(T.el("p", { class: "t-foot t-files-path" }, current.path));
            page.replaceChildren(inner);
            el.replaceChildren(bar, page);
            page.scrollTop = 0;
            const go = entry => navigate(entry, { push: true });
            if (!current) {
                inner.append(T.el("div", { class: "t-navrows" }, ...Files.ROOTS.map(r => Sections.row({ title: r.name, hint: r.path, onclick: () => go({ ...r, kind: "directory" }) }))));
            }
            else if (current.kind === "file") {
                const doc = DocView.create({ path: current.path, role: "file" });
                inner.append(doc.el);
                await doc.load();
            }
            else {
                const path = current.path;
                inner.append(T.el("p", { class: "t-foot", role: "status" }, "READING…"));
                const out = await Wire.docList(path);
                if (mine !== seq)
                    return;
                inner.lastElementChild.remove();
                if (!out.ok) {
                    inner.append(T.el("div", { class: "t-note bad", role: "status" }, T.el("div", { class: "t-label" }, "COULDN'T READ THIS FOLDER"), T.el("p", {}, out.reason), T.el("button", { class: "t-btn", type: "button",
                        onclick: () => navigate(current) }, "TRY AGAIN")));
                }
                else if (!out.entries.length) {
                    inner.append(T.el("p", { class: "dim" }, "This folder is empty."));
                }
                else {
                    inner.append(T.el("div", { class: "t-navrows" }, ...out.entries.map(entry => {
                        const row = Sections.row({ title: entry.name,
                            hint: entry.kind === "directory" ? "FOLDER" : "FILE", onclick: () => go(entry) });
                        row.dataset.path = entry.path;
                        row.dataset.kind = entry.kind;
                        return row;
                    })));
                }
            }
            if (mine === seq)
                page.scrollTop = places.get(key(current)) || 0;
        }
        const loaded = navigate(state);
        return { el, page, loaded, navigate,
            activate() { history.replaceState({ ...history.state, files: current }, ""); },
            dispose() { ++seq; },
        };
    },
};
