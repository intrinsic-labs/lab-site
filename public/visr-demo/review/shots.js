/* REVIEW · screenshots — every image on an item, one scrolling page.

   Visual review is most of what Asher does on the desk: he can tell from
   the screenshots whether the live preview is worth opening at all. So the
   images are not folds to open one by one but a page of their own (pushed
   from the desk, stack.js): every image full width, in the order the owner
   gave them, each captioned with its name. A tap opens that image full
   screen (kernel/viewer.js), where a swipe, ‹ › or the arrow keys move
   through the rest of the set without closing it; closing lands back on
   this page where it was.

   Images load as they come near the screen, two at a time, so the first
   ones arrive first on a slow link and the Mac never runs a spawn per image
   at once. The viewer jumps that queue: the image on screen first, then its
   neighbours, then page order. A failed image is asked for again the next
   time it is wanted. Closing the page cancels what is still coming, frees
   what arrived and puts the viewer away.

     Shots.images(item) → the item's image blocks
     Shots.page(item) → { el, dispose } */
"use strict";

const Shots = {
  images: item => (item.content || []).filter(b => b.type === "image"),

  /* "gui-05-platforms-9-0-0.png" → "gui 05 platforms 9 0 0" */
  caption: b => String(b.title || "image").replace(/\.(png|jpe?g|gif|webp)$/i, "").replace(/[-_]+/g, " "),

  /* at most this many images in flight: each one is a spawn on the Mac */
  CONCURRENT: 2,
  /* start loading an image this far before it scrolls into view */
  AHEAD: "1200px",
  /* who goes first: the image in the viewer, its neighbours, the page */
  NOW: 0, SOON: 1, PAGE: 2,

  page(item) {
    const ctl = new AbortController();
    let alive = true, running = 0, viewer = null;
    const shots = this.images(item);
    const cap = i => this.caption(shots[i]);

    /* one slot per image: its frame on the page, and once asked for, the
       promise of its object URL and its place in the queue */
    const slots = shots.map((b, i) => ({ i, b, frame: null, url: null, ask: null, rank: this.PAGE, queued: false }));
    const queue = [];

    const start = s => {
      running++;
      Wire.image(item.key, s.b.ref, { signal: ctl.signal }).then(url => {
        /* landed after the page closed: give the memory back at once */
        if (!alive) return URL.revokeObjectURL(url);
        s.url = url;
        s.frame.replaceChildren(T.el("img", { src: url, alt: cap(s.i), decoding: "async" }));
        s.ask.done(url);
      }).catch(e => {
        s.ask.fail(e);
        s.ask = null;                 // asked for again the next time it is wanted
        if (alive && !s.url) s.frame.replaceChildren(T.el("span", { class: "amber" }, `Couldn't load the image: ${e.message}`));
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

    /* the object URL of image i, asked for at `rank` (or sooner, if it is
       already waiting further back) */
    const want = (i, rank = this.PAGE) => {
      const s = slots[i];
      if (s.url) return Promise.resolve(s.url);
      if (!alive) return Promise.reject(new Error("The page closed."));
      if (s.ask) {
        if (s.queued) s.rank = Math.min(s.rank, rank);
      } else {
        let done, fail;
        const p = new Promise((y, n) => { done = y; fail = n; });
        p.catch(() => {});
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
        "aria-label": `Open ${cap(s.i)} full screen`, onclick: () => open(s.i) },
        T.el("span", { class: "t-foot" }, "DEVELOPING…"));
    });
    const el = T.el("div", { class: "t-shots" },
      ...slots.map(s => T.el("figure", { class: "t-shot-fig" },
        T.el("figcaption", { class: "t-foot" }, `${String(s.i + 1).padStart(2, "0")} · ${cap(s.i)}`), s.frame)));

    /* an image is asked for once it comes near the screen. The page scrolls
       inside its own container, so that is the observer's root, found once
       the page is in the document. */
    let io = null;
    const watch = () => {
      if (!alive) return;
      if (!el.isConnected) return requestAnimationFrame(watch);
      const root = Shots.scroller(el);
      if (!("IntersectionObserver" in window)) return slots.forEach(s => want(s.i).catch(() => {}));
      io = new IntersectionObserver(entries => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          want(e.target._i).catch(() => {});
        }
      }, { root, rootMargin: `${this.AHEAD} 0px` });
      slots.forEach(s => { s.frame._i = s.i; io.observe(s.frame); });
    };
    requestAnimationFrame(watch);

    return {
      el,
      /* the viewer, while it is open over this page */
      viewer: () => viewer,
      dispose: () => {
        alive = false;
        viewer?.close();
        io?.disconnect();
        ctl.abort();
        slots.forEach(s => { if (s.url) URL.revokeObjectURL(s.url); s.url = null; });
      },
    };
  },

  /* the nearest ancestor that scrolls, or null for the viewport */
  scroller(node) {
    for (let n = node.parentElement; n; n = n.parentElement) {
      const o = getComputedStyle(n).overflowY;
      if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight) return n;
    }
    return null;
  },
};
