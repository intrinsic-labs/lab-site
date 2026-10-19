/* REVIEW · compose — the writing sheet for FEEDBACK and REFUSE.

   A slip of paper over the desk: one textarea with no length limit (line
   breaks kept), DICTATE to speak into it (dictate.js), the attachment tray
   where the runtime takes files (`files`), and SEND. Everything on it is a draft
   from the first keystroke (`<key>|<action>`), and which sheet is up is part
   of the session, so a tab Android threw away reopens with this sheet, this
   text and these attachments. A send that is refused keeps the sheet up with
   the reason on it; CANCEL closes it and keeps the draft. Where the item caps
   the text (`max`, the runtime's textMax) a live count sits under it
   (text-cap.js) and SEND says what to cut instead of sending.

     Compose.open({ key, action, cap, hint, verb, tone, files, max, send }) → Promise<out|null>
   `send(text, attachments)` is the controller's and resolves to the act's
   answer; the sheet closes on `ok` or `stale` (the controller has moved). */
"use strict";

const Compose = {
  open(o) {
    const id = `${o.key}|${o.action}`;
    Session.patch({ sheet: o.action });
    return new Promise(resolve => {
      const ta = T.el("textarea", { class: "t-textarea t-compose", spellcheck: "true", "data-draft": id,
        autocapitalize: "sentences", placeholder: o.hint || "" });
      ta.value = Drafts.get(id).text || "";
      const grow = () => { ta.style.height = "auto"; ta.style.height = Math.max(ta.scrollHeight + 4, 160) + "px"; };
      const count = TextCap.attach(ta, o.max);
      ta.oninput = () => { Drafts.set(id, { text: ta.value }); grow(); count?.update(); };
      const dictate = Dictate.attach(ta);
      const tray = o.files ? Attach.tray(id) : null;
      const send = T.el("button", { class: `t-btn ${o.tone || "primary"}` }, o.verb || "SEND");
      const cancel = T.el("button", { class: "t-btn" }, "CANCEL");
      let sending = false;
      const done = out => { Session.patch({ sheet: null }); sh.close(); resolve(out); };
      const sh = Tycho.sheet({ cap: o.cap, kids: [ta, count?.el, dictate.el, tray?.el], acts: [cancel, send],
        held: () => sending,
        onCancel: () => { Session.patch({ sheet: null }); resolve(null); } });
      cancel.onclick = () => done(null);
      send.onclick = async () => {
        if (dictate.busy()) return sh.say(T.el("p", { class: "t-say amber" }, "Wait for the dictation to finish."));
        if (tray?.busy()) return sh.say(T.el("p", { class: "t-say amber" }, "Wait for the attachments to finish uploading."));
        if (o.needsText && !ta.value.trim() && !tray?.count())
          return sh.say(T.el("p", { class: "t-say amber" }, "Write something, or attach something, first."));
        if (count?.over())
          return sh.say(T.el("p", { class: "t-say amber" },
            `Cut ${count.over()} character${count.over() === 1 ? "" : "s"} first — this note is at most ${o.max}.`));
        send.disabled = cancel.disabled = true; sending = true;
        sh.say(T.el("p", { class: "t-say dim" }, "Sending…"));
        const out = await o.send(ta.value, tray ? tray.files() : []);
        send.disabled = cancel.disabled = false; sending = false;
        if (out?.ok || out?.code === "stale") return done(out);
        sh.say(T.el("div", { class: "t-note bad" }, T.el("div", { class: "t-label" }, "NOT SENT"),
          T.el("p", {}, String(out?.reason || "not sent"))));
      };
      requestAnimationFrame(() => { grow(); ta.focus({ preventScroll: true }); });
    });
  },
};
