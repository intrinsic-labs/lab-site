/* REVIEW · live preview — the item's running app, its link one tap away.

   A link block on an item (an owner's live preview, chiefly) is the most
   useful thing on the desk after the recommendation, so it is a full-width
   button near the top rather than a row in the evidence. A tap copies the
   URL (Tycho.copy) rather than opening it: Asher pastes it into whichever
   browser he is testing in, and the installed app never has to hand a link
   to another app (an `intent://` to Chrome crashed it, 2026-10-08).

   Before he taps, the Mac checks the link is answering (tycho/reach.py) and
   the button says so: RESPONDING in green, or NOT RESPONDING in amber with
   the Mac's reason, so he knows before spending a minute on it.

     Preview.button(item, block) → el */
"use strict";

const Preview = {
  button(item, b) {
    const url = String(b.url || "");
    const safe = /^https?:\/\//i.test(url);
    let host = "";
    try { host = new URL(url).host; } catch { /* shown without a host */ }
    const state = T.el("span", { class: "t-foot t-preview-state" }, safe ? "CHECKING…" : "NOT A WEB LINK");
    const el = T.el("button", { class: "t-preview", type: "button", disabled: !safe || null,
      "aria-label": `Copy the link: ${url}`,
      onclick: () => Tycho.copy(url, "Preview link copied") },
      T.el("span", { class: "t-preview-label" }, String(b.label || "Link").toUpperCase() + " · COPY LINK"),
      T.el("span", { class: "t-foot t-preview-host" }, host),
      state);
    const note = T.el("p", { class: "t-preview-why", hidden: true });
    const box = T.el("div", { class: "t-preview-box" }, el, note);
    if (safe) Wire.reach(item.key, url).then(out => {
      if (!out.ok) { state.textContent = ""; return; }
      el.classList.toggle("down", !out.reachable);
      state.textContent = out.reachable ? "RESPONDING" : "NOT RESPONDING";
      if (!out.reachable) {
        note.hidden = false;
        note.textContent = "The Mac couldn't reach this preview just now"
          + (out.reason ? ` (${out.reason})` : "") + ". Its server or tunnel may be down; the screenshots still show the work.";
      }
    });
    return box;
  },
};
