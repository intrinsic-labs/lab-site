/* TYCHO KERNEL · dialogs — the OS alert, modal dialog, confirm, toast, clipboard, the edit menu and the context menu. All kernel chrome over #main. */
"use strict";

Object.assign(Tycho, {
  /* -- the OS alert ---------------------------------------------------------
     A failed or refused action is a SYSTEM EVENT, not a footnote: it used to
     render inline at the bottom of whichever panel was open, where a wall of
     git stderr overflowed the window and a refusal Asher needed to act on read
     like decoration. So it pops as a real TychoOS alert — the same modal
     idiom the authorization prompt uses, wearing the fault's red.

     Three rules it keeps. It never touches the state underneath: the alert is
     an overlay, DISMISS removes it, and the screen behind is exactly where it
     was. Faults QUEUE rather than overlap — a verb that fails three times in a
     row shows three alerts in order, each naming its position, instead of
     three stacked overlays with only the last one reachable. And a repeat of
     the fault already on screen is folded into it rather than queued, because
     tapping RETRY twice on a broken thing is one problem, not two. */
  faults: [],

  alert(e, { cap = "ACTION FAILED", retry = null } = {}) {
    const f = T.fault(e);
    if (!f.head) return null;
    const live = document.querySelector(".t-alert");
    const same = x => x.head === f.head && x.detail === f.detail;
    if (live && same(live._fault)) return live;      /* already saying this */
    if (this.faults.some(q => same(q.f))) return live;
    this.faults.push({ f, cap, retry });
    if (live) this.markQueued(live);   /* the one on screen says how many follow */
    else this.nextFault();
    return document.querySelector(".t-alert");
  },

  /* "N more waiting", kept true as the queue moves — written after the alert
     is on screen as well as while it is being built, because faults arrive
     asynchronously and an alert that under-reports the backlog invites him to
     dismiss it thinking that was all of it. */
  markQueued(ov) {
    const box = ov.querySelector(".t-box");
    if (!box) return;
    const line = box.querySelector(".queued");
    if (!this.faults.length) return void line?.remove();
    const text = `${this.faults.length} more waiting`;
    if (line) line.textContent = text;
    else box.append(T.el("p", { class: "dim small queued" }, text));
  },

  nextFault() {
    document.querySelector(".t-alert")?.remove();
    const next = this.faults.shift();
    if (!next) return;
    const { f, cap, retry } = next;
    const shut = () => { ov.remove(); this.nextFault(); };
    const box = T.el("div", { class: "t-box t-err",
      style: "margin:0;background:var(--bg)" },
      T.el("div", { class: "cap" }, cap),
      ...T.faultBody(f,
        retry ? T.el("button", { class: "t-btn tiny",
          onclick: () => { shut(); retry(); } }, "TRY AGAIN") : null,
        T.el("button", { class: "t-btn tiny", onclick: shut }, "DISMISS")),
      null);
    const ov = T.el("div", { class: "t-dialog t-alert",
      onpointerdown: ev => { if (ev.target === ov) shut(); } }, box);
    ov._fault = f;
    document.getElementById("main").append(ov);
    this.markQueued(ov);
    return ov;
  },

  dialog(cap, ...kids) {
    /* an alert is not a dialog and may not be clobbered by one — the auth
       prompt opening must not silently eat the fault that provoked it */
    document.querySelector(".t-dialog:not(.t-alert)")?.remove();
    const box = T.el("div", { class: "t-box", style: "margin:0;background:var(--bg)" },
      T.el("div", { class: "cap" }, cap), ...kids);
    const ov = T.el("div", { class: "t-dialog",
      onpointerdown: e => { if (e.target === ov) ov.remove(); } }, box);
    document.getElementById("main").append(ov);
    return ov;
  },

  /* a yes/no gate on one destructive verb. Kernel chrome rather than a
     one-off, because "are you sure" is a shape, not a feature — and because
     the drawer's DELETE is a thumb-sized button sitting beside OPEN, which is
     a very different risk profile from a menu item three levels down. */
  confirm(cap, msg, verb, onYes) {
    const go = T.el("button", { class: "t-btn danger", onclick: () => {
      ov.remove(); onYes();
    } }, verb);
    const no = T.el("button", { class: "t-btn", onclick: () => ov.remove() }, "CANCEL");
    const ov = this.dialog(cap,
      T.el("p", { class: "small", style: "margin:6px 0 12px" }, msg),
      T.el("div", { class: "t-actions" }, no, go));
    return ov;
  },

  toast(msg) {
    document.querySelector(".t-toast")?.remove();
    const t = T.el("div", { class: "t-toast" }, String(msg));
    document.getElementById("main").append(t);
    setTimeout(() => t.remove(), 3500);
  },

  /* -- clipboard ------------------------------------------------------------
     The async Clipboard API where it exists, and the old textarea+execCommand
     where it doesn't: this OS is served over plain http on the tailnet, and
     `navigator.clipboard` is unavailable on an insecure origin. A copy that
     silently does nothing is worse than one that says it couldn't, so both
     paths end in a toast either way. */
  async copy(text, note) {
    const s = String(text ?? "");
    if (!s) return false;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard api");
      await navigator.clipboard.writeText(s);
      Sound.commit(); this.toast(note || "copied"); return true;
    } catch { /* fall through to the legacy path */ }
    try {
      const ta = T.el("textarea", {
        style: "position:fixed;top:0;left:-9999px;opacity:0" });
      ta.value = s;
      document.body.append(ta);
      ta.select(); ta.setSelectionRange(0, s.length);
      const ok = document.execCommand("copy");
      ta.remove();
      if (!ok) throw new Error("refused");
      Sound.commit(); this.toast(note || "copied"); return true;
    } catch {
      this.toast("couldn't reach the clipboard");
      return false;
    }
  },

  /* -- the OS's own edit menu ----------------------------------------------
     TychoOS draws every other menu it has; the one the browser drew over a
     text selection was the last piece of somebody else's chrome on this
     screen. On Chrome/Android a long-press on a selection fires `contextmenu`
     just as a right-click does, so ONE handler covers the pointer and the
     tablet — preventDefault suppresses the system sheet and this takes its
     place. Deliberately three verbs: copy, cut, paste. It never fires on an
     empty selection outside a field, which is what leaves the desktop's own
     NEW FOLDER / NEW FILE menu and the icon menus exactly as they were.

     Selection itself is untouched: no `user-select: none` is added anywhere by
     this, so the drag handles, double-tap-to-select and the caret all behave
     natively. Only the menu is ours. */
  editMenu(x, y, field, text) {
    const items = [];
    const sel = () => field
      ? { a: field.selectionStart ?? 0, b: field.selectionEnd ?? 0 } : null;
    const cut = () => {
      const s = sel(); if (!s) return;
      const v = field.value;
      this.copy(v.slice(s.a, s.b), "cut");
      field.value = v.slice(0, s.a) + v.slice(s.b);
      field.selectionStart = field.selectionEnd = s.a;
      field.focus();
      field.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const paste = async () => {
      let clip = "";
      try { clip = await navigator.clipboard?.readText?.() ?? ""; }
      catch { /* denied, or an insecure origin — say so rather than no-op */ }
      if (!clip) return this.toast("the clipboard is empty or out of reach — " +
                                   "use the keyboard's own paste");
      const s = sel(); if (!s) return;
      const v = field.value;
      field.value = v.slice(0, s.a) + clip + v.slice(s.b);
      const at = s.a + clip.length;
      field.selectionStart = field.selectionEnd = at;
      field.focus();
      field.dispatchEvent(new Event("input", { bubbles: true }));
    };
    if (text) items.push({ label: "COPY", icon: "copy",
                           fn: () => this.copy(text) });
    if (field && text) items.push({ label: "CUT", icon: "cut", fn: cut });
    if (field) items.push({ label: "PASTE", icon: "paste", fn: paste });
    if (!items.length) return false;
    this.ctxmenu(x, y, items);
    return true;
  },

  /* the one listener behind it. Capture, so it settles before the desktop's
     own contextmenu handler and the two menus can never both open. */
  installEditMenu() {
    document.addEventListener("contextmenu", e => {
      if (e.target.closest(".t-ctx, .t-menu")) return;
      const field = e.target.closest("input:not([type=password]), textarea");
      const s = getSelection();
      /* a selection inside a field is reported by the field, not by the
         document — getSelection() is empty over a shadow-y native control */
      const text = field
        ? String(field.value ?? "").slice(field.selectionStart ?? 0,
                                          field.selectionEnd ?? 0)
        : (s && !s.isCollapsed ? String(s) : "");
      if (!field && !text.trim()) return;   /* the desk/icon menus own this */
      e.preventDefault();
      e.stopPropagation();
      this.editMenu(e.clientX, e.clientY, field, text);
    }, true);
  },

  ctxmenu(x, y, items) {
    document.querySelector(".t-ctx")?.remove();
    const desk = document.getElementById("main");
    const menu = T.el("div", { class: "t-ctx" },
      ...items.map(it => T.el("div", { class: "row" + (it.danger ? " danger" : ""),
        /* the right button's own release lands on the row that just appeared
           under it — only a primary release picks */
        onpointerup: e => { if (e.button !== 0) return; menu.remove(); it.fn(); } },
        it.icon ? T.icon(it.icon) : null, it.label)));
    desk.append(menu);
    const r = desk.getBoundingClientRect();
    menu.style.left = Math.max(0, Math.min(x - r.left,
      desk.clientWidth - menu.offsetWidth - 4)) + "px";
    menu.style.top = Math.max(0, Math.min(y - r.top,
      desk.clientHeight - menu.offsetHeight - 4)) + "px";
    const dismiss = e => {
      if (menu.contains(e.target)) return;
      menu.remove(); removeEventListener("pointerdown", dismiss, true);
    };
    addEventListener("pointerdown", dismiss, true);
  },
});
