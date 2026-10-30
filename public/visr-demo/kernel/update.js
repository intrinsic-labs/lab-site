"use strict";
const Update = {
    SOON_MS: 15_000,
    pending: false,
    watch() {
        const sw = navigator.serviceWorker;
        if (!sw)
            return;
        const had = !!sw.controller;
        sw.addEventListener("controllerchange", () => {
            if (!had || this.pending)
                return;
            this.pending = true;
            const booting = document.querySelector("#boot.running:not(.off)");
            if (performance.now() < this.SOON_MS && !booting)
                return location.reload();
            Tycho.onResume(() => location.reload());
        });
    },
};
Update.watch();
