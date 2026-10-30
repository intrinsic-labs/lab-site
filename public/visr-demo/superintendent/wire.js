"use strict";
const SuptWire = {
    send: body => Wire.post("/api/superintendent/send", body, { token: true }),
    thread(after, thread, subject) {
        const q = [after ? `after=${encodeURIComponent(after)}` : "", thread ? `thread=${encodeURIComponent(thread)}` : "",
            thread && subject ? `subject=${encodeURIComponent(subject)}` : ""].filter(Boolean);
        return Wire.read(`/api/superintendent/thread${q.length ? `?${q.join("&")}` : ""}`);
    },
    actions(before, limit) {
        const q = [before ? `before=${encodeURIComponent(before)}` : "", limit ? `limit=${encodeURIComponent(limit)}` : ""].filter(Boolean);
        return Wire.read(`/api/superintendent/actions${q.length ? `?${q.join("&")}` : ""}`);
    },
    undo: ref => Wire.post("/api/superintendent/undo", ref, { token: true }),
    decide: body => Wire.post("/api/superintendent/decide", body, { token: true }),
    mode: () => Wire.read("/api/superintendent/mode"),
    setMode: mode => Wire.post("/api/superintendent/mode", { mode }, { token: true }),
    fileUrl: id => `/api/superintendent/file?id=${encodeURIComponent(id)}`,
    speechUrl: (id, part) => `/api/superintendent/speech?id=${encodeURIComponent(id)}${part == null ? "" : `&part=${part}`}`,
    async image(id) {
        let got;
        try {
            got = await fetch(this.fileUrl(id), { cache: "no-cache" });
        }
        catch {
            throw new Error("The Mac didn't send the image.");
        }
        if (!got.ok) {
            let why = `HTTP ${got.status}`;
            try {
                const j = await got.json();
                why = j.reason || j.error || why;
            }
            catch { }
            throw new Error(why);
        }
        return URL.createObjectURL(await got.blob());
    },
};
