"use strict";
const POLL_MS = 30_000;
const App = {
    data: null, fault: null, checked: null, first: null,
    root: null, view: null, desk: null, key: null, busy: false, marking: false, lastRead: 0, leaving: false,
    reading: null, readSeq: 0, sig: "",
    find(key) { return Lanes.items(this.data).find(i => i.key === key) || null; },
    SETTLES: new Set(["approve", "reject", "done", "accept", "park", "undo", "acknowledge", "not_needed"]),
    STAYS: new Set(["refreshed", "feedback_revised"]),
    LINKS: new Set(["link", "unlink"]),
    drop(key) {
        if (!this.data)
            return;
        this.data = { ...this.data, items: this.data.items.filter(i => i.key !== key) };
        this.sig = Snapshot.sig(this.data);
        Snapshot.save(this.data, this.checked);
    },
    prepare() {
        const snap = Snapshot.load();
        if (snap) {
            this.data = snap.data;
            this.checked = snap.checked;
            this.sig = Snapshot.sig(snap.data);
            Fmt.names = snap.data?.projects || {};
        }
        this.first = this.refresh();
        return this.first;
    },
    refresh({ fresh = false } = {}) {
        if (this.reading && !fresh)
            return this.reading;
        const seq = ++this.readSeq;
        const read = (async () => {
            let data = null, fault = null;
            try {
                data = await Wire.list();
            }
            catch (e) {
                fault = e;
            }
            if (seq !== this.readSeq)
                return !fault;
            this.lastRead = Date.now();
            if (fault) {
                this.fault = fault;
                Link.show(fault, this.checked);
                return false;
            }
            this.fault = null;
            this.checked = new Date().toTimeString().slice(0, 5);
            Link.show(null);
            const sig = Snapshot.sig(data);
            if (sig !== this.sig || !this.data) {
                this.data = data;
                this.sig = sig;
                Fmt.names = data?.projects || {};
                Snapshot.save(data, this.checked);
            }
            return true;
        })();
        this.reading = read;
        read.finally(() => { if (this.reading === read)
            this.reading = null; });
        return read;
    },
    async start() {
        Nav.restorable = st => st?.view === "files";
        Nav.adopt();
        this.root = document.getElementById("app");
        this.root.replaceChildren(Home.mount({ open: (key, opts) => this.open(key, opts) }));
        Link.mount(() => this.refresh().then(() => Home.render(this.data, this.fault, this.checked)));
        Pending.mount(key => Sending.recover(this, key));
        Home.render(this.data, this.fault, this.checked);
        this.live();
        if (SuptDock.fits() && SuptDock.wanted())
            Chat.show();
        const shown = this.sig;
        await this.first;
        Chat.resume();
        if (this.view)
            return;
        if (this.sig !== shown || !this.data)
            Home.render(this.data, this.fault, this.checked);
        const link = DeepLink.take();
        if (link)
            return this.follow(link);
        this.restore();
        if (!SuptDock.fits() && Session.get().chat)
            Chat.show();
    },
    follow(link) {
        if (link.board)
            return this.open("telemetry");
        if (link.monday !== undefined)
            return this.open("monday", { date: link.monday });
        if (link.sfile)
            return Chat.show({ image: link.sfile });
        if (link.chat !== undefined)
            return ChatLink.open(link.chat);
        if (Chat.isOpen() && !SuptDock.on)
            Chat.hide();
        const item = this.find(link.item);
        if (item) {
            this.open(link.item);
            if (link.shot)
                Shots.view(item, link.shot - 1);
            return;
        }
        this.home();
        Home.say("", "", this.fault ? "The deck couldn't be read, so the link wasn't opened."
            : "That item isn't waiting on you any more.");
    },
    async hop(link) {
        let item = this.find(link.item);
        if (!item) {
            await this.refresh();
            item = this.find(link.item);
        }
        if (!item) {
            if (!this.desk)
                return this.follow(link);
            return this.desk.flag(T.el("div", { class: "t-note amber" }, T.el("div", { class: "t-label" }, "NOT ON THE DECK"), T.el("p", {}, "That item isn't waiting on you any more.")));
        }
        while (DocSheet.el && history.state?.docSheet)
            await Nav.back(1);
        DocSheet.close();
        await Nav.back(this.desk ? Math.min(this.desk.stack.depth(), history.state?.sub || 0) : 0);
        this.open(item.key);
        if (link.shot)
            Shots.view(item, link.shot - 1);
    },
    VIEWS: new Set(["capture", "telemetry", "monday", "settings", "search"]),
    restore() {
        const s = Session.get();
        if (s.view === "capture")
            return this.open("capture", { restore: true });
        if (s.view === "telemetry" || s.view === "bulletin")
            return this.open("telemetry", { restore: true });
        if (s.view === "monday")
            return this.open("monday", { restore: true });
        if (s.view === "settings")
            return this.open("settings", { restore: true });
        if (s.view === "files")
            return this.open("files", { restore: true,
                files: history.state?.view === "files" ? history.state.files : s.files });
        if (s.view === "desk" && this.find(s.key))
            return this.open(s.key, { restore: true });
        Session.patch({ view: "ring", sheet: null });
    },
    open(key, { restore = false, notice = null, date = "", files = null, focus = false } = {}) {
        if (key === "fault") {
            this.refresh().then(() => Home.render(this.data, this.fault, this.checked));
            return;
        }
        if (key === "empty")
            return;
        if (key === "chat")
            return Chat.show({ focus });
        this.close();
        if (key === "capture") {
            this.view = Capture.render({ back: () => this.back() });
            Session.patch({ view: "capture", key: null });
        }
        else if (key === "telemetry") {
            this.view = Telemetry.render({ back: () => this.back() });
            Session.patch({ view: "telemetry", key: null });
        }
        else if (key === "monday") {
            this.view = Monday.render({ back: () => this.back(), date });
            Session.patch({ view: "monday", key: null });
        }
        else if (key === "settings") {
            this.view = Settings.render({ back: () => this.back() });
            Session.patch({ view: "settings", key: null });
        }
        else if (key === "files") {
            this.view = Files.render({ back: () => this.back(), state: files });
        }
        else if (key === "search") {
            this.view = Search.render({ close: () => this.back(), items: () => Lanes.items(this.data),
                filter: () => DeckFilter.get(), pick: k => this.jump(k) });
            Session.patch({ view: "search", key: null });
        }
        else {
            const item = this.find(key);
            if (!item)
                return;
            this.view = Desk.render(item, this.controls(item));
            this.desk = this.view;
            notice ||= Sending.notice(key);
            if (notice)
                this.desk.flag(notice);
            Session.patch({ view: "desk", key });
            Session.enter(key);
        }
        this.view.el.classList.add("t-over");
        this.root.append(this.view.el);
        document.body.classList.add("covered");
        this.key = key;
        if (Nav.root(history.state) || history.state.view !== key)
            Nav.push({ view: key });
        this.view.activate?.();
        Place.track(this.view, { restore });
        if (!restore)
            this.view.focus?.();
        const s = Session.get();
        if (restore && s.sheet && this.desk) {
            const item = this.desk.item;
            if (!(item.actions || []).includes(s.sheet))
                return;
            if (s.sheet === "park")
                this.park(item);
            else if (s.sheet === "block")
                this.block(item);
            else if (s.sheet === "link")
                this.link(item);
            else
                this.compose(item, s.sheet);
        }
    },
    close() {
        if (!this.view)
            return;
        document.querySelector(".t-sheet")?._cancel?.();
        if (this.desk)
            Session.leave(this.desk.item.key);
        this.view.dispose?.();
        this.view.el.remove();
        this.view = this.desk = this.key = null;
        document.body.classList.remove("covered");
    },
    jump(key) {
        const item = this.find(key);
        if (!item)
            return false;
        const was = DeckFilter.get();
        const now = DeckFilter.reveal(was, item);
        if (now !== was)
            DeckFilter.set(now);
        Session.patch({ front: key });
        this.back();
        if (now !== was)
            Home.say("FILTER CHANGED", "amber", `Filter set to ${DeckFilter.label(DeckFilter.get())} to show ${CardSearch.ids(item)[0]}.`);
        return true;
    },
    back() {
        if (history.state?.view)
            history.back();
        else
            this.home();
    },
    home() {
        this.close();
        DocSheet.close();
        document.querySelector(".t-sheet")?._cancel?.();
        Session.patch({ view: "ring", key: null, sheet: null, scroll: 0 });
        Home.render(this.data, this.fault, this.checked);
    },
    controls(item) {
        return {
            act: (action, extra) => this.perform(item.key, action, extra),
            compose: (action) => this.compose(item, action),
            park: () => this.park(item),
            block: () => this.block(item),
            link: () => this.link(item),
            mark: action => this.mark(item.key, action),
            back: () => this.back(),
            openDoc: path => DocSheet.open(path),
            saved: key => this.adopt(key),
            chat: () => Chat.fromDesk(this.desk?.item?.key === item.key ? this.desk.item : item),
        };
    },
    compose(item, action) {
        if (action === "handback")
            return Handback.open({ key: item.key,
                send: (text, nextAction) => this.perform(item.key, action, { text, nextAction }) });
        const refuse = action === "reject";
        const route = action === "route";
        const undo = action === "undo";
        return Compose.open({
            key: item.key, revision: item.revision, action,
            cap: refuse ? "REFUSE" : route ? "ROUTE TO OWNER" : undo ? "UNDO" : "FEEDBACK",
            hint: refuse ? "Why? (optional)"
                : route ? "What should the owner land? (optional)"
                    : undo ? "Undo what the rule did. Why? (optional)"
                        : item.kind === "calibration" ? 'Which edits should stay, drop or change? e.g. "apply 1, 2 and 3, drop 4". To reword an edit, give its number and exact replacement wording.'
                            : item.kind === "chore" ? `A line for the task's Discussion${item.textMax ? `, ${item.textMax} characters at most` : ""}.`
                                : "What should change?",
            files: Fmt.takesFiles(item, action),
            verb: refuse ? "REFUSE" : route ? "ROUTE" : undo ? "UNDO" : "SEND", tone: refuse || undo ? "danger" : "primary",
            needsText: !refuse && !route && !undo, max: item.textMax, loose: action === "feedback",
            send: (text, attachments) => this.perform(item.key, action, { text, attachments }),
        });
    },
    block(item) {
        return Block.open({ item, items: this.data?.items || [],
            send: ({ blockedBy, text }) => this.perform(item.key, "block", blockedBy ? { blockedBy } : { text }) });
    },
    link(item) {
        return LinearLink.open({ item,
            send: (action, link) => this.perform(item.key, action, { link }),
            go: key => { location.hash = `#item=${encodeURIComponent(key)}`; } });
    },
    park(item) {
        return Park.open({
            key: item.key,
            send: (text, nextLook) => this.perform(item.key, "park", { text, nextLook }),
        });
    },
    RESULT: { approve: ["APPROVED", "ok"], reject: ["REFUSED", "bad"], done: ["DONE", "ok"],
        accept: ["ACCEPTED", "ok"], park: ["PARKED", ""],
        feedback: ["FEEDBACK SENT", ""], later: ["FILED FOR LATER", ""],
        interactive: ["INTERACTIVE", ""], handback: ["HANDED BACK", ""],
        interactive_starting: ["STARTING", ""], interactive_running: ["INTERACTIVE OPEN", ""],
        handing_back: ["HANDING BACK", ""], handed_back: ["HANDED BACK", "ok"],
        handback_pending: ["HANDBACK NOT COMPLETE", "amber"],
        blocked_by: ["BLOCKED", "amber"], blocked: ["BLOCKED", "amber"], unblocked: ["UNBLOCKED", ""],
        refreshed: ["REFRESHED", ""], feedback_revised: ["FEEDBACK RECEIVED", ""],
        undo: ["UNDONE", "amber"], acknowledge: ["GOT IT", ""], not_needed: ["NOT NEEDED", ""],
        linked: ["LINKED", "ok"], unlinked: ["UNLINKED", ""], unchanged: ["NOTHING CHANGED", ""],
        link: ["LINKED", "ok"], unlink: ["UNLINKED", ""] },
    label(action, out) {
        return (action === "not_needed" && this.RESULT.not_needed) || this.RESULT[out.result?.kind] || this.RESULT[action] || [action.toUpperCase(), ""];
    },
    async perform(key, action, extra = {}) {
        const item = this.desk?.item?.key === key ? this.desk.item : this.find(key);
        if (!item)
            return { ok: false, reason: "That item is no longer in the deck." };
        if (Pending.hides(key))
            return { ok: false, reason: "Your answer on this is still on its way. Wait for the Mac to answer it." };
        if (this.marking)
            return { ok: false, reason: "Wait a moment: your working mark is still being sent." };
        if (this.busy)
            return { ok: false, reason: "Wait a moment: an answer is still being sent." };
        const body = { key, revision: item.revision, action };
        if (extra.text !== undefined && (extra.text.trim() || !["reject", "undo"].includes(action)))
            body.text = extra.text;
        if (extra.attachments?.length)
            body.attachments = extra.attachments;
        if (action === "approve" && item.kind === "draft_outcome")
            body.reviewMinutes = Session.minutes(key);
        if (action === "approve" && typeof extra.owner === "string")
            body.owner = extra.owner;
        if (action === "approve" && Array.isArray(extra.repos) && extra.repos.length)
            body.repos = extra.repos;
        if (action === "park" && typeof extra.nextLook === "string")
            body.nextLook = extra.nextLook;
        if (action === "handback" && typeof extra.nextAction === "string")
            body.nextAction = extra.nextAction;
        if (action === "block" && typeof extra.blockedBy === "string")
            body.blockedBy = extra.blockedBy;
        if (this.LINKS.has(action) && extra.link)
            body.link = extra.link;
        const slot = `act|${key}|${action}`;
        body.requestId = Attempts.id(slot, { ...body, reviewMinutes: undefined });
        if (Sending.fits(item, action))
            return Sending.start(this, { item, action, body, slot, extra });
        this.busy = true;
        let out;
        try {
            out = await Tycho.auth(() => Wire.act(body));
        }
        finally {
            this.busy = false;
        }
        if (!out)
            return { ok: false, reason: "Not sent: the action token wasn't given." };
        Attempts.settle(slot, out);
        if (out.ok && (this.STAYS.has(out.result?.kind) || this.LINKS.has(action))) {
            if (out.result.kind === "feedback_revised")
                Drafts.clear(`${key}|${action}`);
            await this.redraw(key, out, action);
            return out;
        }
        if (out.ok) {
            Drafts.clearItem(key);
            Session.leave(key);
            Session.forget(key);
            const was = Session.get();
            const [label, tone] = this.label(action, out);
            await new Promise(r => setTimeout(r, ["approve", "reject", "done"].includes(action) ? 900 : 100));
            if (!(await this.refresh({ fresh: true })) && this.SETTLES.has(action))
                this.drop(key);
            if (was.front === key)
                Session.patch({ front: null, frontIndex: was.frontIndex || 0 });
            this.toDeck();
            Home.say(label, tone, out.result?.message || "");
            return out;
        }
        if (out.code === "stale")
            await this.stale(key, this.LINKS.has(action) ? out.reason : null);
        return out;
    },
    toDeck() {
        const depth = Nav.depth();
        if (depth) {
            this.leaving = true;
            history.go(-depth);
        }
        else
            this.home();
    },
    async redraw(key, out, action = "") {
        const [label, tone] = this.RESULT[out.result?.kind] || this.RESULT[action] || ["REFRESHED", ""];
        const message = out.result?.message || "";
        await this.refresh({ fresh: true });
        if (!this.find(key)) {
            Drafts.clearItem(key);
            Session.leave(key);
            Session.forget(key);
            this.toDeck();
            return Home.say(label, tone, message);
        }
        if (this.desk?.item.key !== key)
            return Home.say(label, tone, message);
        const sub = Math.min(this.desk.stack.depth(), history.state?.sub || 0);
        if (sub) {
            const popped = new Promise(r => addEventListener("popstate", r, { once: true }));
            history.go(-sub);
            await popped;
            if (this.desk?.item.key !== key)
                return;
        }
        const note = T.el("div", { class: "t-note ok" }, T.el("div", { class: "t-label" }, label), T.el("p", {}, message));
        this.close();
        this.open(key, { notice: note });
    },
    async mark(key, action) {
        if (this.marking)
            return null;
        if (this.busy || Pending.hides(key))
            return { ok: false, reason: "Wait a moment: an answer is still being sent." };
        const item = this.desk?.item?.key === key ? this.desk.item : this.find(key);
        if (!item)
            return { ok: false, reason: "That item is no longer in the deck." };
        this.marking = this.busy = true;
        let out;
        try {
            out = await Tycho.auth(() => Wire.act({ key, revision: item.revision, action }));
        }
        finally {
            this.marking = this.busy = false;
        }
        if (!out)
            return { ok: false, reason: "Not sent: the action token wasn't given." };
        if (out.ok) {
            if (await this.refresh({ fresh: true }))
                this.recheck();
            else if (this.desk?.item.key === key)
                this.desk.sync({ ...item, workingCleared: null,
                    working: action === "mark_working" ? item.working || { since: new Date().toISOString() } : null });
            return out;
        }
        if (out.code === "stale")
            await this.stale(key);
        return out;
    },
    async stale(key, why = null) {
        await this.refresh({ fresh: true });
        const again = this.find(key);
        if (!again) {
            this.back();
            Home.say("CHANGED", "bad", "It changed since you opened it and has left the deck.");
            return;
        }
        const note = why ? T.el("div", { class: "t-note amber" }, T.el("div", { class: "t-label" }, "NOT CHANGED"), T.el("p", {}, String(why)), T.el("p", {}, "It was reloaded with things as they are now."))
            : T.el("div", { class: "t-note amber" }, T.el("div", { class: "t-label" }, "THIS CHANGED SINCE YOU OPENED IT"), T.el("p", {}, "It was reloaded. Nothing was sent, and anything you wrote is kept."));
        this.close();
        this.open(key, { notice: note });
    },
    async adopt(key) {
        await this.refresh({ fresh: true });
        const it = this.find(key);
        if (it && this.desk?.item.key === key)
            this.desk.sync(it);
    },
    live() {
        setInterval(() => {
            if (document.visibilityState === "hidden" || this.busy)
                return;
            if (Date.now() - this.lastRead >= POLL_MS)
                this.reload();
        }, 5_000);
        Tycho.onResume(() => this.reload());
        let links = 0;
        document.addEventListener("click", e => {
            const a = e.target.closest?.("a.t-item-link");
            if (!a || e.defaultPrevented || (Chat.isOpen() && (!SuptDock.on || Chat.el.contains(a))))
                return;
            const link = DeepLink.parse(a.getAttribute("href"));
            if (!link?.item)
                return;
            e.preventDefault();
            this.hop(link);
        });
        addEventListener("hashchange", async () => {
            const link = DeepLink.take();
            if (!link)
                return;
            const mine = ++links;
            if (link.item && !this.find(link.item))
                await this.refresh();
            if (mine === links)
                this.follow(link);
        });
        document.addEventListener("visibilitychange", () => {
            const key = this.desk?.item.key;
            if (!key)
                return;
            if (document.visibilityState === "hidden")
                Session.leave(key);
            else
                Session.enter(key);
        });
        addEventListener("popstate", e => {
            const st = e.state || {};
            if (this.leaving) {
                this.leaving = false;
                this.home();
                return;
            }
            const depth = this.desk?.stack.depth() || 0;
            const viewer = document.querySelector(".t-viewer");
            if (viewer) {
                viewer._close?.();
                if (depth && (st.sub || 0) < depth)
                    Nav.push({ ...history.state, sub: depth });
                return;
            }
            if (DocSheet.el && !st.docSheet) {
                DocSheet.close();
                return;
            }
            const sheet = document.querySelector(".t-sheet");
            if (sheet && sheet._modal?.() !== false) {
                sheet._cancel?.();
                if (this.view && !st.view)
                    Nav.push({ view: Session.get().key || Session.get().view || "capture" });
                if (depth && (st.sub || 0) < depth)
                    Nav.push({ ...history.state, sub: depth });
                return;
            }
            if (st.view === "files") {
                if (this.view?.navigate)
                    this.view.navigate(st.files);
                else
                    this.open("files", { files: st.files, restore: true });
                return;
            }
            if (st.view && this.view && st.view !== this.key) {
                if (this.find(st.view) || this.VIEWS.has(st.view)) {
                    this.close();
                    this.open(st.view);
                }
                else
                    this.home();
                return;
            }
            if (depth > (st.sub || 0) && st.view)
                return this.desk.stack.settle(st.sub || 0);
            if (this.view && !st.view)
                this.home();
        });
        addEventListener("keydown", e => {
            if (!this.desk || e.metaKey || e.ctrlKey || e.altKey)
                return;
            if (e.target.closest?.("textarea, input, select, [contenteditable]"))
                return;
            if (document.querySelector(".t-dialog, .t-viewer, .t-docsheet, .t-chat-pick, .t-chat-layer:not(.t-split)"))
                return;
            if (Chat.el?.contains(e.target))
                return;
            const sheet = document.querySelector(".t-sheet");
            if (sheet && (sheet._modal?.() !== false || e.key !== "Escape"))
                return;
            if (this.desk.key(e))
                e.preventDefault();
        });
        EscapeKey.install(this);
    },
    async reload() {
        const was = [this.sig, !!this.fault, this.checked];
        await this.refresh();
        if (this.view) {
            this.view.reread?.();
            return this.recheck();
        }
        const same = this.sig === was[0] && !!this.fault === was[1];
        const empty = !(this.data?.items || []).length;
        if (same && !(empty && this.checked !== was[2]))
            return;
        Home.render(this.data, this.fault, this.checked);
    },
    recheck() {
        if (!this.desk)
            return;
        const it = this.find(this.desk.item.key);
        if (!it) {
            this.desk.flag(T.el("div", { class: "t-note amber" }, T.el("div", { class: "t-label" }, "RESOLVED ELSEWHERE"), T.el("p", {}, "This item left the deck while you had it open.")));
            return;
        }
        if (it.revision === this.desk.item.revision)
            return this.desk.sync(it);
        if (!this.desk.editing())
            this.desk.flag(T.el("div", { class: "t-note amber" }, T.el("div", { class: "t-label" }, "THIS CHANGED"), T.el("p", {}, "It was updated since you opened it."), T.el("div", { class: "t-row" }, T.el("button", { class: "t-btn", onclick: () => {
                    this.close();
                    this.open(it.key);
                } }, "RELOAD IT"))));
    },
};
Tycho.app = App;
