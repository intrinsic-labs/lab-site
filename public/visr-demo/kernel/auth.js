/* INTRINSICOS KERNEL · auth — the action token, asked for once per device.

   Every write to the Mac rides the action token (tycho/auth.py), stored on this
   device under the key it always had (`tycho.term.token` — the keys are
   renamed in a later migration, not here). `Tycho.auth(fn)` runs `fn`; when
   it throws "bad token" it asks for the token (one prompt shared by every
   write asking at once) and tries again. Any other failure is the caller's
   to show, so it is rethrown untouched.

   Dismissing the prompt is an answer too: the caller gets null and can put
   its controls back instead of waiting forever. */
"use strict";

Object.assign(Tycho, {
  TOKEN_KEY: "tycho.term.token",
  token() { return localStorage.getItem(this.TOKEN_KEY) || ""; },

  async auth(fn) {
    try { return await fn(); }
    catch (e) {
      if (!/bad token/i.test(String(e?.message))) throw e;
      if (!(await this.askToken())) return null;
      try { return await fn(); }
      catch (e2) {
        if (!/bad token/i.test(String(e2?.message))) throw e2;
        this.toast("that token was refused");
        return null;
      }
    }
  },

  /* One prompt, however many writes asked at once (several attachments
     uploading together each get a 401): they all wait on the same answer,
     and every one of them is answered, given or dismissed. AUTHORIZE takes
     one tap. → true once a token is stored, false when dismissed. */
  askToken() {
    return this.asking ||= new Promise(resolve => {
      let done = false;
      const finish = ok => {
        if (done) return;
        done = true;
        this.asking = null;
        if (ov.isConnected) ov.remove();
        resolve(ok);
      };
      const field = T.el("input", { class: "t-field", type: "password",
        autocomplete: "current-password", placeholder: "the action token" });
      const go = T.el("button", { class: "t-btn primary", onclick: () => {
        const v = field.value.trim();
        if (!v) return field.focus();
        localStorage.setItem(this.TOKEN_KEY, v);
        finish(true);
      } }, "AUTHORIZE");
      const ov = this.dialog("AUTHORIZATION",
        T.el("p", { class: "t-say" },
          "Acting from this device needs the action token. You paste it once."),
        field, go);
      ov.addEventListener("pointerdown", ev => { if (ev.target === ov) finish(false); });
      /* removed by anything else (another dialog replacing it) is a dismissal */
      new MutationObserver((_, mo) => { if (!ov.isConnected) { mo.disconnect(); finish(false); } })
        .observe(ov.parentNode, { childList: true });
      field.onkeydown = ev => { if (ev.key === "Enter") go.click(); };
      field.focus();
    });
  },
});
