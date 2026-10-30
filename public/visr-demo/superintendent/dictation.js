"use strict";
const ChatDictation = {
    create({ ta, say, swap, send }) {
        const stopBtn = T.el("button", { class: "t-btn t-voice rec", type: "button" }, "■ STOP");
        const clock = T.el("span", { class: "t-chat-clock", role: "timer" });
        const sendBtn = T.el("button", { class: "t-btn primary t-chat-send", type: "button" }, "SEND");
        const el = T.el("div", { class: "t-chat-rec" }, stopBtn, clock, sendBtn);
        let state = "idle", rec = null, timer = 0, began = 0, caret = null, sendWanted = false;
        let target = Recordings.target(ta);
        const time = s => {
            clock.replaceChildren(T.el("span", { class: "dot", "aria-hidden": "true" }), Dictate.clock(s));
            clock.setAttribute("aria-label", `Recording, ${Math.round(s)} seconds`);
        };
        const working = text => { clock.replaceChildren(T.el("span", { class: "t-foot" }, text)); clock.removeAttribute("aria-label"); };
        const tell = (text, retry) => say.replaceChildren(...(text ? [text, retry ? T.el("button", {
                class: "t-btn tiny t-chat-retry", type: "button", onclick: () => { tell(""); retry(); }
            }, "RETRY") : null] : []));
        const idle = () => { state = "idle"; stopBtn.disabled = sendBtn.disabled = false; swap(false); };
        async function start() {
            if (state !== "idle")
                return;
            target = Recordings.target(ta);
            caret = { value: ta.value, start: ta.selectionStart, end: ta.selectionEnd };
            ta.blur();
            tell("");
            sendWanted = false;
            state = "arming";
            time(0);
            swap(true);
            try {
                rec = await Voice.record();
            }
            catch {
                if (state === "arming")
                    idle();
                return tell("The microphone wasn't allowed.");
            }
            if (state !== "arming") {
                rec.stop();
                await rec.done;
                rec = null;
                return;
            }
            state = "recording";
            began = performance.now();
            timer = setInterval(() => {
                if (!el.isConnected)
                    return rec?.stop();
                time((performance.now() - began) / 1000);
            }, 250);
            const take = await rec.done;
            clearInterval(timer);
            rec = null;
            if (!take.file.size) {
                idle();
                return tell("Nothing was recorded.");
            }
            await hear(take);
        }
        async function hear(take) {
            const into = take.recording?.target || take.staged?.target || target;
            const go = sendWanted;
            sendWanted = false;
            state = "working";
            stopBtn.disabled = sendBtn.disabled = true;
            swap(true);
            working("UPLOADING…");
            const out = await Recordings.hear(take, into, p => working(p === null ? "TRANSCRIBING…" : `UPLOADING ${Math.round(p * 100)}%`)).catch(() => null);
            idle();
            if (!out?.ok) {
                const why = !out ? "The action token wasn't given." : out.reason || "It couldn't be transcribed.";
                tell("");
                Recordings.controls(say, out?.recording || out?.pending, () => hear(out?.recording || out?.pending ? Recordings.take(out.recording || out.pending, take.seconds) : take), `${Dictate.clock(take.seconds)} not transcribed: ${why} Your text is unchanged.`, take);
                return;
            }
            if (!Recordings.insert(ta, out.text, caret, out.recording, into)) {
                tell("");
                Recordings.controls(say, out.recording, null, "Your chat draft changed while transcribing. Your current text is unchanged.");
                caret = null;
                return;
            }
            caret = null;
            if (go && el.isConnected)
                send();
            if (take.cut)
                tell(`Recording stopped at ${Dictate.clock(out.seconds ?? take.seconds)}: ${take.cut}. What was heard is in the box.`);
        }
        stopBtn.onclick = () => { if (state === "recording")
            rec.stop();
        else if (state === "arming")
            idle(); };
        sendBtn.onclick = () => { if (state === "recording") {
            sendWanted = true;
            rec.stop();
        } };
        Recordings.restore(say, target, take => hear(take));
        return { el, start, busy: () => state !== "idle", usable: Voice.usable() };
    },
};
