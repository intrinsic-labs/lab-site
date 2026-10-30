"use strict";
Tycho.ringScrub = function ringScrub(o) {
    const STEP = 34, SLOW = 0.35, GAIN = 0.6, MAX_GAIN = 3;
    const TAU = 250, FLICK = 0.25, MAX_COAST = 0.06, IDLE_MS = 70;
    let pos = 0, last = null, vel = 0, frame = 0, coast = null, down = false;
    const step = () => STEP * (o.scale?.() || 1);
    const gain = v => Math.min(MAX_GAIN, 1 + GAIN * Math.max(0, Math.abs(v) / (o.scale?.() || 1) - SLOW));
    function stop() {
        cancelAnimationFrame(frame);
        frame = 0;
        coast = null;
    }
    function settle() {
        stop();
        vel = 0;
        pos = Math.round(pos);
        o.onMove(pos);
        o.onSettle(pos);
    }
    function glide(now) {
        const t = now - coast.t0;
        const k = Math.exp(-t / TAU);
        pos = coast.to + (coast.from - coast.to) * k;
        vel = (coast.to - coast.from) * k / TAU;
        o.onMove(pos);
        if (Math.abs(coast.to - pos) < 0.02)
            return settle();
        frame = requestAnimationFrame(glide);
    }
    function press(e, strip) {
        if (e.button !== 0 || !o.enabled())
            return;
        e.preventDefault();
        strip.setPointerCapture?.(e.pointerId);
        stop();
        vel = 0;
        down = true;
        last = { y: e.clientY, t: e.timeStamp, px: 0 };
        o.onStart?.();
    }
    function drag(e) {
        if (!down)
            return;
        const dy = e.clientY - last.y, dt = Math.max(1, e.timeStamp - last.t);
        if (!dy)
            return;
        last.px = last.px * 0.4 + (dy / dt) * 0.6;
        const d = dy / step() * gain(last.px);
        pos += d;
        vel = vel * 0.4 + (d / dt) * 0.6;
        last.y = e.clientY;
        last.t = e.timeStamp;
        o.onMove(pos);
    }
    function release(e) {
        if (!down)
            return;
        down = false;
        const idle = e.timeStamp - last.t > IDLE_MS;
        if (idle || Math.abs(last.px) < FLICK)
            return settle();
        const v = Math.max(-MAX_COAST, Math.min(MAX_COAST, last.px / step()));
        const to = Math.round(pos + v * TAU);
        if (to === Math.round(pos) && Math.abs(to - pos) < 0.5)
            return settle();
        coast = { from: pos, to, t0: performance.now() };
        frame = requestAnimationFrame(glide);
    }
    for (const s of o.strips) {
        s.addEventListener("pointerdown", e => press(e, s));
        s.addEventListener("pointermove", drag);
        s.addEventListener("pointerup", release);
        s.addEventListener("pointercancel", release);
    }
    return {
        stop() { stop(); down = false; vel = 0; },
        at(p) { pos = p; },
        get moving() { return down || !!coast; },
        get speed() { return Math.abs(vel); },
    };
};
