/* REVIEW · top bar — the one way back, always in view.

   A desk (or capture) opens under a bar that never scrolls away: ‹ back to
   the cards and the short name the deck card carried, on one line. It sits
   outside the scrolling page, so the page's own scroll (and place.js, which
   puts it back) never has to know it is there. The full title is still the
   heading under it. Given `copy` (the item's plain reference), a copy mark
   sits at the right and the title copies too: one tap puts the reference on
   the clipboard for an agent.

   A page pushed over the desk (stack.js) uses the same bar; its ‹ goes back
   one page, which `label` says to a screen reader.

     const bar = TopBar.render({ title, back, copy?, label? });   // bar is the element */
"use strict";

const TopBar = {
  render({ title, back, copy, label = "Back to the cards" }) {
    const btn = T.el("button", { class: "t-topbar-back", type: "button", "aria-label": label,
      onclick: () => back() }, "‹");
    const text = String(title || "");
    if (!copy) return T.el("nav", { class: "t-topbar" },
      T.el("div", { class: "t-topbar-row" }, btn, T.el("div", { class: "t-topbar-title" }, text)));
    const put = () => Tycho.copy(String(copy), "reference copied");
    const name = T.el("button", { class: "t-topbar-title", type: "button", title: "Copy a reference for an agent", onclick: put }, text);
    const mark = T.el("button", { class: "t-topbar-copy", type: "button", "aria-label": "Copy a reference for an agent", onclick: put });
    mark.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
      + 'stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">'
      + '<rect x="8" y="8" width="12" height="12"/><path d="M16 8V4H4v12h4"/></svg>';
    return T.el("nav", { class: "t-topbar" }, T.el("div", { class: "t-topbar-row" }, btn, name, mark));
  },
};
