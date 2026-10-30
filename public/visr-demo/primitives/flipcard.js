"use strict";
Tycho.flipCard = function flipCard(o) {
    const FLIP_MS = 520, RIFFLE_MS = 50, TICK_MS = 40;
    let items = o.items || [], i = Math.max(0, Math.min(items.length - 1, o.index || 0));
    const render = o.render || (it => ({ title: String(it), sub: "" }));
    let shown = i, goal = i, flight = null, frame = 0, lastTick = 0;
    let hurry = false;
    const face = (cls) => T.el("div", { class: "t-flip-face " + cls }, T.el("div", { class: "t-flip-title" }), T.el("div", { class: "t-flip-sub" }));
    const ticks = side => T.el("div", { class: "t-flip-ticks " + side }, ...Array.from({ length: 7 }, () => T.el("i")));
    const topS = face("top"), botS = face("bottom");
    const flapF = face("top"), flapB = face("bottom");
    const flap = T.el("div", { class: "t-flip-flap" }, T.el("div", { class: "t-flip-side front" }, flapF), T.el("div", { class: "t-flip-side back" }, flapB));
    const card = T.el("div", { class: "t-flip-card" }, T.el("i", { class: "t-flip-nub" }), topS, botS, flap, T.el("i", { class: "t-flip-pin l" }), T.el("i", { class: "t-flip-pin r" }), T.el("i", { class: "t-flip-foot" }));
    const el = T.el("div", { class: "t-flip" + (items.length ? "" : " empty") }, ticks("l"), card, ticks("r"));
    const n = () => items.length;
    const at = k => items[((k % n()) + n()) % n()];
    const wrap = k => n() ? ((k % n()) + n()) % n() : 0;
    function paint(f, it) {
        if (f._it === it && it !== undefined)
            return;
        f._it = it;
        const r = it == null ? { title: "", sub: "" } : render(it);
        f.querySelector(".t-flip-title").textContent = r.title || "";
        f.querySelector(".t-flip-sub").textContent = r.sub || "";
    }
    function show(k) {
        paint(topS, items[k]);
        paint(botS, items[k]);
        el.classList.toggle("empty", !items.length);
        el.dataset.index = String(k);
    }
    const span = v => hurry ? RIFFLE_MS : v > 0 ? Math.max(RIFFLE_MS, Math.min(FLIP_MS, 0.9 / v)) : FLIP_MS;
    const speed = () => scrub.moving ? scrub.speed : 0;
    function launch(now) {
        const dir = goal > shown ? 1 : -1, from = at(shown), to = at(goal);
        flight = { dir, to: goal, t0: now, dur: span(speed()) };
        if (dir > 0) {
            flapF.className = "t-flip-face top";
            flapB.className = "t-flip-face bottom";
            paint(flapF, from);
            paint(flapB, to);
            paint(topS, to);
            flap.className = "t-flip-flap down";
        }
        else {
            flapF.className = "t-flip-face bottom";
            flapB.className = "t-flip-face top";
            paint(flapF, from);
            paint(flapB, to);
            paint(botS, to);
            flap.className = "t-flip-flap up";
        }
        flap.style.transform = "rotateX(0deg)";
        window.__flipTrace?.push({ t: now, dur: flight.dur, from: wrap(shown), to: wrap(goal) });
        if (now - lastTick >= TICK_MS) {
            lastTick = now;
            Sound?.flip?.();
            if (scrub.moving)
                navigator.vibrate?.(5);
        }
    }
    function land() {
        shown = flight.to;
        flight = null;
        flap.className = "t-flip-flap";
        flap.style.transform = "";
        i = wrap(shown);
        show(i);
    }
    function tick(now) {
        frame = 0;
        if (flight) {
            if (flight.to !== goal)
                flight.dur = Math.min(flight.dur, span(speed()));
            const p = Math.min(1, (now - flight.t0) / flight.dur);
            const e = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
            flap.style.transform = `rotateX(${flight.dir * -180 * e}deg)`;
            if (p >= 1)
                land();
        }
        if (!flight && goal !== shown)
            launch(now);
        if (!flight)
            hurry = false;
        if (flight) {
            frame = requestAnimationFrame(tick);
            return;
        }
        if (!scrub.moving && settled !== shown) {
            settled = shown;
            o.onChange?.(i, items[i]);
        }
    }
    let settled = shown;
    function aim(k) {
        if (n() < 2)
            return false;
        if (!o.loop)
            k = Math.max(0, Math.min(n() - 1, k));
        goal = k;
        if (!frame)
            frame = requestAnimationFrame(tick);
        return true;
    }
    function flip(dir) {
        if (!o.loop && (goal + dir < 0 || goal + dir >= n()))
            return false;
        scrub.stop();
        scrub.at(goal + dir);
        return aim(goal + dir);
    }
    const strips = [...el.querySelectorAll(".t-flip-ticks")];
    const scrub = Tycho.ringScrub({
        strips,
        enabled: () => n() > 1,
        scale: () => (card.getBoundingClientRect().height / card.offsetHeight) || 1,
        onStart: () => { hurry = !!flight; el.classList.add("scrubbing"); },
        onMove: p => aim(Math.round(p)),
        onSettle: p => { el.classList.remove("scrubbing"); aim(Math.round(p)); if (!frame)
            tick(performance.now()); },
    });
    const TAP = 8;
    let down = null;
    card.addEventListener("pointerdown", e => {
        down = e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY } : null;
    });
    card.addEventListener("pointerup", e => {
        const d = down;
        down = null;
        if (!d || e.pointerId !== d.id)
            return;
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) >= TAP)
            return;
        const r = card.getBoundingClientRect();
        flip(e.clientY - r.top > r.height / 2 ? -1 : 1);
    });
    show(i);
    return {
        el,
        next: () => flip(1), prev: () => flip(-1),
        set(list, k = 0) {
            cancelAnimationFrame(frame);
            frame = 0;
            scrub.stop();
            if (flight) {
                flight = null;
                flap.className = "t-flip-flap";
                flap.style.transform = "";
            }
            el.classList.remove("scrubbing");
            items = list || [];
            for (const f of [topS, botS, flapF, flapB])
                f._it = undefined;
            i = Math.max(0, Math.min(items.length - 1, k));
            shown = goal = settled = i;
            scrub.at(i);
            show(i);
        },
        get index() { return i; },
        get position() { return shown; },
        get item() { return items[i]; },
        get length() { return items.length; },
    };
};
