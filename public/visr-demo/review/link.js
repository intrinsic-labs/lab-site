/* REVIEW · link — whether the Mac is answering, always in view.

   The installed app opens from its own cache and draws the last good read
   (snapshot.js), so with Tailscale off or the Mac asleep the deck looked
   live and nothing said otherwise. While the latest queue read has failed,
   a strip pinned to the top of every view says so, with the time the deck
   was last read and the reason; a tap reads again. It goes the moment a
   read lands.

     Link.mount(retry) · Link.show(fault, checked) */
"use strict";

const Link = {
  el: null,

  mount(retry) {
    this.el = T.el("button", { class: "t-link", type: "button", hidden: true,
      "aria-live": "polite", onclick: () => retry() });
    document.body.append(this.el);
  },

  show(fault, checked) {
    if (!this.el) return;
    this.el.hidden = !fault;
    if (!fault) return;
    this.el.replaceChildren(
      T.el("b", {}, "CAN'T REACH THE MAC"),
      T.el("span", {}, checked ? ` · DECK AS OF ${checked}` : " · NOTHING READ YET"),
      T.el("span", { class: "t-link-why" }, `${T.fault(fault).head} · tap to try again`));
  },
};
