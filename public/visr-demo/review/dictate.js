/* REVIEW · dictate — speak into a text box.

   DICTATE records (voice.js), uploads the recording to the Mac, has it
   transcribed (`intrinsic voice dictate`, tycho/dictation.py) and puts the
   words into the box at the cursor, or on a new line at the end when the box
   wasn't being written in. He reads and edits them before SEND: the audio is
   never attached, and the Mac deletes it once heard, success or failure.

   TAP to start and tap again to stop, or HOLD and let go. While recording
   the button shows the time in red; then UPLOADING and TRANSCRIBING. A
   failure is said under the button, his text untouched, with RETRY while the
   recording is still in memory. A recording that ended by itself says so,
   and what was heard up to then still goes in.

   Leaving the sheet or screen mid-way stops the recording and still keeps
   the words: they go into whichever box now shows the same draft (the
   textarea's `data-draft`), else straight into the saved draft — never
   through a box that is gone, which would overwrite newer text.

     const d = Dictate.attach(textarea);   d.el · d.busy() */
"use strict";

const Dictate = {
  HOLD_MS: 700,

  clock(s) {
    const n = Math.max(0, Math.round(s || 0));
    return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  },

  /* `text` into `ta` at its cursor when it was being written in, else on a
     new line at the end; the box's own input handler saves the draft */
  insert(ta, text, caret) {
    if (!ta.isConnected) {
      const id = ta.dataset.draft;
      const live = id ? [...document.querySelectorAll("textarea[data-draft]")].find(x => x.dataset.draft === id) : null;
      if (live) return Dictate.insert(live, text, null);
      if (!id) return;
      const was = Drafts.get(id).text || "";
      return Drafts.set(id, { text: was.trim() ? `${was.replace(/\n?$/, "\n")}${text.trim()}` : text.trim() });
    }
    const v = ta.value;
    let s = v.length, e = v.length, before, after;
    if (caret && caret.value === v) ({ start: s, end: e } = caret);
    before = v.slice(0, s); after = v.slice(e);
    let words = text.trim();
    if (s === v.length && e === v.length) {
      if (before.trim() && !before.endsWith("\n")) words = "\n" + words;
    } else {
      if (before && !/\s$/.test(before)) words = " " + words;
      if (after && !/^\s/.test(after)) words += " ";
    }
    ta.value = before + words + after;
    const at = before.length + words.length;
    ta.setSelectionRange(at, at);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  },

  attach(ta) {
    const b = T.el("button", { class: "t-btn t-voice", type: "button" }, "DICTATE");
    const say = T.el("div", { class: "t-dictate-say" });
    const el = T.el("div", { class: "t-dictate" }, b, say);
    if (!Voice.usable()) {
      b.disabled = true;
      b.title = "dictation needs the microphone over https";
      return { el, busy: () => false };
    }
    /* idle → arming → recording → working → idle */
    let state = "idle", rec = null, timer = 0, began = 0, pressStarted = false, downAt = 0, stopWanted = false;
    let caret = null;

    const show = (text, cls = "") => { b.textContent = text; b.className = `t-btn t-voice ${cls}`.trim(); };
    const tell = (tone, text, retry) => say.replaceChildren(...(text ? [T.el("p", { class: `t-say ${tone}` }, text,
      retry ? T.el("button", { class: "t-btn t-dictate-retry", type: "button", onclick: retry }, "RETRY") : null)] : []));
    const tick = () => {
      /* the sheet or screen went away under it: finish, and keep the words */
      if (!el.isConnected) return rec?.stop();
      show(`● ${Dictate.clock((performance.now() - began) / 1000)} STOP`, "rec");
    };

    async function start() {
      state = "arming";
      stopWanted = false;
      /* where the words go: his cursor, if he was writing in the box */
      caret = document.activeElement === ta ? { value: ta.value, start: ta.selectionStart, end: ta.selectionEnd } : null;
      tell("", "");
      show("● …", "rec");
      try { rec = await Voice.record(); }
      catch { state = "idle"; show("DICTATE"); return tell("bad", "The microphone wasn't allowed."); }
      state = "recording";
      began = performance.now();
      /* a hold released while the microphone was still opening */
      if (stopWanted) rec.stop();
      tick();
      timer = setInterval(tick, 500);
      const take = await rec.done;
      clearInterval(timer);
      rec = null;
      if (!take.file.size) { state = "idle"; show("DICTATE"); return tell("bad", "Nothing was recorded."); }
      await hear(take);
    }

    async function hear(take) {
      state = "working";
      b.disabled = true;
      tell("", "");
      show("UPLOADING…", "work");
      const up = await Tycho.auth(() => Wire.upload(take.file, take.file.name,
        p => show(`UPLOADING ${Math.round(p * 100)}%`, "work"))).catch(() => null);
      let out = up;
      if (up?.ok) {
        show("TRANSCRIBING…", "work");
        out = await Tycho.auth(() => Wire.dictate(up.path)).catch(() => null);
        /* the Mac deletes a recording it was asked about; one the request
           never reached is discarded here (RETRY uploads it again) */
        if (!out?.ok) Wire.discard(up.path).catch(() => {});
      }
      state = "idle";
      b.disabled = false;
      show("DICTATE");
      const length = Dictate.clock(take.seconds);
      if (!out?.ok) {
        const why = !out ? "The action token wasn't given." : out.reason || "It couldn't be transcribed.";
        /* a fault on the Mac can be retried from the copy in memory; a runtime
           without dictation can't, until it is updated */
        return tell("bad", `${length} not transcribed: ${why} Your text is unchanged.`,
          out?.code === "unsupported" ? null : () => hear(take));
      }
      Dictate.insert(ta, out.text, caret);
      caret = null;
      const heard = Dictate.clock(out.seconds ?? take.seconds);
      if (take.cut) tell("amber", `Recording stopped at ${heard}: ${take.cut}. What was heard is in the box.`);
      else tell("dim", `${heard} · transcribed into the box`);
    }

    const stop = () => { if (state === "recording") rec?.stop(); };
    b.addEventListener("contextmenu", e => e.preventDefault());
    b.addEventListener("pointerdown", () => {
      downAt = performance.now();
      pressStarted = state === "idle";
      if (pressStarted) start();
    });
    /* a hold that started the recording ends it on release; a quick tap
       leaves it running until the next tap */
    b.addEventListener("pointerup", () => {
      if (!pressStarted || performance.now() - downAt <= Dictate.HOLD_MS) return;
      if (state === "arming") stopWanted = true;
      else stop();
    });
    b.addEventListener("click", () => { if (!pressStarted) stop(); });
    return { el, busy: () => state !== "idle" };
  },
};
