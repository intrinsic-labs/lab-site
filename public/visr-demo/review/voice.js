/* REVIEW · voice — one recording from the phone's microphone.

     const r = await Voice.record();   // throws when the mic isn't allowed
     r.stop();                         // he is done
     const { file, seconds, cut } = await r.done;

   `done` resolves however the recording ends, with every chunk in the file:
   the last one is asked for before stopping, and the file is built only in
   `onstop`, which the browser fires after the final chunk. `cut` is null when
   he stopped it and a sentence when it ended by itself — the microphone
   taken or muted by a call or another app, the screen going off — so the caller can
   say so instead of carrying on as if it were still listening (the lost tail
   of 2026-10-05: the recorder ended, the button kept counting, and the rest
   of the sentence went nowhere). The screen is held awake while recording.

   The file is audio/webm with opus where the browser has it, else audio/mp4.
   Recording needs a secure origin and the microphone permission. */
"use strict";

const Voice = {
  TYPES: ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"],
  type() {
    if (!window.MediaRecorder) return null;
    return this.TYPES.find(t => MediaRecorder.isTypeSupported?.(t)) || "";
  },
  usable() { return Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder); },

  async record() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = this.type();
    let rec;
    try { rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); }
    catch (e) { stream.getTracks().forEach(t => t.stop()); throw e; }
    const chunks = [];
    const began = performance.now();
    let asked = false, cut = null, lock = null, ended = 0;

    const awake = async () => {
      if (document.visibilityState !== "visible" || rec.state === "inactive" || (lock && !lock.released)) return;
      try { lock = await navigator.wakeLock?.request("screen"); } catch { lock = null; }
    };
    /* the browser drops a wake lock while the page is hidden; take it back on return */
    document.addEventListener("visibilitychange", awake);

    const done = new Promise(resolve => {
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onerror = () => { cut ||= "the recorder failed"; };
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        document.removeEventListener("visibilitychange", awake);
        lock?.release?.().catch(() => {});
        const type = (rec.mimeType || mime || "audio/webm").split(";")[0];
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const at = new Date().toTimeString().slice(0, 8).replace(/:/g, "");
        resolve({
          file: new File(chunks, `voice-note-${at}.${ext}`, { type }),
          seconds: ((ended || performance.now()) - began) / 1000,
          cut: asked ? null : (cut || "it stopped by itself"),
        });
      };
    });
    const lost = why => {
      ended ||= performance.now();
      cut ||= why;
      if (rec.state !== "inactive") rec.stop();
    };
    for (const track of stream.getAudioTracks()) {
      track.addEventListener("ended", () => lost("the microphone was taken away (a call, another app, or the screen going off)"));
      /* a call mutes the track and the recorder would go on taking silence;
         a mute that lasts is an interruption, a blip (a route change) is not */
      let muted = 0;
      track.addEventListener("mute", () => {
        clearTimeout(muted);
        muted = setTimeout(() => { if (track.muted) lost("the microphone was interrupted (a call or another app)"); }, 1500);
      });
      track.addEventListener("unmute", () => clearTimeout(muted));
    }

    rec.start(1000);
    awake();
    return {
      done,
      stop() {
        if (rec.state === "inactive") return;
        asked = true;
        ended ||= performance.now();
        try { rec.requestData(); } catch { /* stop() flushes it anyway */ }
        rec.stop();
      },
    };
  },
};
