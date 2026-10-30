"use strict";
const Working = {
    on: item => !!item?.working,
    tag(item) {
        if (Working.on(item))
            return T.el("span", { class: "t-working-tag" }, "YOU'RE ON IT");
        if (item?.workingCleared)
            return T.el("span", {}, "WORKING MARK CLEARED");
        return null;
    },
    head(item, { dismiss }) {
        if (Working.on(item)) {
            const since = Fmt.clock(item.working.since);
            return [T.el("div", { class: "t-foot t-working" }, T.el("span", { class: "t-working-tag" }, "YOU'RE WORKING ON THIS"), ...(since ? [" ", T.el("span", { class: "t-working-since" }, `SINCE ${since}`)] : []))];
        }
        const gone = item?.workingCleared;
        if (!gone)
            return [];
        const at = Fmt.clock(gone.markedAt);
        const ok = T.el("button", { class: "t-btn tiny", type: "button" }, "DISMISS");
        ok.onclick = async () => {
            if (ok.disabled)
                return;
            ok.disabled = true;
            await dismiss();
            ok.disabled = false;
        };
        return [T.el("div", { class: "t-note t-working-gone", role: "status" }, T.el("div", { class: "t-label" }, "YOUR WORKING MARK WAS CLEARED"), T.el("p", {}, `This changed after you marked it${at ? " at " + at : ""}, so the mark didn't carry over. `
                + "Press I'M ON IT again if you still are."), T.el("div", { class: "t-row" }, ok))];
    },
    toggle(item, { press }) {
        const el = T.el("button", { class: "t-btn t-working-toggle", type: "button" }, "I'M ON IT");
        const set = it => {
            el.setAttribute("aria-pressed", String(Working.on(it)));
            el.title = Working.on(it) ? "You're on it. Press to clear the mark." : "Mark that you're working on this yourself.";
        };
        set(item);
        el.onclick = async () => {
            if (el.disabled)
                return;
            el.disabled = true;
            el.setAttribute("aria-busy", "true");
            try {
                await press(el.getAttribute("aria-pressed") === "true" ? "clear_working" : "mark_working");
            }
            finally {
                el.disabled = false;
                el.setAttribute("aria-busy", "false");
            }
        };
        return { el, set };
    },
};
