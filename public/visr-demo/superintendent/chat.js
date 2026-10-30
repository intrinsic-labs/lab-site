"use strict";
const Chat = {
    PLACE: "tycho.chat.place",
    el: null, page: null, inner: null, composer: null, said: null,
    open: false, via: null, sig: "", stick: true,
    sinks: new Map(),
    isOpen() { return this.open; },
    build() {
        const back = T.el("button", { class: "t-topbar-back", type: "button", "aria-label": "Back to where you were",
            onclick: () => this.back() }, "‹");
        const shut = T.el("button", { class: "t-chat-close", type: "button", "aria-label": "Close the chat",
            onclick: () => this.close() }, Icons.node("close"));
        const who = T.el("button", { class: "t-chat-who", type: "button", "aria-label": "Superintendent's settings",
            onclick: () => this.profile() }, Face.node("lg"), T.el("span", {}, "Superintendent"), T.el("span", { class: "t-navrow-go", "aria-hidden": "true" }, "›"));
        const top = T.el("nav", { class: "t-topbar" }, T.el("div", { class: "t-topbar-row" }, back, who, shut));
        this.inner = T.el("div", { class: "t-chat-inner", "aria-live": "polite" });
        this.page = T.el("div", { class: "t-chat-page" }, this.inner);
        this.said = T.el("p", { class: "t-chat-say amber", role: "status" });
        this.composer = Composer.create({
            peek: card => this.peek(card),
            pickCard: done => this.pickCard(done),
            send: (body, was) => this.send(body, was),
        });
        this.ask = AskDock.create();
        this.composer.el.querySelector(".t-chatbar-inner").prepend(this.ask.el, this.said);
        this.el = T.el("section", { class: "t-over t-chat t-chat-layer", "data-pid": "chat", "aria-label": "Superintendent", tabindex: "-1" }, top, this.page, this.composer.el);
        const place = Store.get(this.PLACE, null);
        if (place)
            this.stick = place.stick !== false;
        this.top = place?.top || 0;
        let saving = 0;
        this.page.addEventListener("scroll", () => {
            if (!this.open)
                return;
            this.stick = this.page.scrollHeight - this.page.scrollTop - this.page.clientHeight < 48;
            this.top = this.page.scrollTop;
            clearTimeout(saving);
            saving = setTimeout(() => Store.set(this.PLACE, { top: this.top, stick: this.stick }), 300);
        }, { passive: true });
        this.inner.addEventListener("load", () => { if (this.stick)
            this.toEnd(); }, true);
        Tycho.viewport.on(() => { if (this.open && this.stick)
            this.toEnd(); });
        this.composer.el.addEventListener("focusin", () => {
            requestAnimationFrame(() => { if (this.stick)
                this.toEnd(); });
        });
        ChatLinks.catch(this.inner, link => this.follow(link));
        ChatLinks.catch(this.ask.el, link => this.follow(link));
        this.el.addEventListener("t-ask", e => { SuptPages.clear(); this.ask.show(e.detail.offer); });
        Thread.on(() => this.draw());
        this.ticking = SuptProgress.ticker(() => this.doing());
    },
    doing() {
        const t = Thread;
        Messages.doing(this.inner?.querySelector(".t-chat-thinking"), t.busy ? t.progress : null, t.busy ? String(t.activity.at(-1)?.label || "") : "");
    },
    ctl() { return { peek: card => this.peek(card), image: id => ChatLinks.image(id), follow: link => this.follow(link) }; },
    draw(force = false) {
        if (!this.open)
            return;
        const t = Thread;
        const out = Outbox.list().filter(e => !e.body?.thread);
        this.ticking.run(t.busy);
        const sig = [t.messages.map(m => m.id).join(","), t.busy, t.error, t.fault?.reason,
            out.map(e => `${e.client_id}:${e.state}:${e.reason}`).join(","),
            t.threads.map(x => `${x.id}:${x.at}:${x.busy}:${x.error}:${x.title}:${x.line}`).join(","),
            OfferDecide.sig(t.messages)].join("|");
        if (sig === this.sig && !force) {
            this.doing();
            return;
        }
        this.sig = sig;
        const kids = [];
        let prev = null;
        for (const e of Episodes.timeline(t.messages, t.threads)) {
            const at = Episodes.at(e);
            if (Messages.split(prev, { at }))
                kids.push(Messages.divider(at));
            kids.push(e.kind === "chat" ? Messages.node(e.m, this.ctl())
                : e.kind === "thread" ? AwayBox.thread(e.t, row => this.thread(row))
                    : AwayBox.node(e.items, items => this.away(items)));
            prev = e.kind === "away" ? e.items.at(-1) : { at };
        }
        if (!t.messages.length && !t.threads.length && !out.length)
            kids.push(T.el("p", { class: "t-chat-empty dim" }, "Ask about anything in the company. Cards it mentions are links."));
        for (const e of out)
            kids.push(e.state === "failed"
                ? Messages.unsent(e, this.ctl(), { retry: () => this.retry(e.client_id), discard: () => this.discard(e.client_id) })
                : Messages.pending(e.body, e.was, this.ctl()));
        if (t.busy)
            kids.push(Messages.thinking(t.progress, String(t.activity.at(-1)?.label || "")));
        else if (t.error && t.messages.filter(m => !m.routine).at(-1)?.role !== "assistant")
            kids.push(Messages.failed(t.error));
        if (t.fault)
            kids.push(T.el("p", { class: "t-chat-fault t-foot amber" }, t.fault.code === "unsupported" ? t.fault.reason : `COULDN'T READ THE CONVERSATION · ${t.fault.reason}`));
        const keep = this.stick ? null : this.page.scrollTop;
        this.inner.replaceChildren(...kids);
        this.ask.draw(t.messages);
        if (keep === null)
            this.toEnd();
        else
            this.page.scrollTop = keep;
    },
    toEnd() { this.page.scrollTop = this.page.scrollHeight; },
    show({ card = null, image = null, focus = false, entry = true } = {}) {
        if (!this.el)
            this.build();
        if (card)
            this.composer.tray.addCard(card);
        if (!this.open) {
            this.open = true;
            const dock = SuptDock.fits();
            if (entry)
                SuptPages.clear();
            const mount = () => (App.root || document.getElementById("app")).append(this.el);
            if (dock) {
                SuptDock.enter(this.el, mount);
                SuptDock.remember(true);
            }
            else {
                mount();
                document.body.classList.add("covered");
                if (entry)
                    Nav.push({ ...(history.state || {}), chat: true });
                Session.patch({ chat: true });
            }
            this.composer.reload();
            this.draw(true);
            requestAnimationFrame(() => { if (this.stick)
                this.toEnd();
            else
                this.page.scrollTop = this.top; });
            Thread.start();
            for (const v of this.sinks.values())
                v.now();
        }
        if (focus)
            this.composer.focus();
        if (image)
            ChatLinks.image(image);
    },
    hide() {
        if (!this.open)
            return;
        this.closeOver({ pages: false });
        this.top = this.page.scrollTop;
        Store.set(this.PLACE, { top: this.top, stick: this.stick });
        this.composer.blur();
        const docked = SuptDock.on;
        SuptDock.leave(this.el);
        this.el.remove();
        this.open = false;
        this.say("");
        this.ticking.run(false);
        Thread.stop();
        if (!docked)
            Session.patch({ chat: false });
        if (!App.view)
            document.body.classList.remove("covered");
    },
    close() {
        if (!this.open)
            return;
        if (!SuptDock.on)
            return this.back();
        SuptDock.remember(false);
        this.hide();
    },
    back() {
        if (SuptDock.on)
            return void this.closeOver();
        if (history.state?.chat)
            history.back();
        else
            this.hide();
    },
    docked() { return this.open && SuptDock.on; },
    closeOver({ pages = true } = {}) {
        const over = document.querySelector(".t-bsheet, .t-chat-pick, .t-viewer");
        if (over) {
            over._close?.();
            return true;
        }
        return pages && SuptPages.pop();
    },
    profile() {
        SuptPages.push(SuptProfile.render({ back: () => SuptPages.pop(), log: () => this.log(),
            edit: path => DocSheet.open(path, { route: false }) }));
    },
    away(items) {
        SuptPages.push(AwayPage.render(items, { back: () => SuptPages.pop(), follow: link => this.follow(link) }));
    },
    thread(row) {
        const view = AwayPage.thread(row, {
            back: () => SuptPages.pop(), gate: () => this.open,
            follow: async (link) => { if (await this.follow(link) === false)
                view.say(this.MISSING); },
            send: (body, was) => this.send({ ...body, thread: row.id }, was),
            retry: id => this.retry(id), discard: id => this.discard(id),
            peek: card => this.peek(card), pickCard: done => this.pickCard(done),
            open: s => this.thread(Thread.threads.find(x => x.id === s.legacyThread)
                || { id: s.legacyThread, kind: "owner", title: s.title }),
        });
        const dispose = view.dispose;
        view.dispose = () => { this.sinks.delete(row.id); dispose(); Thread.now(); };
        this.sinks.set(row.id, view);
        SuptPages.push(view);
    },
    log() {
        SuptPages.push(ActionLog.render({ back: () => SuptPages.pop(), follow: link => this.follow(link) }));
    },
    say(text) { if (this.said)
        this.said.textContent = text; },
    fromDesk(item) {
        if (this.docked())
            return this.attach(item);
        if (this.via === item.key && history.state?.via === "chat")
            return history.go(-1 - (history.state.sub || 0));
        this.show({ card: CardRef.from(item) });
    },
    attach(item) {
        const card = CardRef.from(item);
        const composer = [...SuptPages.stack].reverse().find(v => v.composer)?.composer || this.composer;
        if (composer.tray.has(card.key))
            return composer.say(`${CardRef.name(card)} is already attached.`);
        composer.tray.addCard(card);
    },
    async follow(link) {
        if (link.sfile)
            return ChatLinks.image(link.sfile);
        if (!link.item)
            return;
        let item = App.find(link.item);
        if (!item) {
            await App.refresh();
            item = App.find(link.item);
        }
        if (!item) {
            this.say(this.MISSING);
            return false;
        }
        if (this.docked()) {
            await App.hop({ ...link, item: item.key });
            return true;
        }
        this.hide();
        this.via = item.key;
        Nav.push({ view: item.key, via: "chat" });
        App.open(item.key);
        if (link.shot)
            Shots.view(item, link.shot - 1);
        return true;
    },
    MISSING: "That one isn't on your deck right now, so there's no card to open.",
    peek(card) { Peek.open(card, { find: k => App.find(k), go: k => this.follow({ item: k }) }); },
    pickCard(done) {
        const close = () => { v.dispose(); v.el.remove(); };
        const v = Search.render({ close, items: () => Lanes.items(App.data), filter: () => DeckFilter.get(),
            pick: key => { const it = App.find(key); if (!it)
                return false; done(CardRef.from(it)); close(); return true; } });
        v.el.classList.add("t-over", "t-chat-pick");
        v.el._close = close;
        (App.root || document.getElementById("app")).append(v.el);
        v.focus();
    },
    send(body, was) {
        if (!Outbox.add(body, was))
            return false;
        this.say("");
        if (!body.thread)
            this.stick = true;
        this.drawAll();
        this.flush();
        return true;
    },
    drawAll() {
        this.draw();
        for (const v of this.sinks.values())
            v.draw();
    },
    resume() { if (Outbox.next())
        this.flush(); },
    flushing: null,
    flush() {
        this.flushing ||= (async () => {
            for (let e = Outbox.next(); e; e = Outbox.next())
                await this.deliver(e);
        })().finally(() => { this.flushing = null; });
        return this.flushing;
    },
    async deliver(e) {
        let out = null;
        try {
            out = await Tycho.auth(() => SuptWire.send({ ...e.body, client_id: e.client_id }));
        }
        catch { }
        out ||= { ok: false, reason: "the action token wasn't given." };
        const thread = e.body?.thread || null;
        const sink = thread ? this.sinks.get(thread) : { add: (m, busy) => Thread.add(m, busy), composer: this.composer };
        if (out.ok) {
            Outbox.drop(e.client_id);
            sink?.add(out.message, out.busy !== false);
            this.drawAll();
            return;
        }
        const reason = out.reason || "the Mac didn't answer.";
        const back = out.code !== "unknown" && sink?.composer?.isEmpty()
            && !Outbox.list().some(x => x.state === "failed" && (x.body?.thread || null) === thread);
        if (back) {
            Outbox.drop(e.client_id);
            sink.composer.restore(e.was, reason);
        }
        else
            Outbox.patch(e.client_id, { state: "failed", reason });
        this.drawAll();
    },
    retry(id) { Outbox.patch(id, { state: "sending", reason: "" }); this.drawAll(); this.flush(); },
    discard(id) {
        const e = Outbox.get(id);
        Outbox.drop(id);
        for (const f of e?.was?.files || [])
            Tycho.auth(() => Wire.discard(f.path)).catch(() => { });
        this.drawAll();
    },
};
addEventListener("popstate", e => {
    const st = e.state || {};
    if (SuptDock.on)
        return;
    if (st.chat && !Chat.open && SuptDock.fits())
        return;
    if (App.leaving) {
        if (Chat.open && !st.chat)
            Chat.hide();
        return;
    }
    if (Chat.open && DocSheet.el && !st.docSheet) {
        DocSheet.close();
        e.stopImmediatePropagation();
        return;
    }
    if (Chat.open && st.docSheet && st.docSheet !== DocSheet.path) {
        DocSheet.open(st.docSheet, { route: false, push: false });
        e.stopImmediatePropagation();
        return;
    }
    if (Chat.open && !st.chat) {
        if (Chat.closeOver())
            Nav.push({ ...st, chat: true });
        else
            Chat.hide();
        e.stopImmediatePropagation();
        return;
    }
    if (Chat.open && st.chat && SuptPages.depth() && !((App.desk?.stack.depth() || 0) > (st.sub || 0))) {
        SuptPages.pop();
        e.stopImmediatePropagation();
        return;
    }
    if (!Chat.open && st.chat) {
        const over = document.querySelector(".t-viewer") || [document.querySelector(".t-sheet")].find(s => s && s._modal?.() !== false);
        if (App.desk && (over || DocSheet.el)) {
            if (over)
                (over._close || over._cancel)?.();
            else
                DocSheet.close();
            const key = App.desk.item.key;
            Nav.push({ view: key, ...(Chat.via === key ? { via: "chat" } : {}) });
            e.stopImmediatePropagation();
            return;
        }
        if (st.view && App.desk?.item.key !== st.view && App.find(st.view))
            App.open(st.view);
        else if (!st.view && App.view)
            App.home();
        Chat.show({ entry: false });
        e.stopImmediatePropagation();
    }
});
