"use strict";
const LinearLink = {
    offered(item) {
        const side = item.linearLinking?.side;
        const acts = item.actions || [];
        return (side === "issue" || side === "outcome") && (acts.includes("link") || acts.includes("unlink")) ? side : null;
    },
    open(o) {
        Session.patch({ sheet: "link" });
        return new Promise(resolve => {
            const body = T.el("div", { class: "t-link-body" });
            const back = T.el("button", { class: "t-btn", type: "button" });
            const go = T.el("button", { class: "t-btn primary", type: "button" });
            let sending = false;
            const done = out => { Session.patch({ sheet: null }); sh.close(); resolve(out); };
            const sh = Tycho.sheet({ cap: "LINK", kids: [body], acts: [back, go], held: () => sending,
                onCancel: () => { Session.patch({ sheet: null }); resolve(null); } });
            const cap = sh.el.querySelector(".t-sheet-cap");
            const frame = {
                item: o.item,
                show({ title, kids, backLabel = "CLOSE", onBack = () => done(null), verb = null }) {
                    cap.textContent = title;
                    body.replaceChildren(...kids.filter(Boolean));
                    sh.say(null);
                    back.textContent = backLabel;
                    back.onclick = onBack;
                    go.hidden = !verb;
                    if (!verb)
                        return;
                    go.className = `t-btn ${verb.tone || "primary"}`;
                    go.onclick = () => { if (!go.disabled)
                        verb.fn(); };
                    frame.arm(verb.ready ?? true, verb.label);
                },
                arm(on, label) { go.disabled = sending || !on; go.textContent = label; },
                async send(action, link) {
                    if (sending)
                        return;
                    go.disabled = back.disabled = true;
                    sending = true;
                    body.inert = true;
                    sh.say(T.el("p", { class: "t-say dim" }, "Sending…"));
                    const out = await o.send(action, link);
                    go.disabled = back.disabled = false;
                    sending = false;
                    body.inert = false;
                    if (out?.ok || out?.code === "stale")
                        return done(out);
                    sh.say(T.el("div", { class: "t-note bad" }, T.el("div", { class: "t-label" }, action === "unlink" ? "NOT UNLINKED" : "NOT LINKED"), T.el("p", {}, String(out?.reason || "not sent"))));
                },
                open(key) { done(null); o.go(key); },
                unlink({ issue, outcome, link, from }) {
                    frame.show({ title: "UNLINK", backLabel: "BACK", onBack: from,
                        kids: [T.el("p", {}, "Unlink ", T.el("span", { class: "bright" }, issue), " from ", T.el("span", { class: "bright" }, outcome), "?"),
                            T.el("p", { class: "t-say dim" }, "Only the link goes. The outcome keeps its status and owner, and the issue stays as it is in Linear.")],
                        verb: { label: "UNLINK", tone: "danger", fn: () => frame.send("unlink", link) } });
                },
            };
            if (this.offered(o.item) === "issue")
                LinkIssueSide.home(frame);
            else
                LinkOutcomeSide.home(frame);
        });
    },
};
