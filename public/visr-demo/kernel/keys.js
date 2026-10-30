"use strict";
Tycho.keys = {
    learned: false,
    tallest: new Map(),
    HARD: /^(Escape|Meta|Control|Alt|OS|F\d{1,2})$/,
    FINE: "(any-hover: hover) and (any-pointer: fine)",
    TABLET: 600,
    composing(e) { return !!(e.isComposing || e.keyCode === 229); },
    field(el) {
        if (!el || el.nodeType !== 1)
            return null;
        if (el.isContentEditable || el.tagName === "TEXTAREA" || el.tagName === "SELECT")
            return el;
        if (el.tagName !== "INPUT")
            return null;
        return /^(checkbox|radio|range|file|button|submit|reset|color|image)$/.test(el.type) ? null : el;
    },
    height() { return window.visualViewport ? visualViewport.height : innerHeight; },
    roomy() {
        if (Math.min(screen.width, screen.height) < this.TABLET)
            return false;
        if (!this.field(document.activeElement))
            return false;
        const tall = this.tallest.get(innerWidth) || this.height();
        return this.height() >= tall * 0.8;
    },
    physical() { return matchMedia(this.FINE).matches || this.learned || this.roomy(); },
    mark() { document.documentElement.classList.toggle("t-keys", matchMedia(this.FINE).matches || this.learned); },
    measure() {
        const h = this.height(), w = innerWidth;
        if (h > (this.tallest.get(w) || 0))
            this.tallest.set(w, h);
        if (this.learned && this.field(document.activeElement) && h < (this.tallest.get(w) || h) * 0.75) {
            this.learned = false;
            this.mark();
        }
    },
    install() {
        addEventListener("keydown", e => {
            if (this.learned || !(this.HARD.test(e.key) || e.metaKey || e.ctrlKey || e.altKey))
                return;
            this.learned = true;
            this.mark();
        }, true);
        const measure = () => this.measure();
        window.visualViewport?.addEventListener("resize", measure);
        addEventListener("resize", measure);
        matchMedia(this.FINE).addEventListener?.("change", () => this.mark());
        measure();
        this.mark();
    },
};
Tycho.keys.install();
