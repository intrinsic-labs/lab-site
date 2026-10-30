"use strict";
const Face = {
    LIDS: {
        neutral: { top: null, bottom: null, r: 12.4 },
        happy: { top: null, bottom: [51, 0], r: 13.4 },
        angry: { top: [44, 24], bottom: null, r: 12.4 },
        sad: { top: [44, -22], bottom: null, r: 12.4 },
        squint: { top: [45, 0], bottom: [55, 0], r: 12.4 },
        surprised: { top: null, bottom: null, r: 15.2 },
        blink: { top: [48, 0], bottom: [52, 0], r: 12.4 },
    },
    get EXPRESSIONS() { return Object.keys(this.LIDS); },
    seq: 0,
    eye(id, cx, inner, l) {
        const lid = (edge, top) => {
            if (!edge)
                return "";
            const [y, deg] = edge;
            const h = 40;
            const ry = top ? y - h : y;
            return `<rect x="${cx - 25}" y="${ry}" width="50" height="${h}" fill="#000"`
                + ` transform="rotate(${deg * inner * (top ? 1 : -1)} ${cx} ${y})"/>`;
        };
        return `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">`
            + `<rect x="0" y="0" width="100" height="100" fill="#fff"/>${lid(l.top, true)}${lid(l.bottom, false)}</mask>`
            + `<circle class="t-face-eye" cx="${cx}" cy="50" r="${l.r}" mask="url(#${id})"/>`;
    },
    html(expr = "neutral") {
        const l = this.LIDS[expr] || this.LIDS.neutral;
        const n = ++this.seq;
        return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">'
            + '<circle class="t-face-ring" cx="50" cy="50" r="45"/>'
            + this.eye(`tfl${n}`, 32, 1, l) + this.eye(`tfr${n}`, 68, -1, l)
            + "</svg>";
    },
    node(cls = "", expr = "neutral") {
        const i = T.el("i", { class: `t-face ${cls}`.trim() });
        i.innerHTML = this.html(expr);
        i.dataset.expr = expr;
        return i;
    },
    express(node, expr) {
        if (node.dataset.expr === expr)
            return;
        node.innerHTML = this.html(expr);
        node.dataset.expr = expr;
    },
    MOODS: [["neutral", ""], ["happy", "ok"], ["squint", "orange"], ["angry", "bad"],
        ["blink", ""], ["surprised", "ok"], ["sad", "orange"], ["neutral", ""]],
    BEAT_MS: 650,
    busy(node) {
        if (matchMedia("(prefers-reduced-motion: reduce)").matches)
            return;
        let n = 0;
        const tint = ["ok", "bad", "orange", "amber"];
        const step = () => {
            if (!node.isConnected && n > 0)
                return;
            const [expr, colour] = this.MOODS[n++ % this.MOODS.length];
            this.express(node, expr);
            node.classList.remove(...tint);
            if (colour)
                node.classList.add(colour);
            setTimeout(step, this.BEAT_MS);
        };
        step();
    },
};
