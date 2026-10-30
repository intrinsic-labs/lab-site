"use strict";
Tycho.viewport = {
    fns: [],
    on(fn) { this.fns.push(fn); },
    off(fn) { this.fns = this.fns.filter(f => f !== fn); },
    typing() {
        const el = document.activeElement;
        if (!el || !matchMedia("(pointer: coarse)").matches)
            return null;
        if (el.isContentEditable || el.tagName === "TEXTAREA")
            return el;
        if (el.tagName !== "INPUT")
            return null;
        return /^(checkbox|radio|range|file|button|submit|reset|color|image)$/.test(el.type) ? null : el;
    },
    sync() {
        const vv = window.visualViewport;
        const root = document.documentElement;
        root.classList.toggle("t-kb", !!this.typing());
        if (vv && vv.scale > 1.01)
            return;
        const h = vv ? vv.height : innerHeight;
        root.style.setProperty("--vv-h", Math.max(240, Math.round(h)) + "px");
        root.style.setProperty("--vv-top", Math.max(0, Math.round(vv ? vv.offsetTop : 0)) + "px");
        if (scrollX || scrollY)
            scrollTo(0, 0);
        for (const fn of this.fns)
            fn();
    },
    reveal() {
        const el = this.typing();
        if (!el)
            return;
        requestAnimationFrame(() => {
            const box = el.getBoundingClientRect();
            const pane = this.scroller(el);
            const view = pane ? pane.getBoundingClientRect() : { top: 0, bottom: window.visualViewport?.height || innerHeight };
            if (el.tagName === "TEXTAREA" && box.height > view.bottom - view.top) {
                const c = this.caret(el), top = box.top + c.y, bottom = top + c.h, pad = 24;
                if (pane && bottom + pad > view.bottom)
                    pane.scrollTop += bottom + pad - view.bottom;
                else if (pane && top - pad < view.top)
                    pane.scrollTop -= view.top - (top - pad);
            }
            else
                el.scrollIntoView({ block: "nearest" });
            if (scrollX || scrollY)
                scrollTo(0, 0);
        });
    },
    scroller(el) {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement)
            if (/(auto|scroll)/.test(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight)
                return p;
        return null;
    },
    caret(ta) {
        const cs = getComputedStyle(ta), copy = document.createElement("div");
        for (const k of ["boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
            "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "fontFamily", "fontSize",
            "lineHeight", "letterSpacing", "overflowWrap", "wordBreak", "tabSize"])
            copy.style[k] = cs[k];
        Object.assign(copy.style, { position: "absolute", visibility: "hidden", left: "-9999px", top: "0",
            height: "auto", whiteSpace: "pre-wrap", borderStyle: "solid" });
        copy.textContent = ta.value.slice(0, ta.selectionEnd ?? 0);
        const mark = copy.appendChild(document.createElement("span"));
        mark.textContent = "\u200b";
        document.body.append(copy);
        const at = { y: mark.offsetTop - ta.scrollTop, h: mark.offsetHeight || 20 };
        copy.remove();
        return at;
    },
    install() {
        const sync = () => this.sync();
        const settle = () => { this.sync(); this.reveal(); };
        sync();
        if (window.visualViewport) {
            visualViewport.addEventListener("resize", settle);
            visualViewport.addEventListener("scroll", sync);
        }
        addEventListener("resize", sync);
        addEventListener("orientationchange", () => setTimeout(sync, 200));
        document.addEventListener("focusin", settle);
        let pending = false;
        document.addEventListener("input", () => {
            if (pending || !document.documentElement.classList.contains("t-kb"))
                return;
            pending = true;
            requestAnimationFrame(() => { pending = false; this.reveal(); });
        });
        document.addEventListener("focusout", () => setTimeout(sync, 0));
    },
};
addEventListener("DOMContentLoaded", () => Tycho.viewport.install());
