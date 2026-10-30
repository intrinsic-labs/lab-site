"use strict";
const Visual = {
    MAX: 600,
    font: "",
    fontReady: null,
    loadFont() {
        return this.fontReady ??= fetch("fonts/DepartureMono-Regular.woff2")
            .then(r => r.ok ? r.blob() : null)
            .then(b => b && new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); }))
            .then(url => { this.font = url || ""; })
            .catch(() => { });
    },
    head() {
        return `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; ` +
            `style-src 'unsafe-inline'; script-src 'none'; img-src data:; font-src data:; ` +
            `connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; ` +
            `form-action 'none'; base-uri 'none'">` +
            `<meta name="referrer" content="no-referrer">` +
            (this.font ? `<style>@font-face{font-family:"Departure Mono";src:url("${this.font}") format("woff2")}` +
                `html{font-family:"Departure Mono",ui-monospace,monospace}</style>` : "");
    },
    clean(html) {
        return String(html || "")
            .replace(/<!doctype[^>]*>/gi, "")
            .replace(/<meta\b[^>]*http-equiv[^>]*>/gi, "")
            .replace(/<link\b[^>]*>/gi, "")
            .replace(/<base\b[^>]*>/gi, "")
            .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
            .replace(/<script\b[^>]*>/gi, "")
            .replace(/[\s/]on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
            .replace(/[\s/](href|xlink:href|action|formaction|ping)\s*=\s*("[^"]*"|'[^']*'|[^\s>"']+)/gi, "");
    },
    doc(html) {
        return this.head() + this.clean(html);
    },
    fit(f) {
        const d = f.contentDocument, b = d?.body;
        if (!b)
            return;
        const cs = d.defaultView.getComputedStyle(b);
        const h = Math.ceil(b.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom));
        if (h > 0)
            f.style.height = Math.min(this.MAX, h) + "px";
    },
    frame(v) {
        const f = T.el("iframe", { class: "t-visual-frame", sandbox: "allow-same-origin",
            referrerpolicy: "no-referrer", loading: "lazy", title: v.title || "visual" });
        const fig = T.el("figure", { class: "t-visual" }, f);
        let loads = 0;
        f.addEventListener("load", () => {
            if (++loads > 1) {
                fig.replaceChildren(T.el("p", { class: "t-foot amber" }, "THIS VISUAL TRIED TO LEAVE THE PAGE AND WAS REMOVED"));
                return;
            }
            this.fit(f);
            const body = f.contentDocument?.body;
            if (body && window.ResizeObserver)
                new ResizeObserver(() => this.fit(f)).observe(body);
        });
        f.srcdoc = this.doc(v.html);
        return fig;
    },
};
Visual.loadFont();
