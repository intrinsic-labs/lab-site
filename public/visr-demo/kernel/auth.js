"use strict";
Object.assign(Tycho, {
    TOKEN_KEY: "tycho.term.token",
    token() { return localStorage.getItem(this.TOKEN_KEY) || ""; },
    async auth(fn) {
        try {
            return await fn();
        }
        catch (e) {
            if (!/bad token/i.test(String(e?.message)))
                throw e;
            if (!(await this.askToken()))
                return null;
            try {
                return await fn();
            }
            catch (e2) {
                if (!/bad token/i.test(String(e2?.message)))
                    throw e2;
                this.toast("that token was refused");
                return null;
            }
        }
    },
    askToken() {
        return this.asking ||= new Promise(resolve => {
            let done = false;
            const finish = ok => {
                if (done)
                    return;
                done = true;
                this.asking = null;
                if (ov.isConnected)
                    ov.remove();
                resolve(ok);
            };
            const field = T.el("input", { class: "t-field", type: "password",
                autocomplete: "current-password", placeholder: "the action token" });
            const go = T.el("button", { class: "t-btn primary", onclick: () => {
                    const v = field.value.trim();
                    if (!v)
                        return field.focus();
                    localStorage.setItem(this.TOKEN_KEY, v);
                    finish(true);
                } }, "AUTHORIZE");
            const ov = this.dialog("AUTHORIZATION", T.el("p", { class: "t-say" }, "Acting from this device needs the action token. You paste it once."), field, go);
            ov.addEventListener("pointerdown", ev => { if (ev.target === ov)
                finish(false); });
            new MutationObserver((_, mo) => { if (!ov.isConnected) {
                mo.disconnect();
                finish(false);
            } })
                .observe(ov.parentNode, { childList: true });
            field.onkeydown = ev => { if (ev.key === "Enter")
                go.click(); };
            field.focus();
        });
    },
});
