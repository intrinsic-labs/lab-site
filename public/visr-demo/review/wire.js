"use strict";
const Wire = {
    list: () => T.api("/api/review"),
    telemetry: () => T.api("/api/telemetry"),
    monday: date => Wire.read(date ? `/api/monday?date=${encodeURIComponent(date)}` : "/api/monday"),
    stop: () => Wire.post("/api/stop", {}, { token: true }),
    async read(path) {
        let got;
        try {
            got = await Net.fetch(path, { cache: "no-cache" }, Net.READ_MS);
        }
        catch (e) {
            return Wire.lost(e, false);
        }
        return Wire.answer(got.r, got.text);
    },
    async post(path, body, { token = false, ms = Net.WRITE_MS } = {}) {
        let got;
        try {
            got = await Net.fetch(path, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(token ? { token: Tycho.token(), ...body } : body),
            }, ms);
        }
        catch (e) {
            return Wire.lost(e, true);
        }
        return Wire.answer(got.r, got.text);
    },
    lost(e, write) {
        if (e.net === "offline")
            return { ok: false, code: "offline", reason: "Connection lost. The request never reached the Mac." };
        if (write)
            return { ok: false, code: "unknown",
                reason: "No answer from the Mac. It may still have gone through, so check before sending again." };
        return { ok: false, code: "timeout", reason: e.net === "cut" ? "Connection lost. The answer was cut off."
                : "The Mac didn't answer in time." };
    },
    answer(r, text) {
        let out = {};
        try {
            out = JSON.parse(text || "{}");
        }
        catch { }
        if (r.status === 401)
            throw new Error(out.error || "bad token");
        if (r.status === 403)
            return { ok: false, code: "identity",
                reason: "This device isn't allowed to use this desk." };
        if (!out.ok && !out.reason)
            out.reason = out.error || r.statusText || `The Mac answered ${r.status}.`;
        return out;
    },
    act: body => Wire.post("/api/review", { verb: "act", ...body }, { token: true }),
    settings: () => Wire.read("/api/settings"),
    settingsWrite: body => Wire.post("/api/settings", { verb: "write", ...body }, { token: true }),
    docList: path => Wire.post("/api/doc", { verb: "list", path }),
    docRead: path => Wire.post("/api/doc", { verb: "read", path }),
    docSave: body => Wire.post("/api/doc", { verb: "save", ...body }, { token: true }),
    projects: () => Wire.post("/api/intake", { verb: "projects" }),
    file: body => Wire.post("/api/intake", { verb: "file", ...body }, { token: true }),
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
            x.upload.onprogress = e => { if (e.lengthComputable)
                onProgress?.(e.loaded / e.total); };
            x.onerror = () => resolve({ ok: false, reason: "Connection lost while uploading." });
            x.onload = () => {
                try {
                    resolve(Wire.answer({ status: x.status, statusText: x.statusText }, x.responseText));
                }
                catch (e) {
                    reject(e);
                }
            };
            x.send(file);
            watch();
        });
    },
    dictate: path => Wire.post("/api/voice/dictate", typeof path === "string" ? { path } : path, { token: true, ms: Net.LONG_MS }),
    recordings: () => Wire.read("/api/voice/recordings"),
    recover: (path, target) => Wire.post("/api/voice/recover", { path, target }, { token: true }),
    forgetRecording: id => Wire.post("/api/voice/forget", { id }, { token: true }),
    discard: path => Wire.post("/api/upload/discard", { path }, { token: true }),
    reach: (key, url) => Wire.read(`/api/review/reach?key=${encodeURIComponent(key)}&url=${encodeURIComponent(url)}`),
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
                try {
                    const j = await r.json();
                    why = j.reason || j.error || why;
                }
                catch { }
                throw new Error(why);
            }
            return URL.createObjectURL(await r.blob());
        }
        catch (e) {
            if (signal?.aborted)
                throw e;
            if (ctl.signal.aborted)
                throw new Error("The Mac didn't send the image in time.", { cause: e });
            throw e;
        }
        finally {
            clearTimeout(timer);
            signal?.removeEventListener("abort", relay);
        }
    },
};
