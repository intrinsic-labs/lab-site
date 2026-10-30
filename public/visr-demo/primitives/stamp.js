"use strict";
const STAMP_THRESHOLD = 8;
const STAMP_SPRING_MS = 180;
const INK_EDGE = 10;
Tycho.stamp = function stamp(o = {}) {
    const faces = o.faces || [];
    let born = Date.now();
    let value = null, locked = false, impression = null;
    let restamps = 0, lastPointer = null;
    let hover = [], dwell = {}, enteredAt = null, entered = null;
    let carry = null, lastDrop = null, lastCarryMs = null;
    const el = T.el("div", { class: "t-stamps" });
    const stamps = faces.map((f, n) => {
        const s = T.el("div", {
            class: "t-stamp" + (f.tone ? " " + f.tone : ""),
            "data-face": f.id, title: `${f.label} — pick it up and drop it on the card`,
        }, T.el("span", { class: "knob" }), T.el("span", { class: "neck" }), T.el("span", { class: "base" }, f.label), T.el("span", { class: "die" }));
        const slot = T.el("div", { class: "t-stamp-slot" }, s);
        s.addEventListener("pointerenter", () => {
            if (locked)
                return;
            entered = f.id;
            enteredAt = Date.now();
            if (hover[hover.length - 1] !== f.id)
                hover.push(f.id);
        });
        s.addEventListener("pointerleave", () => {
            if (entered !== f.id || enteredAt == null)
                return;
            dwell[f.id] = (dwell[f.id] || 0) + (Date.now() - enteredAt);
            entered = null;
            enteredAt = null;
        });
        s.addEventListener("pointerdown", e => grab(e, f, n, s));
        el.append(slot);
        return s;
    });
    function grab(e, f, n, s) {
        if (locked || e.button !== 0 || carry)
            return;
        lastPointer = e.pointerType || null;
        const r = s.getBoundingClientRect();
        carry = {
            id: e.pointerId, f, n, s, on: false, over: false,
            x0: e.clientX, y0: e.clientY, t0: Date.now(),
            dx: e.clientX - r.left, dy: e.clientY - r.top,
            w: r.width, h: r.height, home: null,
        };
        addEventListener("pointermove", onMove, true);
        addEventListener("pointerup", onUp, true);
        addEventListener("pointercancel", onCancel, true);
    }
    function lift() {
        const c = carry;
        clearTimeout(c.s._springT);
        c.s.classList.remove("springing");
        const r = (c.s.parentElement || c.s).getBoundingClientRect();
        c.home = { left: r.left, top: r.top };
        c.on = true;
        c.s.style.width = c.w + "px";
        c.s.style.height = c.h + "px";
        c.s.style.left = Math.round(r.left) + "px";
        c.s.style.top = Math.round(r.top) + "px";
        c.s.classList.add("carried");
    }
    function overTarget(x, y) {
        const t = o.target;
        if (!t)
            return false;
        const r = t.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }
    function onMove(e) {
        if (!carry || e.pointerId !== carry.id)
            return;
        if (!carry.on) {
            if (Math.hypot(e.clientX - carry.x0, e.clientY - carry.y0) < STAMP_THRESHOLD)
                return;
            lift();
        }
        e.preventDefault();
        carry.s.style.left = Math.round(e.clientX - carry.dx) + "px";
        carry.s.style.top = Math.round(e.clientY - carry.dy) + "px";
        const over = overTarget(e.clientX, e.clientY);
        if (over !== carry.over) {
            carry.over = over;
            o.target?.classList.toggle("t-ink-hot", over);
        }
    }
    function onUp(e) {
        if (!carry || e.pointerId !== carry.id)
            return;
        const c = carry;
        detach();
        o.target?.classList.remove("t-ink-hot");
        if (!c.on) {
            carry = null;
            o.onMiss?.();
            return;
        }
        if (!c.over) {
            spring(c);
            o.onMiss?.();
            return;
        }
        if (o.guard && !o.guard()) {
            spring(c);
            o.onRefuse?.();
            return;
        }
        const r = o.target.getBoundingClientRect();
        lastDrop = { x: e.clientX - r.left, y: e.clientY - r.top,
            w: r.width, h: r.height };
        lastCarryMs = Date.now() - c.t0;
        spring(c);
        press(c.f, c.n, lastDrop);
    }
    function onCancel(e) {
        if (!carry || e.pointerId !== carry.id)
            return;
        drop();
    }
    function spring(c) {
        carry = null;
        if (!c.on)
            return;
        c.s.classList.add("springing");
        c.s.style.left = Math.round(c.home.left) + "px";
        c.s.style.top = Math.round(c.home.top) + "px";
        c.s._springT = setTimeout(() => {
            c.s.classList.remove("carried", "springing");
            c.s.style.left = c.s.style.top = c.s.style.width = c.s.style.height = "";
        }, STAMP_SPRING_MS);
    }
    function detach() {
        removeEventListener("pointermove", onMove, true);
        removeEventListener("pointerup", onUp, true);
        removeEventListener("pointercancel", onCancel, true);
    }
    function drop() {
        if (!carry)
            return;
        const c = carry;
        detach();
        o.target?.classList.remove("t-ink-hot");
        if (c.on)
            spring(c);
        else
            carry = null;
    }
    function lay(f, quiet, at) {
        const target = o.target;
        if (!target)
            return;
        if (getComputedStyle(target).position === "static")
            target.style.position = "relative";
        erase();
        impression = T.el("div", { class: "t-stamp-ink" + (f.tone ? " " + f.tone : "") + (quiet ? " quiet" : "") }, T.el("span", {}, f.label));
        target.append(impression);
        if (at) {
            const tr = target.getBoundingClientRect();
            const cs = getComputedStyle(target);
            const bx = parseFloat(cs.borderLeftWidth) || 0;
            const by = parseFloat(cs.borderTopWidth) || 0;
            const ar = (o.area?.() || target).getBoundingClientRect();
            const x0 = ar.left - tr.left - bx, x1 = x0 + ar.width;
            const y0 = ar.top - tr.top - by, y1 = y0 + ar.height;
            const iw = impression.offsetWidth, ih = impression.offsetHeight;
            const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
            impression.style.left = Math.round(clamp(at.x - bx, x0 + iw / 2 + INK_EDGE, Math.max(x0 + iw / 2, x1 - iw / 2 - INK_EDGE))) + "px";
            impression.style.top = Math.round(clamp(at.y - by, y0 + ih / 2 + INK_EDGE, Math.max(y0 + ih / 2, y1 - ih / 2 - INK_EDGE))) + "px";
        }
        if (!quiet) {
            Sound?.commit?.();
            requestAnimationFrame(() => impression?.classList.add("down"));
        }
        else {
            impression.classList.add("down");
        }
    }
    function erase() { impression?.remove(); impression = null; }
    function trace() {
        if (entered && enteredAt != null) {
            dwell[entered] = (dwell[entered] || 0) + (Date.now() - enteredAt);
            enteredAt = Date.now();
        }
        return {
            hover_order: hover.slice(),
            dwell_ms: { ...dwell },
            commit_ms: Date.now() - born,
            restamps: restamps,
            pointer: lastPointer,
            drop: lastDrop ? { x: +(lastDrop.x / Math.max(1, lastDrop.w)).toFixed(4),
                y: +(lastDrop.y / Math.max(1, lastDrop.h)).toFixed(4) } : null,
            card_w: lastDrop ? Math.round(lastDrop.w) : null,
            card_h: lastDrop ? Math.round(lastDrop.h) : null,
            carry_ms: lastCarryMs,
        };
    }
    function press(f, n, at) {
        if (locked)
            return;
        if (value === f.id)
            return;
        if (value !== null)
            restamps++;
        value = f.id;
        stamps.forEach((h, k) => h.classList.toggle("on", k === n));
        lay(f, false, at);
        o.onStamp?.(f.id, trace());
    }
    function onKey(e) {
        if (locked)
            return false;
        const n = "123456789".indexOf(e.key);
        if (n < 0 || n >= faces.length)
            return false;
        if (o.guard && !o.guard()) {
            o.onRefuse?.();
            return true;
        }
        lastPointer = lastPointer || "key";
        lastDrop = null;
        lastCarryMs = null;
        press(faces[n], n, null);
        return true;
    }
    return {
        el, key: onKey,
        get value() { return value; },
        get locked() { return locked; },
        ink(id) {
            const want = String(id ?? "").toLowerCase();
            const n = faces.findIndex(f => String(f.id).toLowerCase() === want);
            if (n < 0)
                return false;
            value = faces[n].id;
            stamps.forEach((h, k) => h.classList.toggle("on", k === n));
            lay(faces[n], true, null);
            return true;
        },
        lock() { drop(); locked = true; el.classList.add("locked"); },
        reset() {
            drop();
            value = null;
            locked = false;
            restamps = 0;
            born = Date.now();
            hover = [];
            dwell = {};
            entered = null;
            enteredAt = null;
            lastDrop = null;
            lastCarryMs = null;
            stamps.forEach(h => h.classList.remove("on"));
            el.classList.remove("locked");
            o.target?.classList.remove("t-ink-hot");
            erase();
        },
    };
};
