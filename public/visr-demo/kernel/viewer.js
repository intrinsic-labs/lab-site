/* INTRINSICOS KERNEL · viewer — a set of images full screen, one at a time.

   Asher, 2026-10-19: opening and closing each screenshot to get to the next
   was "really annoying, slowing me down". So the viewer holds the whole set
   and moves through it in place: a swipe on a phone, ‹ › on a tablet, the
   arrow keys on a keyboard. The counter and caption say which image this is
   and where it sits; at either end the way on is disabled, and one image has
   no way on at all.

   The page that opened it owns the bytes: `load(i)` returns a promise of a
   URL, so an image still on its way shows DEVELOPING and one that failed says
   so, and neither stops the viewer moving or closing. The viewer asks for
   the neighbours as it lands, so the next swipe is usually already there.

   Zoom is the browser's own pinch. While the screen is pinched in, a drag
   pans the picture instead of turning the page. A tap on the picture or
   around it, CLOSE, or ESC puts it away; the arrow keys and ESC stop here, so
   nothing under the viewer moves.

     const v = Tycho.viewer({ count, start, caption: i => …, load: i => Promise<url> })
     v.el · v.index() · v.go(i) · v.close() */
"use strict";

Object.assign(Tycho, {
  viewer({ count, start = 0, caption = () => "", load, onClose = null }) {
    let index = Math.max(0, Math.min(start, count - 1));
    let open = true;
    const many = count > 1;
    const two = n => String(n).padStart(2, "0");

    const stage = T.el("div", { class: "t-viewer-stage" });
    const pos = T.el("div", { class: "t-viewer-pos", "aria-live": "polite" });
    const cap = T.el("div", { class: "t-viewer-cap" });
    const prev = many ? T.el("button", { class: "t-btn t-viewer-prev", type: "button", "aria-label": "Previous image",
      onclick: () => go(index - 1) }, "‹") : null;
    const next = many ? T.el("button", { class: "t-btn t-viewer-next", type: "button", "aria-label": "Next image",
      onclick: () => go(index + 1) }, "›") : null;
    const shut = T.el("button", { class: "t-btn tiny t-viewer-close", type: "button", onclick: () => close() }, "CLOSE ✕");
    const bar = T.el("div", { class: "t-viewer-bar" },
      prev || T.el("span"), T.el("div", { class: "t-viewer-id" }, pos, cap), next || T.el("span"));
    const ov = T.el("div", { class: "t-viewer", role: "dialog", "aria-modal": "true", tabindex: "-1",
      "data-count": count }, T.el("div", { class: "t-viewer-top" }, shut), stage, bar);

    /* the picture for `index`, or the state it is in */
    const show = enter => {
      const at = index;
      ov.dataset.index = at;
      pos.textContent = `${two(at + 1)} / ${two(count)}`;
      cap.textContent = String(caption(at) || "").toUpperCase();
      ov.setAttribute("aria-label", `Image ${at + 1} of ${count}: ${caption(at) || "image"}`);
      if (prev) prev.disabled = at === 0;
      if (next) next.disabled = at === count - 1;
      const state = (cls, text) => T.el("div", { class: `t-viewer-state ${cls}` }, text);
      stage.replaceChildren(state("dim", "DEVELOPING…"));
      Promise.resolve().then(() => load(at)).then(url => {
        if (!open || at !== index) return;
        const img = T.el("img", { src: url, alt: caption(at) || "image", draggable: "false" });
        if (enter) img.classList.add(`t-enter-${enter}`);
        stage.replaceChildren(img);
      }, e => {
        if (!open || at !== index) return;
        stage.replaceChildren(state("amber", `COULDN'T LOAD THIS IMAGE${e?.message ? ` · ${e.message}` : ""}`));
      });
      /* the neighbours, so the next move usually lands on a picture */
      for (const j of [at + 1, at - 1]) if (j >= 0 && j < count) Promise.resolve().then(() => load(j, { soon: true })).catch(() => {});
    };

    const go = (i, enter = i > index ? "next" : "prev") => {
      if (!open || i < 0 || i >= count || i === index) return false;
      index = i;
      show(enter);
      return true;
    };

    const close = () => {
      if (!open) return;
      open = false;
      ov.remove();
      removeEventListener("keydown", onKey, true);
      visualViewport?.removeEventListener("resize", zoomed);
      onClose?.();
    };

    const onKey = e => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === "ArrowRight") go(index + 1);
      else return;
      e.stopPropagation();
      e.preventDefault();
    };

    /* -- the swipe -----------------------------------------------------
       One finger dragging sideways turns the page: the picture follows the
       finger (reluctantly past either end) and a release past a quarter of
       the way to the edge, or a flick, moves on. A second finger means a
       pinch, which belongs to the browser. A drag never also closes. */
    let drag = null, swallow = false;
    const pinchedIn = () => (visualViewport?.scale || 1) > 1.01;
    const zoomed = () => { stage.style.touchAction = pinchedIn() ? "auto" : ""; };
    visualViewport?.addEventListener("resize", zoomed);
    zoomed();                                             // opened already pinched in: pan from the start
    const pic = () => stage.firstElementChild;
    const settle = () => {
      const p = pic();
      if (!p) return;
      p.style.transition = "transform 160ms ease-out";
      p.style.transform = "";
      p.addEventListener("transitionend", () => { p.style.transition = ""; }, { once: true });
    };
    stage.addEventListener("pointerdown", e => {
      if (drag) { drag = null; settle(); return; }          // a second finger: a pinch
      if (!e.isPrimary || pinchedIn() || (e.pointerType === "mouse" && e.button !== 0)) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, dx: 0, sideways: null };
    });
    stage.addEventListener("pointermove", e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (drag.sideways === null && Math.hypot(dx, dy) > 10) drag.sideways = Math.abs(dx) > Math.abs(dy);
      if (!drag.sideways) return;
      const edge = (dx > 0 && index === 0) || (dx < 0 && index === count - 1);
      drag.dx = dx;
      const p = pic();
      if (p) { p.style.transition = ""; p.style.transform = `translateX(${edge ? dx / 3 : dx}px)`; }
    });
    const release = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const { dx, t, sideways } = drag;
      drag = null;
      if (!sideways) return;
      swallow = true;                                       // the click this release makes
      setTimeout(() => { swallow = false; }, 400);
      const fast = Math.abs(dx) / Math.max(1, e.timeStamp - t) > 0.4 && Math.abs(dx) > 24;
      const far = Math.abs(dx) > Math.min(80, stage.clientWidth / 4);
      if (e.type === "pointerup" && (fast || far) && go(index + (dx < 0 ? 1 : -1))) return;
      settle();
    };
    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);

    /* a tap on the picture or around it closes; the bar and its buttons never do */
    ov.addEventListener("click", e => {
      if (swallow) { swallow = false; return; }
      if (e.target.closest(".t-viewer-bar, .t-viewer-top")) return;
      close();
    });

    ov._close = close;
    addEventListener("keydown", onKey, true);
    document.getElementById("frame").append(ov);
    show(null);
    ov.focus({ preventScroll: true });
    return { el: ov, index: () => index, go: i => go(i), close, isOpen: () => open };
  },
});
