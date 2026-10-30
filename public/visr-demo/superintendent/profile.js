"use strict";
const SuptProfile = {
    ROLE: "roles.superintendent",
    MANDATE: "Prompts/superintendent/mandate.md",
    render({ back, log, edit }) {
        const group = (title, ...rows) => T.el("details", { class: "t-fold t-set-group", open: true }, T.el("summary", {}, T.el("span", { class: "t-fold-title" }, title)), ...rows);
        const navrows = (...rows) => T.el("div", { class: "t-navrows" }, ...rows);
        const lead = T.el("div", { class: "t-supt-id" }, Face.node("xl"), T.el("h1", { class: "t-title" }, "Superintendent"), T.el("div", { class: "t-foot" }, "MANAGER · RUNS ON THE MAC"));
        const permissions = group("Permissions", SuptPermissions.node());
        const activity = () => [permissions, group("Read aloud", SpeechSpeed.control()), group("Activity", navrows(Sections.row({ title: "Action log", cls: "t-supt-log", onclick: () => log() })))];
        const fallback = out => [lead, T.el("div", { class: "t-set-groups" }, group("Agent", navrows(...(out?.ok ? this.agent(out) : []), this.instructions(edit)), !out?.ok && out?.code !== "unsupported"
                ? T.el("p", { class: "t-set-why" }, `The model and its window couldn't be read: ${out?.reason || "the Mac didn't answer."}`)
                : null), ...activity())];
        return Settings.render({
            back, title: "Superintendent", label: "Back to the chat",
            pid: "supt-settings", cls: "t-supt-profile", aria: "Superintendent's settings",
            lead, tail: activity, fallback,
            groups: { superintendent: { label: "Agent", after: () => [navrows(this.instructions(edit))] } },
        });
    },
    instructions(edit) {
        return T.el("button", { class: "t-navrow t-supt-mandate", type: "button",
            "aria-label": `Edit the instructions: ${this.MANDATE} in the vault`, onclick: () => edit(this.MANDATE) }, T.el("span", { class: "t-navrow-title" }, "Instructions"), T.el("span", { class: "t-foot" }, "EDIT"), T.el("span", { class: "t-navrow-go", "aria-hidden": "true" }, "›"), T.el("span", { class: "t-navrow-sub t-navrow-path" }, `${this.MANDATE} · in the vault`));
    },
    row(title, value) {
        return T.el("div", { class: "t-navrow ro" }, T.el("span", { class: "t-navrow-title" }, title), value ? T.el("span", { class: "t-foot" }, value) : null);
    },
    agent(data) {
        const fields = new Map((data.fields || []).map(f => [f.path, f]));
        const val = path => (data.values && path in data.values ? data.values[path] : fields.get(path)?.value);
        const has = leaf => fields.has(`${this.ROLE}.${leaf}`);
        const rows = [];
        if (has("size") && has("effort")) {
            const provider = has("provider") ? val(`${this.ROLE}.provider`) : "claude";
            const label = fields.get(`${this.ROLE}.provider`)?.options?.find(o => o.value === provider)?.label || provider;
            const pinned = String(val(`models.${provider}.${val(`${this.ROLE}.size`)}`) || val(`${this.ROLE}.size`) || "");
            const model = pinned.startsWith(`${provider}-`) ? pinned.slice(provider.length + 1) : pinned;
            rows.push(this.row("Model", [label, model, val(`${this.ROLE}.effort`)].filter(Boolean).join(" · ")));
        }
        const window = Number(val(`${this.ROLE}.compact_window`));
        if (has("compact_window") && window > 0)
            rows.push(this.row("Auto-compact", `AT ${window % 1e6 ? `${Math.round(window / 1e3)}K` : `${window / 1e6}M`}`));
        return rows;
    },
};
