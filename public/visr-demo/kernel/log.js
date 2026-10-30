"use strict";
const LOG = Object.freeze({
    BOOT: "os.boot",
    SHUTDOWN: "os.shutdown",
    VISIBILITY: "os.visibility",
    LAUNCH: "app.launch",
    CLOSE: "app.close",
    FOCUS: "app.focus",
    CLICK: "ui.click",
    MISSION_SHOWN: "mission.shown",
    MISSION_START: "mission.start",
    MISSION_COMPLETE: "mission.complete",
    MISSION_SKIP: "mission.skip",
    MISSION_SELECT: "mission.select",
    TERM_DROPIN: "term.dropin",
    TASK_FILED: "task.filed",
});
const Log = {
    VOCAB: new Set(Object.values(LOG)),
    boot: Math.random().toString(16).slice(2, 8),
    seq: 0,
    q: [],
    timer: null,
    retried: false,
    deafFor: null,
    MAX: 200,
    SEND: 100,
    BATCH: 20,
    EVERY: 5000,
    LABEL: 48,
    install() {
        try {
            document.addEventListener("visibilitychange", () => {
                this.event("os", LOG.VISIBILITY, null, { state: document.visibilityState });
                if (document.visibilityState === "hidden")
                    this.flush(true);
            });
            addEventListener("pagehide", () => this.flush(true));
        }
        catch { }
    },
    event(app, event, label, data) {
        try {
            if (!this.VOCAB.has(event))
                return console.warn("Log: outside the vocabulary —", event);
            const e = { ts: new Date().toISOString(), boot: this.boot,
                seq: ++this.seq, app: String(app || "os"), event };
            if (label)
                e.label = String(label).slice(0, this.LABEL);
            if (data && Object.keys(data).length)
                e.data = data;
            this.q.push(e);
            if (this.q.length > this.MAX)
                this.q.splice(0, this.q.length - this.MAX);
            if (this.q.length >= this.BATCH)
                this.flush();
            else
                this.arm();
        }
        catch { }
    },
    arm() {
        if (this.timer)
            return;
        this.timer = setTimeout(() => { this.timer = null; this.flush(); }, this.EVERY);
    },
    flush(beacon) {
        try {
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
            if (!this.q.length)
                return;
            const token = Tycho.token();
            if (!token)
                return;
            if (this.deafFor && this.deafFor === token) {
                this.q.length = 0;
                return;
            }
            const batch = this.q.splice(0, this.SEND);
            if (this.q.length)
                this.arm();
            const body = JSON.stringify({ token, events: batch });
            if (beacon && navigator.sendBeacon) {
                navigator.sendBeacon("/api/log", new Blob([body], { type: "application/json" }));
                return;
            }
            fetch("/api/log", { method: "POST", keepalive: true,
                headers: { "Content-Type": "application/json" },
                body })
                .then(r => {
                if (r.status === 401) {
                    this.deafFor = token;
                    console.warn("Log: /api/log refused the TERM token — IntrinsicOS events " +
                        "are not being recorded on this device");
                    return;
                }
                if (!r.ok)
                    throw new Error(r.status);
                this.retried = false;
            })
                .catch(() => {
                if (this.retried)
                    return;
                this.retried = true;
                this.q.unshift(...batch);
                this.arm();
            });
        }
        catch { }
    },
    text(node, depth = 0) {
        let out = "";
        for (const kid of node.childNodes) {
            if (kid.nodeType === 3)
                out += kid.nodeValue;
            else if (kid.nodeType === 1 && depth < 3 &&
                !kid.matches(".txt, .dots, .hint, .badge"))
                out += " " + this.text(kid, depth + 1) + " ";
        }
        return out;
    },
    label(hit) {
        const words = this.text(hit).replace(/\s+/g, " ").trim();
        if (words)
            return words;
        const ico = hit.querySelector("[data-ico]");
        return ico ? "#" + ico.getAttribute("data-ico") : "";
    },
    HITS: ".t-btn:not([disabled]), .t-icon, .ctl, .item, .row, .cell, .swatch",
    click(target) {
        try {
            const hit = target?.closest?.(this.HITS);
            if (!hit)
                return;
            const id = hit.querySelector(".id")?.textContent?.trim();
            this.event(hit.closest("[data-pid]")?.dataset.pid || "os", LOG.CLICK, this.label(hit), id && id.length <= 40 ? { id } : null);
        }
        catch { }
    },
};
