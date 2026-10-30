"use strict";
const Shots = {
    images: item => (item.content || []).filter(b => b.type === "image"),
    caption: b => String(b.title || "image").replace(/\.(png|jpe?g|gif|webp)$/i, "").replace(/[-_]+/g, " "),
    CONCURRENT: 2,
    AHEAD: "1200px",
    NOW: 0, SOON: 1, PAGE: 2,
    page(item) {
        const ctl = new AbortController();
        let alive = true, running = 0, viewer = null;
        const shots = this.images(item);
        const cap = i => this.caption(shots[i]);
        const slots = shots.map((b, i) => ({ i, b, frame: null, url: null, ask: null, rank: this.PAGE, queued: false }));
        const queue = [];
        const start = s => {
            running++;
            Wire.image(item.key, s.b.ref, { signal: ctl.signal }).then(url => {
                if (!alive)
                    return URL.revokeObjectURL(url);
                s.url = url;
                s.frame.replaceChildren(T.el("img", { src: url, alt: cap(s.i), decoding: "async" }));
                s.ask.done(url);
            }).catch(e => {
                s.ask.fail(e);
                s.ask = null;
                if (alive && !s.url)
                    s.frame.replaceChildren(T.el("span", { class: "amber" }, `Couldn't load the image: ${e.message}`));
            }).finally(() => { running--; pump(); });
        };
        const pump = () => {
            while (alive && running < this.CONCURRENT && queue.length) {
                queue.sort((x, y) => x.rank - y.rank || x.i - y.i);
                const s = queue.shift();
                s.queued = false;
                start(s);
            }
        };
        const want = (i, rank = this.PAGE) => {
            const s = slots[i];
            if (s.url)
                return Promise.resolve(s.url);
            if (!alive)
                return Promise.reject(new Error("The page closed."));
            if (s.ask) {
                if (s.queued)
                    s.rank = Math.min(s.rank, rank);
            }
            else {
                let done, fail;
                const p = new Promise((y, n) => { done = y; fail = n; });
                p.catch(() => { });
                s.ask = { p, done, fail };
                s.rank = rank;
                s.queued = true;
                queue.push(s);
            }
            pump();
            return s.ask.p;
        };
        const open = i => {
            viewer = Tycho.viewer({
                count: shots.length, start: i, caption: cap,
                load: (j, { soon } = {}) => want(j, soon ? this.SOON : this.NOW),
                onClose: () => { viewer = null; },
            });
        };
        slots.forEach(s => {
            s.frame = T.el("button", { class: "t-shot", type: "button",
                "aria-label": `Open ${cap(s.i)} full screen`, onclick: () => open(s.i) }, T.el("span", { class: "t-foot" }, "DEVELOPING…"));
        });
        const el = T.el("div", { class: "t-shots" }, ...slots.map(s => T.el("figure", { class: "t-shot-fig" }, T.el("figcaption", { class: "t-foot" }, `${String(s.i + 1).padStart(2, "0")} · ${cap(s.i)}`), s.frame)));
        let io = null;
        const watch = () => {
            if (!alive)
                return;
            if (!el.isConnected)
                return requestAnimationFrame(watch);
            const root = Shots.scroller(el);
            if (!("IntersectionObserver" in window))
                return slots.forEach(s => want(s.i).catch(() => { }));
            io = new IntersectionObserver(entries => {
                for (const e of entries) {
                    if (!e.isIntersecting)
                        continue;
                    io.unobserve(e.target);
                    want(e.target._i).catch(() => { });
                }
            }, { root, rootMargin: `${this.AHEAD} 0px` });
            slots.forEach(s => { s.frame._i = s.i; io.observe(s.frame); });
        };
        requestAnimationFrame(watch);
        return {
            el,
            viewer: () => viewer,
            dispose: () => {
                alive = false;
                viewer?.close();
                io?.disconnect();
                ctl.abort();
                slots.forEach(s => { if (s.url)
                    URL.revokeObjectURL(s.url); s.url = null; });
            },
        };
    },
    view(item, start = 0) {
        const shots = this.images(item);
        if (!shots.length) {
            Tycho.toast("This card has no screenshots.");
            return null;
        }
        const urls = new Map();
        const load = i => {
            if (!urls.has(i))
                urls.set(i, Wire.image(item.key, shots[i].ref).catch(e => { urls.delete(i); throw e; }));
            return urls.get(i);
        };
        return Tycho.viewer({ count: shots.length, start: Math.min(Math.max(0, start), shots.length - 1),
            caption: i => this.caption(shots[i]), load,
            onClose: () => { for (const p of urls.values())
                p.then(u => URL.revokeObjectURL(u), () => { }); } });
    },
    scroller(node) {
        for (let n = node.parentElement; n; n = n.parentElement) {
            const o = getComputedStyle(n).overflowY;
            if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight)
                return n;
        }
        return null;
    },
};
