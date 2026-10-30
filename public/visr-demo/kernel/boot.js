"use strict";
const Boot = {
    wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); },
    async at(started, ms) {
        await this.wait(Math.max(0, ms - (performance.now() - started)));
    },
    settle(promise, timeout = 3000) {
        return new Promise(resolve => {
            const timer = setTimeout(resolve, timeout);
            Promise.resolve(promise).catch(() => { }).finally(() => {
                clearTimeout(timer);
                resolve();
            });
        });
    },
    probe() {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        try {
            return fetch("/health", { cache: "no-store", signal: controller.signal })
                .catch(() => { }).finally(() => clearTimeout(timer));
        }
        catch {
            clearTimeout(timer);
            return Promise.resolve();
        }
    },
    worker() {
        try {
            if ("serviceWorker" in navigator)
                return navigator.serviceWorker.register("sw.js");
        }
        catch { }
        return Promise.resolve();
    },
    readiness(queue) {
        return [
            Promise.resolve(),
            this.settle(queue),
            this.settle(this.worker()),
            this.settle(this.probe()),
        ];
    },
    show(root, selector) { root.querySelector(selector)?.classList.add("on"); },
    fit(svg) {
        try {
            const b = svg?.querySelector("text")?.getBBox();
            if (b?.width > 0)
                svg.setAttribute("viewBox", `${b.x} 12 ${b.width} 112`);
        }
        catch { }
    },
    async run(root, queue, done) {
        const started = performance.now();
        const ready = this.readiness(queue);
        root.classList.add("running");
        this.fit(root.querySelector(".boot-wordmark"));
        root.querySelector(".boot-panel").setAttribute("aria-hidden", "false");
        Sound.power();
        await this.at(started, 350);
        this.show(root, ".boot-unit");
        await this.at(started, 700);
        this.show(root, ".boot-status");
        await this.at(started, 1050);
        this.show(root, ".boot-link");
        await this.at(started, 1250);
        this.show(root, ".boot-lab");
        await this.at(started, 1900);
        this.show(root, ".boot-thanks");
        await this.at(started, 2350);
        this.show(root, ".boot-red-rule");
        await this.at(started, 3200);
        this.show(root, ".boot-wordmark");
        Sound.chime();
        await this.at(started, 4550);
        this.show(root, ".boot-terminal");
        const cells = [...root.querySelectorAll(".boot-stages i")];
        let beat = 5150 + Math.random() * 500;
        for (let i = 0; i < cells.length; i++) {
            await Promise.all([ready[i], this.at(started, beat)]);
            cells[i].classList.add("on");
            Sound.tick();
            beat += 650 + Math.random() * 600;
        }
        await this.at(started, 9500);
        root.querySelector(".boot-stages").classList.add("complete");
        Sound.resolve();
        await this.at(started, 9950);
        root.querySelector(".boot-stages").classList.remove("complete");
        await this.at(started, 10150);
        this.show(root, ".boot-dots");
        await this.at(started, 10450);
        this.show(root, ".boot-tagline");
        await this.at(started, 12200);
        done();
        root.classList.add("leaving");
        await this.wait(650);
        root.classList.add("off");
    },
};
