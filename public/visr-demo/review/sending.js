"use strict";
const Sending = {
    WAITS: new Set(["refresh", "interactive", "link", "unlink", "mark_working", "clear_working"]),
    STAMPS: new Set(["approve", "reject", "done"]),
    SHEETS: new Set(["feedback", "reject", "park", "block", "handback", "route", "undo"]),
    BEAT_MS: 450,
    fits(item, action) {
        if (this.WAITS.has(action) || !Tycho.token())
            return false;
        return !(action === "feedback" && item.kind === "calibration");
    },
    start(app, { item, action, body, slot, extra }) {
        const key = item.key;
        Pending.start({ key, action, title: Cards.title(item), extra, revision: item.revision, marks: this.marks(item) });
        const was = Session.get();
        if (was.front === key)
            Session.patch({ front: null, frontIndex: was.frontIndex || 0 });
        const leave = () => (app.desk?.item.key === key ? this.deck(app) : null);
        const left = this.STAMPS.has(action) ? new Promise(r => setTimeout(r, this.BEAT_MS)).then(leave) : leave();
        Tycho.auth(() => Wire.act(body))
            .catch(e => ({ ok: false, reason: String(e?.message || e) }))
            .then(async (out) => {
            await left;
            return this.answered(app, key, action, slot, out || { ok: false, reason: "Not sent: the action token wasn't given." });
        });
        return { ok: false, pending: true };
    },
    async answered(app, key, action, slot, out) {
        Attempts.settle(slot, out);
        if (out.ok)
            return this.confirmed(app, key, action, out);
        if (out.code === "unknown")
            return this.reconcile(app, key, action);
        if (out.code === "stale" || out.code === "gone")
            await app.refresh({ fresh: true });
        Pending.fail(key, out.code === "stale"
            ? { kind: "stale", reason: "It changed on the Mac before your answer arrived. Nothing was applied; what you wrote is kept." }
            : out.code === "gone" ? { kind: "gone", reason: out.reason || "It is no longer waiting on you." }
                : { kind: "refused", reason: out.reason || "not sent" });
        this.redeck(app);
    },
    async confirmed(app, key, action, out) {
        Drafts.clearItem(key, Pending.get(key)?.at);
        Session.leave(key);
        Session.forget(key);
        const read = await app.refresh({ fresh: true });
        if (app.SETTLES.has(action) && (!read || app.find(key)?.revision === Pending.get(key)?.revision))
            app.drop(key);
        Pending.end(key);
        if (app.view)
            return app.recheck();
        Home.render(app.data, app.fault, app.checked);
        const [label, tone] = app.label(action, out);
        Home.say(label, tone, out.result?.message || "");
    },
    async reconcile(app, key, action) {
        Pending.check(key);
        const sent = Pending.get(key);
        const read = await app.refresh({ fresh: true });
        const now = app.find(key);
        if (read && (!now || this.landed(action, sent.marks, this.marks(now)))) {
            Pending.end(key);
            Drafts.clearItem(key, sent.at);
            if (!now)
                Session.forget(key);
            if (!app.view) {
                Home.render(app.data, app.fault, app.checked);
                Home.say("CHECKED", "amber", `No answer came, but ${sent.title} ${now ? "shows your answer" : "has left the deck"}: it went through.`);
            }
            return;
        }
        Pending.fail(key, !read
            ? { kind: "unknown", reason: "No answer from the Mac, and it couldn't be checked. Open it to send again: a resend is recognised if the first one went through." }
            : now.revision !== sent.revision
                ? { kind: "changed", reason: "No answer from the Mac, and it has changed since. Open it to see where it stands before answering again." }
                : { kind: "unknown", reason: "No answer from the Mac, and the item is unchanged. Open it to send again: a resend is recognised if the first one went through." });
        this.redeck(app);
    },
    marks: it => ({ feedback: !!it.awaiting, later: !!it.deferred, block: !!it.blocked }),
    landed: (action, was, now) => !!now[action] && !was[action],
    redeck(app) { if (!app.view)
        Home.render(app.data, app.fault, app.checked); },
    notice(key) {
        const e = Pending.get(key);
        if (!e || e.state === "failed")
            return null;
        return T.el("div", { class: "t-note" }, T.el("div", { class: "t-label" }, `SENDING ${Fmt.verb(e.action)}`), T.el("p", {}, "Your answer on this is on its way to the Mac. It can't be sent again until it is answered."));
    },
    async recover(app, key) {
        const e = Pending.get(key);
        if (!e || e.state !== "failed")
            return;
        Pending.end(key);
        if (Chat.isOpen() && !SuptDock.on)
            Chat.hide();
        await this.deck(app);
        await app.refresh({ fresh: true });
        const item = app.find(key);
        Home.render(app.data, app.fault, app.checked);
        if (!item)
            return Home.say("NOT ON THE DECK", "amber", `${e.title} has left the deck; there is nothing to send again.`);
        const moved = e.kind === "stale" || e.kind === "changed" || item.revision !== e.revision;
        const sheet = this.SHEETS.has(e.action) && (item.actions || []).includes(e.action);
        const why = T.el("p", {}, String(e.reason || "not sent"));
        const retry = !moved && !sheet && (item.actions || []).includes(e.action)
            ? T.el("div", { class: "t-row" }, T.el("button", { class: "t-btn primary", type: "button", "data-retry": e.action,
                onclick: async () => {
                    const out = await app.perform(key, e.action, e.extra);
                    if (out && !out.ok && !out.pending && out.code !== "stale")
                        why.textContent = String(out.reason || "not sent");
                } }, "TRY AGAIN")) : null;
        const note = moved
            ? T.el("div", { class: "t-note amber" }, T.el("div", { class: "t-label" }, `${Fmt.verb(e.action)} NOT APPLIED · THIS CHANGED`), T.el("p", {}, "It was reloaded with things as they are now. Anything you wrote is kept."))
            : T.el("div", { class: "t-note bad" }, T.el("div", { class: "t-label" }, `${Fmt.verb(e.action)} NOT SENT`), why, sheet ? T.el("p", {}, "What you wrote is back in the sheet: send it again from there.") : null, retry);
        app.open(key, { notice: note });
        if (!sheet || !app.desk)
            return;
        if (e.action === "park")
            app.park(item);
        else if (e.action === "block")
            app.block(item);
        else
            app.compose(item, e.action);
    },
    async deck(app) {
        if (!Nav.depth())
            return app.home();
        const popped = new Promise(r => addEventListener("popstate", r, { once: true }));
        app.toDeck();
        await popped;
    },
};
