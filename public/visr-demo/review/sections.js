"use strict";
const Sections = {
    row({ title, hint, onclick, cls = "" }) {
        return T.el("button", { class: `t-navrow ${cls}`.trim(), type: "button", onclick }, T.el("span", { class: "t-navrow-title" }, title), hint ? T.el("span", { class: "t-foot" }, hint) : null, T.el("span", { class: "t-navrow-go", "aria-hidden": "true" }, "›"));
    },
    go(item, push) {
        const links = (item.content || []).filter(b => b.type === "link");
        const shots = Shots.images(item);
        if (!links.length && !shots.length)
            return null;
        return T.el("section", { class: "t-go" }, ...links.map(b => Preview.button(item, b)), shots.length ? this.row({ title: "Screenshots", hint: `${shots.length} IMAGE${shots.length === 1 ? "" : "S"}`,
            cls: "t-navrow-shots", onclick: () => push({ title: "Screenshots", build: () => Shots.page(item) }) }) : null);
    },
    repeats(item, b) {
        return b.type === "markdown" && /^outcome document$/i.test(String(b.title || ""))
            && (item.docs || []).some(d => d.role === "outcome");
    },
    more(item, push, o) {
        const base = item.docs?.[0]?.path || "";
        const rows = [];
        const byRef = new Map();
        const add = (ref, title, hint, build) => {
            const open = () => push({ title, build });
            rows.push(this.row({ title, hint, onclick: open }));
            for (const r of [].concat(ref))
                if (r)
                    byRef.set(r, open);
        };
        const hide = item.ownerChoices?.length ? ["owner"] : [];
        for (const d of item.docs || []) {
            const name = d.path.split("/").pop();
            const title = d.role ? `${d.role[0].toUpperCase()}${d.role.slice(1)} document` : name;
            add([d.path, title], title, "EDITABLE", () => {
                const v = DocView.create({ ...d, hide, onSaved: () => o.saved() });
                v.load();
                return v.el;
            });
        }
        const lead = Content.lead(item);
        for (const b of item.content || []) {
            if (b.type === "link" || b.type === "image" || b === lead)
                continue;
            const title = Content.title(b);
            if (this.repeats(item, b)) {
                byRef.set(title, byRef.get(item.docs.find(d => d.role === "outcome").path));
                continue;
            }
            add([b.title, b.label], title, Content.hint(b), () => Content.body(b, base));
        }
        const brief = item.brief?.state === "ready" && item.brief.brief;
        if (brief?.answers?.length)
            add(null, "What each answer does", `${brief.answers.length} ANSWERS`, () => Brief.answers(brief));
        const rest = (brief?.sources || []).filter(s => !byRef.has(String(s.ref || ""))
            && !(item.content || []).some(b => b.type === "link" && b.url === s.ref));
        if (rest.length)
            add(null, "Other sources", `${rest.length}`, () => T.el("div", { class: "t-sources" }, ...rest.map(s => Brief.source(s, o))));
        if (!rows.length)
            return null;
        return {
            el: T.el("section", { class: "t-desk-more" }, T.el("div", { class: "t-label" }, "MORE"), T.el("div", { class: "t-navrows" }, ...rows)),
            open: ref => { const f = byRef.get(String(ref || "")); if (f)
                f(); return !!f; },
        };
    },
};
