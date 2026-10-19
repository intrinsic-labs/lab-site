/* EMAIL — an address in the UI is a link, and a tap copies it.

   A bare address in rendered text (T.mdInline, Telemetry.inline) and any
   `mailto:` link become `a.t-email`; one capturing listener turns a tap on
   either into a copy of the address (Tycho.copy), never a hand-off to a mail
   app. The installed app handing a link to another app is what crashed it
   (2026-10-08), and the address is usually wanted in a field elsewhere.

     Email.RE                → a bare address, global
     Email.link(addr)        → an a.t-email node
     Email.html(addr)        → the same as HTML, for T.mdInline */
"use strict";

const Email = {
  RE: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,

  link(addr) {
    return T.el("a", { class: "t-email", href: `mailto:${addr}`, title: "Tap to copy" }, addr);
  },

  html(addr) {
    const a = T.esc(addr);
    return `<a class="t-email" href="mailto:${a}" title="Tap to copy">${a}</a>`;
  },

  /* the address a mailto link names, without its ?subject=… */
  address(href) {
    let s = String(href || "").replace(/^mailto:/i, "").split("?")[0];
    try { s = decodeURIComponent(s); } catch { /* keep it as written */ }
    return s;
  },
};

document.addEventListener("click", e => {
  const a = e.target.closest?.('a[href^="mailto:" i]');
  if (!a || e.defaultPrevented) return;
  e.preventDefault();
  e.stopPropagation();
  const addr = Email.address(a.getAttribute("href"));
  if (addr) Tycho.copy(addr, `${addr} copied`);
}, true);
