/* REVIEW · dropdown — a small menu anchored under the button that opens it.

   The context menu's look (kernel/dialogs.js `.t-ctx`) as a proper menu
   button: rows of an icon and a label side by side, the icon left and the
   words right. A row can carry a short note (DRAFT), a dim count, or a
   chevron on the right when it opens a further menu (`next`: its fn opens
   that menu on the same button), or be a choice, with a check in the icon's
   place on the chosen one. A `keep` row is a checkbox: a tap flips it and the
   menu stays open, redrawn in place, so several can be ticked in one go. One menu is open at a time.
   It closes on a choice, a tap outside, Escape, Tab, a resize or the back
   gesture; Escape gives the focus back to its button. A tap outside lands on
   a clear shade under the menu, so the tap that closes it never also opens
   the card or the paper beneath. A tap on the menu's own button, which the
   shade also covers, closes it and stays closed: the button toggles.

   Keyboard: the button is `aria-haspopup="menu"` with `aria-expanded`;
   Enter, Space or ArrowDown open it on the first row (or the chosen one);
   ArrowUp/ArrowDown, Home and End move between rows. Keys pressed in the
   menu stop there, so the deck behind it never turns.

     Dropdown.attach(button, { label, align: "left" | "right", items })
       items() → [{ icon?, label, note?, count?, next?, checked?, keep?, fn }]   (read on every open)
     Dropdown.close() */
"use strict";

const Dropdown = {
  current: null,   // { btn, menu, off }
  /* the button whose tap the shade just took to close its menu; the click
     that follows on that button is the same tap, not a second open */
  swallow: null,

  attach(btn, opts) {
    btn.setAttribute("aria-haspopup", "menu");
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", () => {
      const s = this.swallow;
      this.swallow = null;
      if (s && s.btn === btn && performance.now() - s.at < 1000) return;
      if (this.current?.btn === btn) this.close();
      else this.open(btn, opts);
    });
    btn.addEventListener("keydown", e => {
      if (e.key !== "ArrowDown") return;
      e.preventDefault(); e.stopPropagation();
      this.open(btn, opts);
    });
  },

  open(btn, opts, at = null) {
    const { label, align = "left", items } = opts;
    this.close();
    const list = items();
    const rows = list.map((it, i) => {
      const choice = it.checked !== undefined;
      const row = T.el("button", { class: "t-drop-row", type: "button", tabindex: "-1",
        role: it.keep ? "menuitemcheckbox" : choice ? "menuitemradio" : "menuitem",
        ...(choice ? { "aria-checked": String(!!it.checked) } : {}),
        onclick: () => {
          if (it.keep) { it.fn(); this.open(btn, opts, i); return; }
          this.close(); it.fn();
        } });
      const ico = T.el("span", { class: "t-drop-ico" });
      const icon = choice ? (it.checked ? "check" : null) : it.icon;
      if (icon) ico.append(Icons.node(icon));
      row.append(ico, T.el("span", { class: "t-drop-label" }, it.label));
      if (it.note) row.append(T.el("span", { class: "t-drop-note" }, it.note));
      if (it.count != null) row.append(T.el("span", { class: "t-drop-count" }, String(it.count)));
      if (it.next) row.append(T.el("span", { class: "t-drop-next" }, Icons.node("next")));
      return row;
    });
    const menu = T.el("div", { class: "t-drop", role: "menu", "aria-label": label }, ...rows);
    const host = document.getElementById("main") || document.body;
    const shade = T.el("div", { class: "t-drop-shade", "aria-hidden": "true" });
    shade.addEventListener("pointerdown", e => {
      e.preventDefault();
      const r = btn.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom)
        this.swallow = { btn, at: performance.now() };
      this.close();
    });
    host.append(shade, menu);
    const r = btn.getBoundingClientRect(), h = host.getBoundingClientRect();
    menu.style.top = `${Math.round(r.bottom - h.top + 2)}px`;
    if (align === "right") menu.style.right = `${Math.max(8, Math.round(h.right - r.right))}px`;
    else menu.style.left = `${Math.max(8, Math.round(r.left - h.left))}px`;

    const focusAt = i => rows[(i + rows.length) % rows.length]?.focus({ preventScroll: true });
    menu.addEventListener("keydown", e => {
      e.stopPropagation();
      const at = rows.indexOf(document.activeElement);
      if (e.key === "Escape") { e.preventDefault(); this.close(true); }
      else if (e.key === "Tab") this.close();
      else if (e.key === "ArrowDown") { e.preventDefault(); focusAt(at + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); focusAt(at - 1); }
      else if (e.key === "Home") { e.preventDefault(); focusAt(0); }
      else if (e.key === "End") { e.preventDefault(); focusAt(rows.length - 1); }
    });
    const gone = () => this.close();
    addEventListener("resize", gone);
    addEventListener("popstate", gone);
    addEventListener("hashchange", gone);
    this.current = { btn, menu, shade, off: () => {
      removeEventListener("resize", gone);
      removeEventListener("popstate", gone);
      removeEventListener("hashchange", gone);
    } };
    btn.setAttribute("aria-expanded", "true");
    btn.classList.add("open");
    focusAt(at ?? Math.max(0, list.findIndex(it => it.checked)));
  },

  close(refocus = false) {
    const c = this.current;
    if (!c) return;
    this.current = null;
    c.off();
    c.menu.remove();
    c.shade.remove();
    c.btn.setAttribute("aria-expanded", "false");
    c.btn.classList.remove("open");
    if (refocus) c.btn.focus({ preventScroll: true });
  },
};
