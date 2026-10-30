"use strict";
const TurnSheet = {
    TITLE: "What Superintendent did",
    PAGE: 100,
    PAGES: 5,
    SPAN: 2 * 3_600_000,
    used: m => (m.activity || []).filter(x => typeof x === "string" && x.trim()),
    open(m) {
        const logged = T.el("div", { class: "t-turn-logged", "aria-live": "polite" }, T.el("p", { class: "t-turn-note t-foot dim" }, "READING THE ACTION LOG…"));
        const sheet = BSheet.open({ title: this.TITLE, cls: "turn", kids: [
                T.el("h3", { class: "t-turn-head t-foot" }, "THIS TURN"),
                T.el("ol", { class: "t-turn-used" }, ...this.used(m).map(x => T.el("li", {}, x))),
                T.el("h3", { class: "t-turn-head t-foot" }, "IN THE ACTION LOG"),
                logged,
            ] });
        this.find(m).then(out => {
            if (!sheet.el.isConnected)
                return;
            if (!out.ok)
                return logged.replaceChildren(T.el("p", { class: "t-turn-note t-foot amber" }, out.code === "unsupported" ? out.reason : `COULDN'T READ THE ACTION LOG · ${out.reason || "the Mac didn't answer."}`));
            const partial = out.complete ? [] : [T.el("p", { class: "t-turn-note t-foot dim" }, "OLDER ENTRIES NOT SEARCHED · THE FULL ACTION LOG HAS THEM")];
            if (!out.actions.length)
                return logged.replaceChildren(...(out.complete ? [T.el("p", { class: "t-turn-note dim" }, "Nothing from this turn went into the action log.")] : partial));
            logged.replaceChildren(...out.actions.map(a => ActionLog.row({ ...a, target: null }, null)), ...partial);
        });
        return sheet;
    },
    async find(m) {
        const since = new Date(m.at).getTime() - this.SPAN;
        const mine = [];
        let before = null, complete = false;
        for (let n = 0; n < this.PAGES; n++) {
            const out = await SuptWire.actions(before, this.PAGE).catch(() => null);
            if (!out?.ok)
                return { ok: false, code: out?.code, reason: out?.reason };
            const page = out.actions || [];
            mine.push(...page.filter(a => a.messageId === m.id));
            const oldest = page.at(-1);
            if (!out.more || !oldest || new Date(oldest.at).getTime() < since) {
                complete = true;
                break;
            }
            before = oldest.id;
        }
        return { ok: true, complete, actions: mine.reverse() };
    },
};
