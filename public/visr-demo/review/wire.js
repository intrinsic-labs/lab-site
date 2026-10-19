/* REVIEW · the wire — everything the desk says to the Mac.

   IntrinsicOS owns the queue and every rule for acting on it; tycho/review.py,
   docs.py, uploads.py and intake.py relay. Nothing here decides anything.

   One answer shape for every write: an object with `ok`, and on a refusal a
   `reason` and the runtime's `code` (`stale`, `gone`, …) intact. A write
   throws ONLY on 401, so `Tycho.auth` can ask for the token and retry. */
"use strict";

const Wire = {
  list: () => T.api("/api/review"),
  /* the telemetry board (tycho/telemetry.py) */
  telemetry: () => T.api("/api/telemetry"),
  /* one Monday meeting (tycho/monday.py), the latest without a date; a
     refusal keeps its `code` (`unsupported` for a runtime without the verb) */
  monday: date => Wire.read(date ? `/api/monday?date=${encodeURIComponent(date)}` : "/api/monday"),
  /* PANIC (tycho/stop.py): engages the kill switch, `{ok, engaged, reason,
     engagedAt, alreadyEngaged}`; a write, so it rides the action token */
  stop: () => Wire.post("/api/stop", {}, { token: true }),

  /* a read whose refusal is an answer, `{ok: false, reason, code}` */
  async read(path) {
    let got;
    try { got = await Net.fetch(path, { cache: "no-cache" }, Net.READ_MS); }
    catch (e) { return Wire.lost(e, false); }
    return Wire.answer(got.r, got.text);
  },

  /* `ms`: the deadline (net.js); a write's default sits above the server's
     own longest relay */
  async post(path, body, { token = false, ms = Net.WRITE_MS } = {}) {
    let got;
    try {
      got = await Net.fetch(path, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { token: Tycho.token(), ...body } : body),
      }, ms);
    } catch (e) { return Wire.lost(e, true); }
    return Wire.answer(got.r, got.text);
  },

  /* a request that got no full answer, as a refusal. A write that timed out
     or was cut off may still have been applied on the Mac, and says so. */
  lost(e, write) {
    if (e.net === "offline") return { ok: false, code: "offline", reason: "Connection lost. The request never reached the Mac." };
    if (write) return { ok: false, code: "unknown",
      reason: "No answer from the Mac. It may still have gone through, so check before sending again." };
    return { ok: false, code: "timeout", reason: e.net === "cut" ? "Connection lost. The answer was cut off."
      : "The Mac didn't answer in time." };
  },

  answer(r, text) {
    let out = {};
    try { out = JSON.parse(text || "{}"); } catch { out = {}; }
    if (r.status === 401) throw new Error(out.error || "bad token");
    if (r.status === 403)
      return { ok: false, code: "identity",
               reason: "This device isn't signed in to Tailscale as Asher." };
    if (!out.ok && !out.reason)
      out.reason = out.error || r.statusText || `The Mac answered ${r.status}.`;
    return out;
  },

  act: body => Wire.post("/api/review", { verb: "act", ...body }, { token: true }),
  /* the settings screen (tycho/settings.py): a refusal keeps its `code`
     (`unsupported` for a runtime without the verb) rather than throwing */
  settings: () => Wire.read("/api/settings"),
  settingsWrite: body => Wire.post("/api/settings", { verb: "write", ...body }, { token: true }),
  docRead: path => Wire.post("/api/doc", { verb: "read", path }),
  docSave: body => Wire.post("/api/doc", { verb: "save", ...body }, { token: true }),
  projects: () => Wire.post("/api/intake", { verb: "projects" }),
  file: body => Wire.post("/api/intake", { verb: "file", ...body }, { token: true }),

  /* One file → its staged copy on the Mac, `{ok, path, name, contentType,
     size}`. XHR rather than fetch for the upload progress a phone link
     needs to show. A link that stops moving is given up on: no progress for
     STALL_MS while sending, or no answer STALL_MS after the last byte. */
  STALL_MS: 45_000,
  upload(file, name, onProgress) {
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      let stall = 0;
      const watch = () => {
        clearTimeout(stall);
        stall = setTimeout(() => { x.abort(); resolve({ ok: false, code: "timeout", reason: "The upload stalled. Try again on a better connection." }); }, Wire.STALL_MS);
      };
      x.addEventListener("loadend", () => clearTimeout(stall));
      x.upload.addEventListener("progress", watch);
      x.upload.addEventListener("load", watch);
      x.open("POST", "/api/upload");
      x.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      x.setRequestHeader("X-File-Name", encodeURIComponent(name || file.name || "attachment"));
      x.setRequestHeader("X-Tycho-Token", Tycho.token());
      x.upload.onprogress = e => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
      x.onerror = () => resolve({ ok: false, reason: "Connection lost while uploading." });
      x.onload = () => {
        try { resolve(Wire.answer({ status: x.status, statusText: x.statusText }, x.responseText)); }
        catch (e) { reject(e); }
      };
      x.send(file);
      watch();
    });
  },

  /* a staged recording → its words, `{ok, text, seconds}`; the Mac deletes
     the recording either way (tycho/dictation.py) */
  dictate: path => Wire.post("/api/voice/dictate", { path }, { token: true, ms: Net.LONG_MS }),

  /* a staged file he removed before sending */
  discard: path => Wire.post("/api/upload/discard", { path }, { token: true }),

  /* is a link the item lists answering right now? `{ok, reachable, status?,
     reason?}` (tycho/reach.py) */
  reach: (key, url) => Wire.read(`/api/review/reach?key=${encodeURIComponent(key)}&url=${encodeURIComponent(url)}`),

  /* an image an item named → an object URL the caller revokes */
  async image(key, ref, { signal } = {}) {
    const q = `key=${encodeURIComponent(key)}&ref=${encodeURIComponent(ref)}`;
    const ctl = new AbortController();
    const relay = () => ctl.abort();
    signal?.addEventListener("abort", relay, { once: true });
    const timer = setTimeout(() => ctl.abort(), Net.READ_MS);
    try {
      const r = await fetch(`/api/review/artifact?${q}`, { cache: "no-cache", signal: ctl.signal });
      if (!r.ok) {
        let why = `HTTP ${r.status}`;
        try { const j = await r.json(); why = j.reason || j.error || why; } catch { /* bytes */ }
        throw new Error(why);
      }
      return URL.createObjectURL(await r.blob());
    } catch (e) {
      if (signal?.aborted) throw e;
      if (ctl.signal.aborted) throw new Error("The Mac didn't send the image in time.");
      throw e;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", relay);
    }
  },
};
