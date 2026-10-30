"use strict";
const Conversation = {
    BUSY_MS: 2_000,
    IDLE_MS: 10_000,
    live: new Set(),
    create(id = null, { key = null, gate = () => true, subject = null } = {}) {
        const c = Object.create(this.proto);
        return Object.assign(c, { id, KEY: key, gate, subject,
            messages: [], busy: false, error: null, fault: null, activity: [], progress: null, threads: [],
            live: false, timer: 0, reading: null, synced: false, fns: [],
            asked: 0,
            cursor: null });
    },
    proto: {
        KEEP: 200,
        load() {
            const s = this.KEY && Store.get(this.KEY, null);
            if (s && Array.isArray(s.messages)) {
                this.messages = s.messages;
                this.busy = !!s.busy;
                this.error = s.error || null;
                this.threads = Array.isArray(s.threads) ? s.threads : [];
            }
        },
        save() {
            if (this.KEY)
                Store.set(this.KEY, { messages: this.messages.slice(-this.KEEP), busy: this.busy, error: this.error, threads: this.threads });
        },
        on(fn) { this.fns.push(fn); },
        off(fn) { this.fns = this.fns.filter(f => f !== fn); },
        emit() { for (const fn of this.fns)
            fn(); },
        last() { return this.cursor; },
        merge(list, full) {
            const seen = new Set(this.messages.map(m => m.id));
            if (full) {
                const sig = m => m.map(x => x.id).join("|");
                const changed = sig(list) !== sig(this.messages);
                this.messages = list;
                return changed;
            }
            const fresh = list.filter(m => !seen.has(m.id));
            this.messages = [...this.messages, ...fresh].sort((a, b) => (a.at || "").localeCompare(b.at || ""));
            return fresh.length > 0;
        },
        add(m, busy) {
            if (m && !this.messages.some(x => x.id === m.id))
                this.messages = [...this.messages, m].sort((a, b) => (a.at || "").localeCompare(b.at || ""));
            this.busy = busy;
            this.error = null;
            this.activity = [];
            this.progress = null;
            this.save();
            this.emit();
            this.schedule();
        },
        resync() { this.asked++; this.synced = false; },
        async read() {
            if (this.reading)
                return this.reading;
            const asked = this.asked;
            await this.fetch(asked);
            if (this.asked !== asked && this.live)
                await this.read();
        },
        fetch(asked) {
            const full = !this.synced || !this.last();
            this.reading = (async () => {
                const out = await SuptWire.thread(full ? null : this.last(), this.id, this.subject);
                if (!out.ok) {
                    const was = this.fault;
                    this.fault = out;
                    if (was?.reason !== out.reason)
                        this.emit();
                    return;
                }
                const moved = this.merge(out.messages || [], full);
                const got = out.messages || [];
                if (got.length)
                    this.cursor = got.at(-1).id;
                else if (full)
                    this.cursor = null;
                const activity = out.busy && Array.isArray(out.activity) ? out.activity : [];
                const progress = out.busy ? SuptProgress.received(out.progress) : null;
                const threads = Array.isArray(out.threads) ? out.threads : [];
                const lines = l => l.map(t => `${t.id}:${t.kind}:${t.title}:${t.at}:${t.busy}:${t.error}:${t.line}`).join("|");
                const state = this.busy !== !!out.busy || this.error !== (out.error || null) || this.fault || !this.synced
                    || activity.at(-1)?.label !== this.activity.at(-1)?.label || !SuptProgress.same(progress, this.progress)
                    || lines(threads) !== lines(this.threads);
                this.synced = this.asked === asked;
                this.fault = null;
                this.busy = !!out.busy;
                this.error = out.error || null;
                this.activity = activity;
                this.progress = progress;
                this.threads = threads;
                if (moved || state) {
                    this.save();
                    this.emit();
                }
            })().finally(() => { this.reading = null; });
            return this.reading;
        },
        schedule() {
            clearTimeout(this.timer);
            if (!this.live)
                return;
            this.timer = setTimeout(async () => {
                if (document.visibilityState !== "hidden" && this.gate())
                    await this.read();
                this.schedule();
            }, this.busy ? Conversation.BUSY_MS : Conversation.IDLE_MS);
        },
        async now() { await this.read(); this.schedule(); },
        start() {
            if (this.live)
                return;
            this.live = true;
            Conversation.live.add(this);
            this.now();
        },
        stop() {
            this.live = false;
            this.synced = false;
            this.cursor = null;
            clearTimeout(this.timer);
            this.activity = [];
            this.progress = null;
            Conversation.live.delete(this);
        },
        images() {
            return this.messages.flatMap(m => (m.attachments || []).filter(a => /^image\//.test(a.type || "")));
        },
    },
};
const Thread = Conversation.create(null, { key: "tycho.chat.thread" });
Thread.load();
const readLive = () => { for (const c of Conversation.live)
    if (c.gate())
        c.now(); };
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible")
    readLive(); });
addEventListener("focus", readLive);
