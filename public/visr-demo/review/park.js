"use strict";
const Park = {
    open(o) {
        const id = `${o.key}|park`;
        Session.patch({ sheet: "park" });
        return new Promise(resolve => {
            const draft = Drafts.get(id);
            const reason = T.el("textarea", { class: "t-textarea t-park-reason", spellcheck: "true",
                autocapitalize: "sentences", placeholder: "Why is it parked?", "aria-label": "Reason" });
            reason.value = draft.text || "";
            const next = T.el("input", { class: "t-field t-park-next", type: "text", spellcheck: "false",
                autocapitalize: "sentences", enterkeyhint: "done", "aria-label": "Next look",
                placeholder: "A date, a file, or what to wait for" });
            next.value = draft.nextLook || "";
            reason.oninput = next.oninput = () => { Drafts.set(id, { text: reason.value, nextLook: next.value }); sh.say(null); };
            const go = T.el("button", { class: "t-btn primary" }, "PARK");
            const cancel = T.el("button", { class: "t-btn" }, "CANCEL");
            let sending = false;
            const done = out => { Session.patch({ sheet: null }); sh.close(); resolve(out); };
            const sh = Tycho.sheet({ cap: "PARK",
                kids: [T.el("label", { class: "t-label t-park-label" }, "REASON"), reason,
                    T.el("label", { class: "t-label t-park-label" }, "NEXT LOOK"), next],
                acts: [cancel, go],
                held: () => sending,
                onCancel: () => { Session.patch({ sheet: null }); resolve(null); } });
            cancel.onclick = () => done(null);
            next.onkeydown = e => { if (e.key === "Enter") {
                e.preventDefault();
                go.click();
            } };
            go.onclick = async () => {
                if (!reason.value.trim() || !next.value.trim())
                    return sh.say(T.el("p", { class: "t-say amber" }, !reason.value.trim() && !next.value.trim() ? "Write why it is parked and when to look again."
                        : !reason.value.trim() ? "Write why it is parked." : "Say when to look again."));
                go.disabled = cancel.disabled = true;
                sending = true;
                sh.say(T.el("p", { class: "t-say dim" }, "Sending…"));
                const out = await o.send(reason.value, next.value.trim());
                go.disabled = cancel.disabled = false;
                sending = false;
                if (out?.ok || out?.pending || out?.code === "stale")
                    return done(out);
                sh.say(T.el("div", { class: "t-note bad" }, T.el("div", { class: "t-label" }, "NOT PARKED"), T.el("p", {}, String(out?.reason || "not sent"))));
            };
            requestAnimationFrame(() => (reason.value.trim() ? next : reason).focus({ preventScroll: true }));
        });
    },
};
