"use strict";
const Dictate = {
    HOLD_MS: 700,
    clock(s) {
        const n = Math.max(0, Math.round(s || 0));
        return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
    },
    insert(ta, text, caret) {
        if (!ta.isConnected) {
            const id = ta.dataset.draft;
            const live = id ? [...document.querySelectorAll("textarea[data-draft]")].find(x => x.dataset.draft === id) : null;
            if (live)
                return Dictate.insert(live, text, null);
            if (!id)
                return;
            const was = Drafts.get(id).text || "";
            return Drafts.set(id, { text: was.trim() ? `${was.replace(/\n?$/, "\n")}${text.trim()}` : text.trim() });
        }
        const v = ta.value;
        let s = v.length, e = v.length, before, after;
        if (caret && caret.value === v)
            ({ start: s, end: e } = caret);
        before = v.slice(0, s);
        after = v.slice(e);
        let words = text.trim();
        if (s === v.length && e === v.length) {
            if (before.trim() && !before.endsWith("\n"))
                words = "\n" + words;
        }
        else {
            if (before && !/\s$/.test(before))
                words = " " + words;
            if (after && !/^\s/.test(after))
                words += " ";
        }
        ta.value = before + words + after;
        const at = before.length + words.length;
        ta.setSelectionRange(at, at);
        ta.dispatchEvent(new Event("input", { bubbles: true }));
    },
    attach(ta, { onState = null, target = null } = {}) {
        const b = T.el("button", { class: "t-btn t-voice", type: "button" }, "DICTATE");
        const say = T.el("div", { class: "t-dictate-say" });
        const el = T.el("div", { class: "t-dictate" }, b, say);
        target = Recordings.target(ta, target);
        if (!Voice.usable()) {
            b.disabled = true;
            b.title = "dictation needs the microphone over https";
        }
        let state = "idle", rec = null, timer = 0, began = 0, pressStarted = false, downAt = 0, stopWanted = false;
        let caret = null, tapped = false;
        const emit = () => onState?.(state, state === "recording" ? (performance.now() - began) / 1000 : 0, tapped);
        const show = (text, cls = "") => { b.textContent = text; b.className = `t-btn t-voice ${cls}`.trim(); };
        const tell = (tone, text, retry) => say.replaceChildren(...(text ? [T.el("p", { class: `t-say ${tone}` }, text, retry ? T.el("button", { class: "t-btn t-dictate-retry", type: "button", onclick: retry }, "RETRY") : null)] : []));
        const tick = () => {
            if (!el.isConnected)
                return rec?.stop();
            show(`● ${Dictate.clock((performance.now() - began) / 1000)} STOP`, "rec");
            emit();
        };
        async function start() {
            state = "arming";
            stopWanted = false;
            tapped = false;
            emit();
            caret = document.activeElement === ta ? { value: ta.value, start: ta.selectionStart, end: ta.selectionEnd } : null;
            tell("", "");
            show("● …", "rec");
            try {
                rec = await Voice.record();
            }
            catch {
                state = "idle";
                show("DICTATE");
                tell("bad", "The microphone wasn't allowed.");
                return emit();
            }
            state = "recording";
            began = performance.now();
            if (stopWanted)
                rec.stop();
            tick();
            timer = setInterval(tick, 500);
            const take = await rec.done;
            clearInterval(timer);
            rec = null;
            if (!take.file.size) {
                state = "idle";
                show("DICTATE");
                tell("bad", "Nothing was recorded.");
                return emit();
            }
            await hear(take);
        }
        async function hear(take) {
            state = "working";
            b.disabled = true;
            tell("", "");
            show("UPLOADING…", "work");
            emit();
            const out = await Recordings.hear(take, target, p => show(p === null ? "TRANSCRIBING…" : `UPLOADING ${Math.round(p * 100)}%`, "work")).catch(() => null);
            state = "idle";
            b.disabled = !Voice.usable();
            show("DICTATE");
            emit();
            const length = Dictate.clock(take.seconds);
            if (!out?.ok) {
                const why = !out ? "The action token wasn't given." : out.reason || "It couldn't be transcribed.";
                tell("", "");
                Recordings.controls(say, out?.recording || out?.pending, () => hear(out?.recording || out?.pending ? Recordings.take(out.recording || out.pending, take.seconds) : take), `${length} not transcribed: ${why} Your text is unchanged.`, take);
                return;
            }
            if (!Recordings.insert(ta, out.text, caret, out.recording, target))
                return;
            caret = null;
            const heard = Dictate.clock(out.seconds ?? take.seconds);
            if (take.cut)
                tell("amber", `Recording stopped at ${heard}: ${take.cut}. What was heard is in the box.`);
            else
                tell("dim", `${heard} · transcribed into the box`);
        }
        Recordings.restore(say, target, take => hear(take));
        const stop = () => { if (state === "recording")
            rec?.stop();
        else if (state === "arming")
            stopWanted = true; };
        b.addEventListener("contextmenu", e => e.preventDefault());
        b.addEventListener("pointerdown", () => {
            downAt = performance.now();
            pressStarted = state === "idle";
            if (pressStarted)
                start();
        });
        b.addEventListener("pointerup", () => {
            if (!pressStarted)
                return;
            if (performance.now() - downAt <= Dictate.HOLD_MS) {
                if (state === "arming" || state === "recording") {
                    tapped = true;
                    emit();
                }
                return;
            }
            if (state === "arming")
                stopWanted = true;
            else
                stop();
        });
        b.addEventListener("click", () => { if (!pressStarted)
            stop(); });
        return { el, busy: () => state !== "idle", stop };
    },
};
