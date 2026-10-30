"use strict";
const Compose = {
    open(o) {
        const id = `${o.key}|${o.action}`;
        Session.patch({ sheet: o.action });
        return new Promise(resolve => {
            const ta = T.el("textarea", { class: "t-textarea t-compose", spellcheck: "true", "data-draft": id,
                autocapitalize: "sentences", placeholder: o.hint || "" });
            ta.value = Drafts.get(id).text || "";
            const grow = () => { ta.style.height = "auto"; ta.style.height = Math.max(ta.scrollHeight + 4, 160) + "px"; };
            const count = TextCap.attach(ta, o.max);
            ta.oninput = () => { Drafts.set(id, { text: ta.value }); grow(); count?.update(); };
            let sh = null;
            const bar = o.loose ? DictateBar.create({ stop: () => dictate.stop(), label: o.cap }) : null;
            const onState = (state, seconds, tapped) => {
                const away = tapped && (state === "arming" || state === "recording");
                if (state === "recording")
                    bar.time(seconds);
                if (!sh || away === sh.el.classList.contains("t-dictating"))
                    return;
                if (away)
                    Compose.fit(bar.el, ta);
                sh.el.classList.toggle("t-dictating", away);
            };
            const dictate = Dictate.attach(ta, { target: { draft: id, key: o.key, revision: o.revision }, onState: bar ? onState : null });
            const tray = o.files ? Attach.tray(id) : null;
            const send = T.el("button", { class: `t-btn ${o.tone || "primary"}` }, o.verb || "SEND");
            const cancel = T.el("button", { class: "t-btn" }, "CANCEL");
            let sending = false;
            const done = out => { Session.patch({ sheet: null }); sh.close(); resolve(out); };
            sh = Tycho.sheet({ cap: o.cap, kids: [ta, count?.el, dictate.el, tray?.el], acts: [cancel, send],
                held: () => sending, loose: !!o.loose, under: bar?.el,
                onCancel: () => { Session.patch({ sheet: null }); resolve(null); } });
            sh.el._busy = () => dictate.busy();
            cancel.onclick = () => done(null);
            send.onclick = async () => {
                if (dictate.busy())
                    return sh.say(T.el("p", { class: "t-say amber" }, "Wait for the dictation to finish."));
                if (tray?.busy())
                    return sh.say(T.el("p", { class: "t-say amber" }, "Wait for the attachments to finish uploading."));
                if (o.needsText && !ta.value.trim() && !tray?.count())
                    return sh.say(T.el("p", { class: "t-say amber" }, "Write something, or attach something, first."));
                if (count?.over())
                    return sh.say(T.el("p", { class: "t-say amber" }, `Cut ${count.over()} character${count.over() === 1 ? "" : "s"} first — this note is at most ${o.max}.`));
                send.disabled = cancel.disabled = true;
                sending = true;
                sh.say(T.el("p", { class: "t-say dim" }, "Sending…"));
                const out = await o.send(ta.value, tray ? tray.files() : []);
                send.disabled = cancel.disabled = false;
                sending = false;
                if (out?.ok || out?.pending || out?.code === "stale")
                    return done(out);
                sh.say(T.el("div", { class: "t-note bad" }, T.el("div", { class: "t-label" }, "NOT SENT"), T.el("p", {}, String(out?.reason || "not sent"))));
            };
            requestAnimationFrame(() => { grow(); ta.focus({ preventScroll: true }); });
        });
    },
    fit(bar, ta) {
        if (!matchMedia(Tycho.WIDE).matches)
            ta.blur();
    },
};
