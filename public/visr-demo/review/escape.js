"use strict";
const EscapeKey = {
    app: null,
    install(app) {
        this.app = app;
        addEventListener("keydown", e => {
            if (e.key !== "Escape" || e.defaultPrevented || Tycho.keys.composing(e))
                return;
            if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey)
                return;
            if (this.step(e))
                e.preventDefault();
        });
    },
    step(e) {
        if (Dropdown.current) {
            Dropdown.close(true);
            return true;
        }
        if (document.querySelector(".t-dialog"))
            return false;
        const field = Tycho.keys.field(e.target);
        if (field) {
            field.blur();
            if (SuptDock.on && Chat.el?.contains(field))
                Chat.el.focus({ preventScroll: true });
            return true;
        }
        if (SuptDock.on && Chat.el?.contains(e.target))
            return this.chat(e);
        const doc = document.querySelector(".t-docsheet .t-back");
        if (doc) {
            doc.click();
            return true;
        }
        const sheet = document.querySelector(".t-sheet");
        if (sheet) {
            if (!sheet._busy?.())
                sheet._cancel?.();
            return true;
        }
        if (Chat.isOpen())
            return this.chat(e);
        return this.view();
    },
    chat(e) {
        if (SuptDock.on) {
            if (Chat.el.contains(e.target)) {
                if (Chat.closeOver())
                    return true;
                document.activeElement?.blur();
            }
            return this.view();
        }
        if (!Chat.closeOver())
            Chat.back();
        return true;
    },
    view() {
        const app = this.app;
        if (!app.view)
            return false;
        if (app.desk) {
            app.back();
            return true;
        }
        const back = [...app.view.el.querySelectorAll(".t-topbar-back")].find(b => b.offsetParent);
        if (back)
            back.click();
        else
            app.back();
        return true;
    },
};
