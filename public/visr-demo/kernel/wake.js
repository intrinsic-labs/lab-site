"use strict";
const Wake = {
    KEY: "tycho.boot.last",
    DAY_STARTS: 6,
    MS: 520,
    dayStart(now = new Date()) {
        const d = new Date(now);
        d.setHours(this.DAY_STARTS, 0, 0, 0);
        if (d > now)
            d.setDate(d.getDate() - 1);
        return d;
    },
    needsBoot(now = new Date()) {
        const last = Number(Store.get(this.KEY, 0)) || 0;
        return last < this.dayStart(now).getTime();
    },
    booted() { Store.set(this.KEY, Date.now()); },
    run(el) {
        return new Promise(resolve => {
            el.classList.add("on");
            requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("go")));
            setTimeout(() => { el.classList.remove("on", "go"); resolve(); }, this.MS);
        });
    },
};
