"use strict";
const Handback = {
    open(o) {
        const id = `${o.key}|handback`;
        Session.patch({ sheet: "handback" });
        return new Promise(resolve => {
            const draft = Drafts.get(id);
            const ta = T.el("textarea", { class: "t-textarea t-compose", spellcheck: "true", "data-draft": id,
                autocapitalize: "sentences", "aria-label": "Summary", placeholder: "What happened in the session?" });
            ta.value = draft.text || "";
            const grow = () => { ta.style.height = "auto"; ta.style.height = Math.max(ta.scrollHeight + 4, 160) + "px"; };
            const next = T.el("textarea", { class: "t-textarea t-handback-next", rows: "1", spellcheck: "true",
                autocapitalize: "sentences", enterkeyhint: "send", "aria-label": "Next action",
                placeholder: "What should the owner do next?" });
            next.value = draft.next || "";
            const fit = () => { next.style.height = "auto"; next.style.height = next.scrollHeight + 2 + "px"; };
            ta.oninput = () => { Drafts.set(id, { text: ta.value }); grow(); sh.say(null); };
            next.oninput = () => {
                if (/[\r\n]/.test(next.value))
                    next.value = next.value.replace(/\s*[\r\n]+\s*/g, " ");
                Drafts.set(id, { next: next.value });
                fit();
                sh.say(null);
            };
            const dictate = Dictate.attach(ta);
            const send = T.el("button", { class: "t-btn primary" }, "HAND BACK");
            const cancel = T.el("button", { class: "t-btn" }, "CANCEL");
            next.onkeydown = e => { if (e.key === "Enter" && !e.isComposing) {
                e.preventDefault();
                send.click();
            } };
            const done = out => { Session.patch({ sheet: null }); sh.close(); resolve(out); };
            const sh = Tycho.sheet({ cap: "HAND BACK",
                kids: [T.el("div", { class: "t-foot" }, "SUMMARY"), ta, dictate.el,
                    T.el("div", { class: "t-foot" }, "NEXT ACTION"), next],
                acts: [cancel, send],
                onCancel: () => { Session.patch({ sheet: null }); resolve(null); } });
            cancel.onclick = () => done(null);
            send.onclick = async () => {
                if (send.disabled)
                    return;
                if (dictate.busy())
                    return sh.say(T.el("p", { class: "t-say amber" }, "Wait for the dictation to finish."));
                if (!ta.value.trim() || !next.value.trim())
                    return sh.say(T.el("p", { class: "t-say amber" }, "Write the summary and the next action first."));
                send.disabled = cancel.disabled = true;
                sh.say(T.el("p", { class: "t-say dim" }, "Sending…"));
                const out = await o.send(ta.value, next.value);
                send.disabled = cancel.disabled = false;
                if (out?.ok || out?.pending || out?.code === "stale")
                    return done(out);
                sh.say(T.el("div", { class: "t-note bad" }, T.el("div", { class: "t-label" }, "NOT HANDED BACK"), T.el("p", {}, String(out?.reason || "not sent"))));
            };
            requestAnimationFrame(() => { grow(); fit(); (ta.value.trim() && !next.value.trim() ? next : ta).focus({ preventScroll: true }); });
        });
    },
};
