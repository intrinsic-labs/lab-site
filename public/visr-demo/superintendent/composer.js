"use strict";
const Composer = {
    DRAFT: "superintendent",
    create({ peek, pickCard, send, draft = this.DRAFT, paste = true }) {
        const id = draft;
        const say = T.el("div", { class: "t-chat-say amber", role: "status" });
        const ta = T.el("textarea", { class: "t-chat-field", rows: "1", placeholder: "Message", "data-draft": id,
            spellcheck: "true", autocapitalize: "sentences", enterkeyhint: "enter", "aria-label": "Message" });
        ta.value = Drafts.get(id).text || "";
        const plus = T.el("button", { class: "t-chatbox-ico", type: "button", "aria-label": "Attach" }, Icons.node("plus"));
        const card = T.el("button", { class: "t-chatbox-ico card", type: "button", "aria-label": "Attach a card" }, CardRef.glyph(false));
        const mic = T.el("button", { class: "t-chatbox-ico", type: "button", "aria-label": "Dictate" }, Icons.node("mic"));
        const go = T.el("button", { class: "t-chatbox-send", type: "button", "aria-label": "Send", hidden: "" }, Icons.node("send"));
        const tray = ChatTray.create(id, { peek, changed: () => sync() });
        const box = T.el("div", { class: "t-chatbox" }, tray.el, T.el("div", { class: "t-chatbox-row" }, plus, card, ta, mic, go));
        const dictation = ChatDictation.create({ ta, say, send: () => submit(),
            swap: on => { box.hidden = on; dictation.el.hidden = !on; } });
        dictation.el.hidden = true;
        const foot = T.el("div", { class: "t-chatbar-foot" }, box, dictation.el);
        const inner = T.el("div", { class: "t-chatbar-inner" }, tray.say, say, foot, ...tray.inputs);
        const el = T.el("footer", { class: "t-chatbar" }, inner);
        const grow = () => T.keepScroll(ta, () => { ta.style.height = "auto"; ta.style.height = `${ta.scrollHeight}px`; });
        const sync = () => { go.hidden = !(ta.value.trim() || tray.count()); };
        ta.addEventListener("input", () => { Drafts.set(id, { text: ta.value }); grow(); sync(); });
        ta.addEventListener("keydown", e => {
            if (e.key !== "Enter" || Tycho.keys.composing(e))
                return;
            const chord = e.metaKey || e.ctrlKey;
            if (!chord && (e.shiftKey || e.altKey || !Tycho.keys.physical()))
                return;
            e.preventDefault();
            if (!e.repeat)
                submit();
        });
        plus.onclick = () => tray.pick();
        if (paste)
            ChatPaste.catch(ta, files => tray.addFiles(files));
        card.onclick = () => { ta.blur(); pickCard(c => tray.addCard(c)); };
        if (dictation.usable)
            mic.onclick = () => dictation.start();
        else {
            mic.disabled = true;
            mic.title = "dictation needs the microphone over https";
        }
        go.onclick = () => submit();
        function submit() {
            if (dictation.busy())
                return;
            if (tray.busy())
                return void (say.textContent = "Wait for the attachments to finish uploading.");
            const text = ta.value;
            if (!text.trim() && !tray.count())
                return;
            const was = { text, ...tray.snapshot() };
            const body = { text, ...tray.payload() };
            if (!send(body, was))
                return void (say.textContent = "This device couldn't keep the message while it sends, so it's still here. Try again.");
            say.textContent = "";
            ta.value = "";
            Drafts.set(id, { text: "", dictationVersion: crypto.randomUUID() });
            tray.clear();
            grow();
            sync();
        }
        const isEmpty = () => !ta.value.trim() && !tray.count() && !tray.busy() && !dictation.busy();
        function restore(was, reason) {
            ta.value = was.text || "";
            Drafts.set(id, { text: ta.value });
            tray.restore(was);
            grow();
            sync();
            say.textContent = `Not sent: ${reason || "the Mac didn't answer."}`;
        }
        let said = 0;
        requestAnimationFrame(() => { grow(); sync(); });
        return {
            el, tray, isEmpty, restore,
            say(text) {
                say.textContent = text;
                clearTimeout(said);
                said = setTimeout(() => { if (say.textContent === text)
                    say.textContent = ""; }, 4000);
            },
            hint(text, label = text) { ta.placeholder = text; ta.setAttribute("aria-label", label); },
            focus: () => ta.focus({ preventScroll: true }),
            blur: () => ta.blur(),
            reload() { const t = Drafts.get(id).text || ""; if (t !== ta.value) {
                ta.value = t;
            } requestAnimationFrame(() => { grow(); sync(); }); },
        };
    },
};
