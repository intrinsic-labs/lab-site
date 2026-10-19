/* REVIEW · visual — a brief's picture, in a frame that can neither run code nor reach out.

   The brief writer may hand back a self-contained HTML document (a chart, a
   timeline, a before/after). It renders in an iframe with `sandbox=
   "allow-same-origin"` and NOT allow-scripts: nothing in it executes, so it
   cannot fetch, beacon, navigate itself or read this page. Interaction is
   CSS only (checkbox/radio toggles with :checked, <details>). A CSP meta is
   the FIRST thing in the document (no network; the house font rides in as a
   data: URL), and scripts, event handlers, every link target, http-equiv
   metas, <link> and <base> are stripped before it is shown. Even "#frag"
   links go: a srcdoc document's base URL is THIS page's, so "#here"
   navigates the frame to this page (no :target, then).
   Same-origin without scripts lets this page measure the frame's height. */
"use strict";

const Visual = {
  MAX: 600,
  font: "",

  /* The house font as a data: URL, read once from the Mac — so the frame's
     font-src stays `data:` and nothing about it needs the network. */
  fontReady: null,
  loadFont() {
    return this.fontReady ??= fetch("fonts/DepartureMono-Regular.woff2")
      .then(r => r.ok ? r.blob() : null)
      .then(b => b && new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); }))
      .then(url => { this.font = url || ""; })
      .catch(() => {});
  },

  /* FIRST in the document, before a byte of model HTML: the policy, then the
     font. No network of any kind, no script at all; inline style only. */
  head() {
    return `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; ` +
      `style-src 'unsafe-inline'; script-src 'none'; img-src data:; font-src data:; ` +
      `connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; ` +
      `form-action 'none'; base-uri 'none'">` +
      `<meta name="referrer" content="no-referrer">` +
      (this.font ? `<style>@font-face{font-family:"Departure Mono";src:url("${this.font}") format("woff2")}` +
        `html{font-family:"Departure Mono",ui-monospace,monospace}</style>` : "");
  },

  /* what the model wrote, minus what could act before or around the policy:
     its own doctype, any http-equiv meta (a refresh is a navigation), link
     tags (prefetch and dns-prefetch reach the network outside CSP) and base */
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

  /* height from outside: the frame is same-origin and script-free. Measured
     off the BODY, because the root's scrollHeight never drops below the
     frame's own height, so a visual that shrinks (a <details> closing, a
     toggle hiding a panel) would keep its old height forever. */
  fit(f) {
    const d = f.contentDocument, b = d?.body;
    if (!b) return;
    const cs = d.defaultView.getComputedStyle(b);
    const h = Math.ceil(b.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom));
    if (h > 0) f.style.height = Math.min(this.MAX, h) + "px";
  },

  frame(v) {
    const f = T.el("iframe", { class: "t-visual-frame", sandbox: "allow-same-origin",
      referrerpolicy: "no-referrer", loading: "lazy", title: v.title || "visual" });
    /* its title names the frame for a screen reader; on screen the picture
       speaks for itself */
    const fig = T.el("figure", { class: "t-visual" }, f);
    /* a visual that navigates itself away from its srcdoc is removed at once */
    let loads = 0;
    f.addEventListener("load", () => {
      if (++loads > 1) { fig.replaceChildren(T.el("p", { class: "t-foot amber" }, "THIS VISUAL TRIED TO LEAVE THE PAGE AND WAS REMOVED")); return; }
      this.fit(f);
      const body = f.contentDocument?.body;
      if (body && window.ResizeObserver) new ResizeObserver(() => this.fit(f)).observe(body);
    });
    f.srcdoc = this.doc(v.html);     /* before it is in the page: no about:blank load first */
    return fig;
  },
};

Visual.loadFont();
