"use strict";
const AwayPage = {
    render(items, { back, follow }) {
        const first = items[0].id;
        const inner = T.el("div", { class: "t-away-inner" });
        const page = T.el("div", { class: "t-away-page" }, inner);
        const bar = TopBar.render({ title: AwayBox.title(items), back, label: "Back to the conversation" });
        const el = T.el("section", { class: "t-away-screen", "data-pid": "supt-away", "aria-label": "What it did on its own" }, bar, page);
        ChatLinks.catch(inner, link => follow(link));
        let ids = "";
        const draw = episode => {
            const sig = `${episode.map(m => m.id).join(",")}|${OfferDecide.sig(episode)}`;
            if (sig === ids)
                return;
            ids = sig;
            const kids = [];
            let prev = null;
            for (const m of episode) {
                if (prev && Messages.split(prev, m))
                    kids.push(T.el("div", { class: "t-chat-when t-foot" }, Messages.clock(m.at)));
                kids.push(...this.entry(m));
                prev = m;
            }
            inner.replaceChildren(...kids);
        };
        draw(items);
        const track = () => {
            const now = Episodes.split(Thread.messages).find(e => e.kind === "away" && e.items.some(m => m.id === first));
            if (now)
                draw(now.items);
        };
        Thread.on(track);
        return { el, dispose: () => Thread.off(track) };
    },
    thread(t, { back, follow, send, retry, discard, peek, pickCard, gate, open = () => { } }) {
        const conv = Conversation.create(t.id, { gate });
        const project = Subjects.is(t);
        let chosen = null, sub = null;
        let stick = true;
        const inner = T.el("div", { class: "t-away-inner thread", "aria-live": "polite" });
        const page = T.el("div", { class: "t-away-page" }, inner);
        const bar = TopBar.render({ title: String(t.title || ""), back, label: "Back to the conversation" });
        const chips = T.el("div", { class: "t-subjects-slot" });
        const composer = Composer.create({ draft: `${Composer.DRAFT}@${t.id}`, peek, pickCard,
            send: (body, was) => { stick = true; return send(chosen ? { ...body, subject: chosen } : body, was); } });
        const said = T.el("p", { class: "t-chat-say amber", role: "status" });
        const ask = AskDock.create();
        composer.el.querySelector(".t-chatbar-inner").prepend(ask.el, said);
        const el = T.el("section", { class: `t-away-screen thread${project ? " project" : ""}`, "data-pid": "supt-thread",
            "data-thread": String(t.id), "aria-label": `Thread: ${t.title}` }, bar, project ? chips : null, page, composer.el);
        const ctl = { peek, image: id => ChatLinks.image(id), follow };
        ChatLinks.catch(inner, link => follow(link));
        ChatLinks.catch(ask.el, link => follow(link));
        el.addEventListener("t-ask", e => { e.stopPropagation(); ask.show(e.detail.offer); });
        let sig = "", chipSig = "";
        const fallback = c => (c.busy ? String(c.activity.at(-1)?.label || "") : "");
        const doing = () => { if (!el.isConnected)
            return; const c = shown(); Messages.doing(inner.querySelector(".t-chat-thinking"), c.busy ? c.progress : null, fallback(c)); };
        const ticking = SuptProgress.ticker(doing);
        const toEnd = () => { page.scrollTop = page.scrollHeight; };
        page.addEventListener("scroll", () => { stick = page.scrollHeight - page.scrollTop - page.clientHeight < 48; }, { passive: true });
        inner.addEventListener("load", () => { if (stick)
            toEnd(); }, true);
        const onViewport = () => { if (stick)
            toEnd(); };
        Tycho.viewport.on(onViewport);
        composer.el.addEventListener("focusin", () => requestAnimationFrame(onViewport));
        const row = () => conv.threads.find(x => x.id === t.id) || t;
        const subject = () => Subjects.list(row()).find(x => x.id === chosen) || null;
        const shown = () => (sub?.synced ? sub : conv);
        const messages = () => !chosen ? conv.messages
            : sub?.synced ? sub.messages : conv.messages.filter(m => Subjects.about(m, chosen));
        const choose = id => {
            if (id === chosen)
                return;
            chosen = id;
            if (sub) {
                sub.off(draw);
                sub.stop();
            }
            sub = id ? Conversation.create(t.id, { gate, subject: id }) : null;
            const s = subject();
            composer.hint(s ? `About this ${s.kind === "task" ? "task" : "outcome"}` : "Message", s ? `Message about ${s.title}` : "Message");
            stick = true;
            draw();
            if (sub) {
                sub.on(draw);
                sub.start();
            }
        };
        const draw = () => {
            if (project) {
                const r = row();
                const now = [chosen, ...Subjects.list(r).map(x => `${x.id}:${x.title}`)].join("|");
                if (now !== chipSig) {
                    chipSig = now;
                    chips.replaceChildren(Subjects.bar(r, chosen, choose));
                }
            }
            const c = shown();
            const list = messages();
            const out = Outbox.list().filter(e => e.body?.thread === t.id && (!chosen || e.body.subject === chosen));
            ticking.run(c.busy);
            const titles = project && !chosen ? Subjects.titles(row(), conv.messages) : null;
            const now = [chosen, list.map(m => m.id).join(","), c.busy, c.error, c.fault?.reason, c.synced,
                titles ? [...titles].join(",") : "", subject()?.legacyThread || "",
                out.map(e => `${e.client_id}:${e.state}:${e.reason}`).join(","), OfferDecide.sig(list)].join("|");
            if (now === sig) {
                doing();
                return;
            }
            sig = now;
            const kids = [];
            const earlier = chosen ? Subjects.earlier(subject(), open) : null;
            if (earlier)
                kids.push(earlier);
            let prev = null;
            for (const m of list) {
                if (Messages.split(prev, m))
                    kids.push(Messages.divider(m.at));
                const subjects = titles ? Subjects.of(m).filter(id => titles.has(id)).map(id => ({ id, title: titles.get(id) })) : [];
                kids.push(Messages.node(m, ctl, { subjects }));
                prev = m;
            }
            if (!list.length && !out.length && !c.fault)
                kids.push(T.el("p", { class: "t-chat-empty dim" }, c.synced ? "Nothing in this thread yet." : "Reading the thread…"));
            for (const e of out)
                kids.push(e.state === "failed"
                    ? Messages.unsent(e, ctl, { retry: () => retry(e.client_id), discard: () => discard(e.client_id) })
                    : Messages.pending(e.body, e.was, ctl));
            if (c.busy)
                kids.push(Messages.thinking(c.progress, fallback(c)));
            else if (c.error && list.at(-1)?.role !== "assistant")
                kids.push(Messages.failed(c.error));
            if (c.fault)
                kids.push(T.el("p", { class: "t-chat-fault t-foot amber" }, c.fault.code === "unsupported" ? c.fault.reason : `COULDN'T READ THE THREAD · ${c.fault.reason}`));
            const keep = stick ? null : page.scrollTop;
            inner.replaceChildren(...kids);
            ask.draw(list);
            if (keep === null)
                toEnd();
            else
                page.scrollTop = keep;
        };
        conv.on(draw);
        draw();
        conv.start();
        requestAnimationFrame(toEnd);
        return {
            el, conv, composer, draw,
            add(m, busy) {
                conv.add(m, busy);
                if (sub && m && Subjects.about(m, sub.subject))
                    sub.add(m, busy);
            },
            now() { conv.now(); sub?.now(); },
            say: text => { said.textContent = text; },
            dispose: () => {
                conv.off(draw);
                conv.stop();
                ticking.run(false);
                if (sub) {
                    sub.off(draw);
                    sub.stop();
                }
                Tycho.viewport.off(onViewport);
                composer.blur();
            },
        };
    },
    entry(m) {
        if (m.role === "event")
            return [Messages.event(m)];
        if (!m.routine)
            return [Messages.reply(m)];
        const when = Messages.clock(m.at);
        return [T.el("div", { class: "t-event routine", "data-id": m.id || "", "data-routine": String(m.routine.name || "") }, T.el("span", { class: "t-event-mark", "aria-hidden": "true" }, AwayBox.ROUTINE), T.el("span", { class: "t-event-text" }, T.el("b", {}, String(m.routine.title || "Routine")), when ? ` · ${when}` : "")),
            Messages.reply(m)];
    },
};
