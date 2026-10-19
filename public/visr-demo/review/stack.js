/* REVIEW · the desk's stack — pages pushed over the desk's main page.

   The desk's first page holds only what a decision needs; everything else
   (screenshots, how to review, the outcome document, the evidence) is a row
   that PUSHES its own page here, like a navigation stack: a top bar with ‹,
   the page's title, and a page that scrolls on its own. ‹ (or the phone's
   back gesture) pops back to the desk; a second ‹ from the desk returns to the
   deck. The action bar is outside the stack, so every verb stays in reach
   from any page.

   Each push takes a history entry `{ ...state, sub: depth }`, so the back
   gesture pops one page at a time; the controller's popstate calls
   `settle(depth)` with the depth the entry it landed on carries.

     const s = DeskStack.create(rootScreen);
     s.el · s.push({ title, build }) · s.back() · s.settle(depth) · s.depth()
     s.page() → the scroller on top · s.dispose()
   `build()` returns the page's content, or `{ el, dispose }`. */
"use strict";

const DeskStack = {
  create(root) {
    const el = T.el("div", { class: "t-desk-stack" }, root);
    const pages = [];   /* { el, dispose } over the root, bottom first */

    const back = () => {
      if (!pages.length) return;
      if (history.state?.sub) history.back(); else pop();
    };
    const pop = () => {
      const top = pages.pop();
      if (!top) return;
      top.dispose?.();
      top.el.remove();
      root.hidden = pages.length > 0;
      pages.at(-1)?.el.removeAttribute("hidden");
    };

    return {
      el, back,
      depth: () => pages.length,
      page: () => (pages.at(-1)?.el || root).querySelector(".t-desk-page"),

      push({ title, build }) {
        const made = build();
        const body = made?.el || made;
        const page = T.el("div", { class: "t-desk-page" }, T.el("div", { class: "t-desk-inner t-sub-inner" }, body));
        const screen = T.el("div", { class: "t-desk-screen t-sub" },
          TopBar.render({ title, back, label: "Back" }), page);
        pages.at(-1)?.el.setAttribute("hidden", "");
        root.hidden = true;
        pages.push({ el: screen, dispose: made?.dispose });
        el.append(screen);
        history.pushState({ ...(history.state || {}), sub: pages.length }, "");
        return screen;
      },

      /* the history entry now in front carries this many pages */
      settle(depth = 0) { while (pages.length > depth) pop(); },

      dispose() { while (pages.length) pop(); },
    };
  },
};
