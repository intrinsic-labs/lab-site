"use strict";
const Speech = {
    audio: null, id: null, st: "idle", why: "", tell: null, ask: 0,
    part: 0, cued: false,
    replies: new Map(),
    silence() {
        if (this._silence)
            return this._silence;
        const rate = 8000, n = rate / 10, b = new DataView(new ArrayBuffer(44 + n));
        const s = (o, t) => [...t].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
        s(0, "RIFF");
        b.setUint32(4, 36 + n, true);
        s(8, "WAVEfmt ");
        b.setUint32(16, 16, true);
        b.setUint16(20, 1, true);
        b.setUint16(22, 1, true);
        b.setUint32(24, rate, true);
        b.setUint32(28, rate, true);
        b.setUint16(32, 1, true);
        b.setUint16(34, 8, true);
        s(36, "data");
        b.setUint32(40, n, true);
        for (let i = 0; i < n; i++)
            b.setUint8(44 + i, 128);
        return (this._silence = URL.createObjectURL(new Blob([b], { type: "audio/wav" })));
    },
    player() {
        if (this.audio)
            return this.audio;
        const a = new Audio();
        a.preload = "auto";
        a.addEventListener("ended", () => { if (this.cued)
            this.next(); });
        a.addEventListener("error", () => {
            if (!this.cued || this.st !== "playing")
                return;
            this.cued = false;
            this.drop(this.id, this.part);
            this.set(this.id, "stalled", `${this.which(this.id, this.part)} couldn't play. Tap to try it again.`);
        });
        for (const e of ["loadedmetadata", "play"])
            a.addEventListener(e, () => { if (this.cued)
                SpeechSpeed.apply(a); });
        SpeechSpeed.changed = () => { if (this.cued)
            SpeechSpeed.apply(a); };
        return (this.audio = a);
    },
    KEEP: 4,
    entry(id) {
        let e = this.replies.get(id);
        if (!e) {
            e = { parts: null, urls: [], pending: [] };
            this.replies.set(id, e);
            for (const [old, o] of this.replies) {
                if (this.replies.size <= this.KEEP)
                    break;
                if (old === id || old === this.id)
                    continue;
                this.replies.delete(old);
                o.urls.forEach(u => u && URL.revokeObjectURL(u));
            }
        }
        return e;
    },
    drop(id, k) {
        const e = this.replies.get(id);
        if (e?.urls[k]) {
            URL.revokeObjectURL(e.urls[k]);
            e.urls[k] = null;
        }
    },
    which(id, k) {
        const n = this.replies.get(id)?.parts;
        return n > 1 ? `Part ${k + 1} of ${n}` : "The reply";
    },
    state(id) { return id === this.id ? this.st : "idle"; },
    note(id) { return id === this.id ? this.why : ""; },
    set(id, st, why) {
        const tell = this.tell;
        this.st = st;
        this.why = why || "";
        if (st === "idle") {
            this.id = null;
            this.tell = null;
        }
        else
            this.id = id;
        tell?.(st, why);
    },
    stop() {
        this.ask++;
        this.cued = false;
        if (this.audio) {
            this.audio.pause();
            this.audio.removeAttribute("src");
            this.audio.load();
        }
        if (this.id)
            this.set(null, "idle");
    },
    toggle(id, onstate) {
        if (this.id === id) {
            const a = this.player();
            this.tell = onstate;
            if (this.st === "playing") {
                a.pause();
                return this.set(id, "paused");
            }
            if (this.st === "buffering") {
                this.ask++;
                return this.set(id, "paused", "Paused while the next part is read.");
            }
            if (this.st === "paused" && this.cued) {
                const ask = this.ask;
                SpeechSpeed.apply(a);
                return a.play().then(() => { if (ask === this.ask)
                    this.set(id, "playing"); }, () => { if (ask === this.ask)
                    this.set(id, "paused", "This device wouldn't play it. Tap again."); });
            }
            if (this.st === "paused" || this.st === "stalled")
                return this.go(id, this.part);
            return this.stop();
        }
        this.stop();
        this.tell = onstate;
        this.set(id, "loading");
        const a = this.player();
        a.src = this.silence();
        a.play().catch(() => { });
        this.go(id, 0);
        if (this.entry(id).parts === null)
            this.load(id, 1);
    },
    load(id, k) {
        const e = this.entry(id);
        if (e.urls[k])
            return Promise.resolve({ url: e.urls[k] });
        return (e.pending[k] ||= (async () => {
            try {
                const got = await fetch(SuptWire.speechUrl(id, k), { cache: "no-cache" });
                if (!got.ok) {
                    let why = null;
                    try {
                        const j = await got.json();
                        why = j.reason || j.error;
                    }
                    catch { }
                    return { why: why || "It couldn't be read aloud." };
                }
                const parts = Number(got.headers.get("X-Speech-Parts"));
                e.parts = parts > 0 ? parts : 1;
                e.urls[k] = URL.createObjectURL(await got.blob());
                return { url: e.urls[k] };
            }
            catch {
                return { why: "The Mac didn't answer." };
            }
            finally {
                e.pending[k] = null;
            }
        })());
    },
    AHEAD: 2,
    ahead(id, k) {
        const e = this.entry(id);
        for (let j = k + 1; j <= k + this.AHEAD; j++) {
            if (this.id !== id || e.parts === null || j >= e.parts || e.urls[j] || e.pending[j])
                continue;
            this.load(id, j);
        }
    },
    async go(id, k) {
        const ask = ++this.ask;
        const e = this.entry(id);
        this.part = k;
        this.cued = false;
        if (!e.urls[k]) {
            if (k === 0)
                this.set(id, "loading");
            else
                this.set(id, "buffering", `Reading ${this.which(id, k).toLowerCase()}…`);
        }
        const got = await this.load(id, k);
        if (ask !== this.ask)
            return;
        if (!got.url) {
            if (k === 0)
                return this.set(null, "idle", got.why);
            return this.set(id, "stalled", `${this.which(id, k)} couldn't be read: ${got.why.replace(/\.$/, "").replace(/^[A-Z](?=[a-z])/, c => c.toLowerCase())}. Tap to carry on from there.`);
        }
        this.ahead(id, k);
        const a = this.player();
        this.cued = true;
        a.src = got.url;
        SpeechSpeed.apply(a);
        try {
            await a.play();
        }
        catch (err) {
            if (ask === this.ask && err?.name !== "AbortError")
                this.set(id, "paused", "This device wouldn't play it. Tap again.");
            return;
        }
        if (ask === this.ask)
            this.set(id, "playing");
    },
    next() {
        const e = this.replies.get(this.id);
        this.cued = false;
        if (e && this.part + 1 < (e.parts ?? 1))
            return this.go(this.id, this.part + 1);
        this.set(null, "idle");
    },
};
