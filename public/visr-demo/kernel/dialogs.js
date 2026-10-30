"use strict";
Object.assign(Tycho, {
    faults: [],
    alert(e, { cap = "ACTION FAILED", retry = null } = {}) {
        const f = T.fault(e);
        if (!f.head)
            return null;
        const live = document.querySelector(".t-alert");
        const same = x => x.head === f.head && x.detail === f.detail;
        if (live && same(live._fault))
            return live;
        if (this.faults.some(q => same(q.f)))
            return live;
        this.faults.push({ f, cap, retry });
        if (live)
            this.markQueued(live);
        else
            this.nextFault();
        return document.querySelector(".t-alert");
    },
    markQueued(ov) {
        const box = ov.querySelector(".t-box");
        if (!box)
            return;
        const line = box.querySelector(".queued");
        if (!this.faults.length)
            return void line?.remove();
        const text = `${this.faults.length} more waiting`;
        if (line)
            line.textContent = text;
        else
            box.append(T.el("p", { class: "dim small queued" }, text));
    },
    nextFault() {
        document.querySelector(".t-alert")?.remove();
        const next = this.faults.shift();
        if (!next)
            return;
        const { f, cap, retry } = next;
        const shut = () => { ov.remove(); this.nextFault(); };
        const box = T.el("div", { class: "t-box t-err",
            style: "margin:0;background:var(--bg)" }, T.el("div", { class: "cap" }, cap), ...T.faultBody(f, retry ? T.el("button", { class: "t-btn tiny",
            onclick: () => { shut(); retry(); } }, "TRY AGAIN") : null, T.el("button", { class: "t-btn tiny", onclick: shut }, "DISMISS")), null);
        const ov = T.el("div", { class: "t-dialog t-alert",
            onpointerdown: ev => { if (ev.target === ov)
                shut(); } }, box);
        ov._fault = f;
        document.getElementById("main").append(ov);
        this.markQueued(ov);
        return ov;
    },
    dialog(cap, ...kids) {
        document.querySelector(".t-dialog:not(.t-alert)")?.remove();
        const box = T.el("div", { class: "t-box", style: "margin:0;background:var(--bg)" }, T.el("div", { class: "cap" }, cap), ...kids);
        const ov = T.el("div", { class: "t-dialog",
            onpointerdown: e => { if (e.target === ov)
                ov.remove(); } }, box);
        document.getElementById("main").append(ov);
        return ov;
    },
    WIDE: "(orientation: landscape) and (min-width: 1000px)",
    sheet({ cap, kids = [], acts = [], onCancel, held, loose = false, under = null } = {}) {
        document.querySelector(".t-sheet")?._cancel?.();
        const said = T.el("div", { class: "t-sheet-say" });
        const paper = T.el("div", { class: "t-sheet-paper" }, T.el("div", { class: "t-sheet-cap" }, cap), ...kids, said, T.el("div", { class: "t-sheet-acts" }, ...acts));
        const ov = T.el("div", { class: `t-sheet${loose ? " t-sheet-loose" : ""}`,
            onpointerdown: e => { if (e.target === ov && modal())
                cancel(); } }, paper, under);
        const column = () => matchMedia(this.WIDE).matches && !document.documentElement.classList.contains("t-split");
        const modal = () => !loose || (!ov.classList.contains("t-dictating") && !column());
        const onKey = e => {
            if (e.key !== "Escape" || !modal() || e.isComposing)
                return;
            e.stopPropagation();
            const f = document.activeElement;
            if (f && ov.contains(f) && f.matches("textarea, input, [contenteditable]"))
                return void f.blur();
            cancel();
        };
        const close = () => { ov.remove(); removeEventListener("keydown", onKey, true); };
        const cancel = () => { if (held?.())
            return; close(); onCancel?.(); };
        ov._cancel = cancel;
        ov._modal = modal;
        addEventListener("keydown", onKey, true);
        document.getElementById("main").append(ov);
        return { el: ov, close, modal, say: node => said.replaceChildren(...(node ? [node] : [])) };
    },
    confirm(cap, msg, verb, onYes) {
        const go = T.el("button", { class: "t-btn danger", onclick: () => {
                ov.remove();
                onYes();
            } }, verb);
        const no = T.el("button", { class: "t-btn", onclick: () => ov.remove() }, "CANCEL");
        const ov = this.dialog(cap, T.el("p", { class: "small", style: "margin:6px 0 12px" }, msg), T.el("div", { class: "t-actions" }, no, go));
        return ov;
    },
    toast(msg) {
        document.querySelector(".t-toast")?.remove();
        const t = T.el("div", { class: "t-toast" }, String(msg));
        document.getElementById("main").append(t);
        setTimeout(() => t.remove(), 3500);
    },
    async copy(text, note) {
        const s = String(text ?? "");
        if (!s)
            return false;
        try {
            if (!navigator.clipboard?.writeText)
                throw new Error("no clipboard api");
            await navigator.clipboard.writeText(s);
            Sound.commit();
            this.toast(note || "copied");
            return true;
        }
        catch { }
        try {
            const ta = T.el("textarea", {
                style: "position:fixed;top:0;left:-9999px;opacity:0"
            });
            ta.value = s;
            document.body.append(ta);
            ta.select();
            ta.setSelectionRange(0, s.length);
            const ok = document.execCommand("copy");
            ta.remove();
            if (!ok)
                throw new Error("refused");
            Sound.commit();
            this.toast(note || "copied");
            return true;
        }
        catch {
            this.toast("couldn't reach the clipboard");
            return false;
        }
    },
    editMenu(x, y, field, text) {
        const items = [];
        const sel = () => field
            ? { a: field.selectionStart ?? 0, b: field.selectionEnd ?? 0 } : null;
        const cut = () => {
            const s = sel();
            if (!s)
                return;
            const v = field.value;
            this.copy(v.slice(s.a, s.b), "cut");
            field.value = v.slice(0, s.a) + v.slice(s.b);
            field.selectionStart = field.selectionEnd = s.a;
            field.focus();
            field.dispatchEvent(new Event("input", { bubbles: true }));
        };
        const paste = async () => {
            let clip = "";
            try {
                clip = await navigator.clipboard?.readText?.() ?? "";
            }
            catch { }
            if (!clip)
                return this.toast("the clipboard is empty or out of reach — " +
                    "use the keyboard's own paste");
            const s = sel();
            if (!s)
                return;
            const v = field.value;
            field.value = v.slice(0, s.a) + clip + v.slice(s.b);
            const at = s.a + clip.length;
            field.selectionStart = field.selectionEnd = at;
            field.focus();
            field.dispatchEvent(new Event("input", { bubbles: true }));
        };
        if (text)
            items.push({ label: "COPY", icon: "copy",
                fn: () => this.copy(text) });
        if (field && text)
            items.push({ label: "CUT", icon: "cut", fn: cut });
        if (field)
            items.push({ label: "PASTE", icon: "paste", fn: paste });
        if (!items.length)
            return false;
        this.ctxmenu(x, y, items);
        return true;
    },
    installEditMenu() {
        document.addEventListener("contextmenu", e => {
            if (e.target.closest(".t-ctx, .t-menu"))
                return;
            const field = e.target.closest("input:not([type=password]), textarea");
            const s = getSelection();
            const text = field
                ? String(field.value ?? "").slice(field.selectionStart ?? 0, field.selectionEnd ?? 0)
                : (s && !s.isCollapsed ? String(s) : "");
            if (!field && !text.trim())
                return;
            e.preventDefault();
            e.stopPropagation();
            this.editMenu(e.clientX, e.clientY, field, text);
        }, true);
    },
    ctxmenu(x, y, items, { owner } = {}) {
        document.querySelector(".t-ctx")?.remove();
        const desk = document.getElementById("main");
        const menu = T.el("div", { class: "t-ctx" }, ...items.map(it => T.el("div", { class: "row" + (it.danger ? " danger" : ""),
            onpointerup: e => { if (e.button !== 0)
                return; close(); it.fn(); } }, it.icon ? T.icon(it.icon) : null, it.label)));
        desk.append(menu);
        const r = desk.getBoundingClientRect();
        menu.style.left = Math.max(0, Math.min(x - r.left, desk.clientWidth - menu.offsetWidth - 4)) + "px";
        menu.style.top = Math.max(0, Math.min(y - r.top, desk.clientHeight - menu.offsetHeight - 4)) + "px";
        const close = () => { menu.remove(); removeEventListener("pointerdown", dismiss, true); };
        const dismiss = e => {
            if (menu.contains(e.target) || owner?.contains(e.target))
                return;
            close();
        };
        addEventListener("pointerdown", dismiss, true);
        return { el: menu, close };
    },
});
