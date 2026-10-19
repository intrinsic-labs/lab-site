/* REVIEW · any vault document, over the desk.

   A vault link in any rendered markdown (`a.vault`, kernel/helpers.js) or a
   brief's source that names a vault path opens that document here, in the
   same reader/editor the desk's own documents use — so following a link
   never sends him to Obsidian. It is a full-screen layer with its own way
   back, and the phone's back gesture closes it too (the controller pushes a
   history entry). A document the open desk already carries is not opened a
   second time: `route` (set by the desk) pushes that document's own page
   instead, where it is editable too. */
"use strict";

const DocSheet = {
  el: null, route: null,

  open(path) {
    if (!this.el && this.route?.(path)) return;
    this.close();
    const view = DocView.create({ path, role: "doc" });
    const close = () => { history.state?.docSheet ? history.back() : this.close(); };
    this.el = T.el("section", { class: "t-docsheet", "data-pid": "doc" },
      T.el("div", { class: "t-desk-inner" },
        T.el("a", { class: "t-back", href: "#", onclick: e => { e.preventDefault(); close(); } }, "‹ BACK"),
        view.el));
    document.getElementById("main").append(this.el);
    history.pushState({ ...(history.state || {}), docSheet: path }, "");
    view.load();
  },

  /* from the back gesture (popstate) or a fresh open; true if one was up */
  close() {
    if (!this.el) return false;
    this.el.remove();
    this.el = null;
    return true;
  },
};

/* one listener for every vault link the desk renders */
document.addEventListener("click", e => {
  const a = e.target.closest?.("a.vault[data-vault]");
  if (!a) return;
  e.preventDefault();
  DocSheet.open(a.dataset.vault);
});
