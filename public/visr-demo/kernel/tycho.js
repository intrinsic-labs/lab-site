"use strict";
const Tycho = {
    VERSION: "0.3",
    app: null,
    small: () => matchMedia("(max-width: 760px)").matches,
    starters: [],
    _started: false,
    afterStart(fn) {
        if (this._started) {
            try {
                fn();
            }
            catch (e) {
                console.warn(e);
            }
        }
        else
            this.starters.push(fn);
    },
    init() {
        Log.install();
        document.addEventListener("click", e => {
            if (e.target.closest(".t-btn:not([disabled]), .row"))
                Sound.click();
            Log.click(e.target);
        });
        this.installEditMenu();
        this.installLifecycle();
        const boot = document.getElementById("boot");
        const ready = this.app?.prepare?.() ?? Promise.resolve();
        if (!Wake.needsBoot()) {
            boot.classList.add("off");
            Boot.worker();
            this.start();
            Log.event("os", LOG.BOOT, "wake", { coldMs: Math.round(performance.now()) });
            Wake.run(document.getElementById("wake"));
            return;
        }
        let started = false;
        const power = () => {
            if (started)
                return;
            started = true;
            boot.removeEventListener("pointerdown", power);
            removeEventListener("keydown", power);
            Boot.run(boot, ready, () => {
                Wake.booted();
                Log.event("os", LOG.BOOT, "boot", { coldMs: Math.round(performance.now()) });
                this.start();
            });
        };
        boot.addEventListener("pointerdown", power);
        addEventListener("keydown", power);
    },
    start() {
        if (this._started)
            return;
        this._started = true;
        try {
            this.app?.start?.();
        }
        catch (e) {
            console.error(e);
        }
        for (const fn of this.starters.splice(0)) {
            try {
                fn();
            }
            catch (e) {
                console.warn(e);
            }
        }
    },
};
addEventListener("DOMContentLoaded", () => Tycho.init());
