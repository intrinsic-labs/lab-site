"use strict";
Object.assign(Tycho, {
    epoch: 0,
    hiddenAt: 0,
    resumers: new Set(),
    onResume(fn) {
        this.resumers.add(fn);
        return () => this.resumers.delete(fn);
    },
    resumed(why) {
        const awayMs = this.hiddenAt ? Date.now() - this.hiddenAt : 0;
        this.hiddenAt = 0;
        this.epoch++;
        for (const fn of [...this.resumers]) {
            try {
                fn({ awayMs, why, epoch: this.epoch });
            }
            catch { }
        }
    },
    installLifecycle() {
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") {
                this.hiddenAt ||= Date.now();
                return;
            }
            this.resumed("visible");
        });
        addEventListener("freeze", () => { this.hiddenAt ||= Date.now(); });
        addEventListener("resume", () => this.resumed("unfrozen"));
        addEventListener("pageshow", e => { if (e.persisted)
            this.resumed("bfcache"); });
        if (document.wasDiscarded)
            this.discarded = true;
    },
});
