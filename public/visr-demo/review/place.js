/* REVIEW · place — where he was inside an open desk: how far down its
   first page.

   Kept in the session (session.js, localStorage), so it survives the app
   being closed and reopened as well as a tab Android discarded. On a restore
   the scroll is put back, and put back again as
   the documents and images arrive and the page grows, until his own hand
   touches the page. Only a scroll HE made is saved: the restore's own
   scrolls (clamped while the page is still short) would otherwise overwrite
   the place it is trying to reach. */
"use strict";

const Place = {
  SETTLE_MS: 4000,

  track(view, { restore = false } = {}) {
    const s = Session.get();
    const page = view.page;
    if (!restore) Session.patch({ scroll: 0 });

    const wanted = restore ? s.scroll || 0 : 0;
    let mine = !wanted;               /* nothing to restore: every scroll is his */
    const his = () => { mine = true; };
    for (const ev of ["pointerdown", "touchstart", "wheel", "keydown"])
      page.addEventListener(ev, his, { passive: true, once: true });
    const apply = () => { if (!mine) page.scrollTop = wanted; };
    requestAnimationFrame(apply);
    view.loaded?.then(() => requestAnimationFrame(apply));
    const inner = page.firstElementChild;
    if (wanted && inner && "ResizeObserver" in window) {
      const ro = new ResizeObserver(apply);
      ro.observe(inner);
      setTimeout(() => ro.disconnect(), this.SETTLE_MS);
    }

    let t = 0;
    page.addEventListener("scroll", () => {
      if (!mine) return;
      clearTimeout(t);
      t = setTimeout(() => Session.patch({ scroll: Math.round(page.scrollTop) }), 150);
    }, { passive: true });
  },
};
