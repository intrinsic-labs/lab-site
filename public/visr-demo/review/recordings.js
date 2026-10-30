"use strict";
const Recordings = {
    target(ta, target) {
        if (target)
            return target;
        const draft = ta.dataset.draft;
        let version = Drafts.get(draft).dictationVersion;
        if (!version) {
            version = crypto.randomUUID();
            Drafts.set(draft, { dictationVersion: version });
            Drafts.write();
        }
        return { draft, version };
    },
    pending(entry, add) {
        const id = entry.target.draft;
        const kept = (Drafts.get(id).dictationUploads || []).filter(x => x.id !== entry.id);
        Drafts.set(id, { dictationUploads: add ? [...kept, entry] : kept });
        Drafts.write();
    },
    take(entry, seconds = 0) {
        return entry.status === "uploaded" ? { staged: entry, seconds } : { recording: entry, seconds };
    },
    async hear(take, target, progress) {
        let entry = take.recording, pending = take.staged;
        if (!entry) {
            if (!pending) {
                const started = Date.now() / 1000;
                const up = await Tycho.auth(() => Wire.upload(take.file, take.file.name, progress));
                if (!up?.ok)
                    return up;
                pending = { id: up.path.split("/").at(-2), path: up.path, name: up.name, target,
                    status: "uploaded", expiresAt: started + 24 * 3600 };
                Recordings.pending(pending, true);
            }
            const saved = await Tycho.auth(() => Wire.recover(pending.path, target)).catch(() => null);
            entry = saved?.recording;
            if (!entry) {
                const known = await Wire.recordings().catch(() => null);
                entry = known?.recordings?.find(x => x.id === pending.id);
            }
            if (!entry)
                return { ...saved, ok: false, pending, reason: saved?.reason || "The uploaded recording could not be saved for transcription." };
            Recordings.pending(pending, false);
        }
        progress?.(null);
        const out = await Tycho.auth(() => Wire.dictate({ recordingId: entry.id })).catch(() => ({ ok: false, reason: "The action token was not given." }));
        return { ...out, recording: out?.recording || entry };
    },
    expiry(entry) {
        return new Date(entry.expiresAt * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    },
    controls(host, entry, retry, reason = "Saved recording", take = null) {
        const row = T.el("div", { class: "t-note amber t-recording-recovery", role: "status" }, T.el("p", {}, entry ? `${reason} Audio saved on the Mac until ${Recordings.expiry(entry)}, unless its text is restored or you discard it.`
            : `${reason} Keep this page open or save the audio before leaving.`));
        const actions = T.el("div", { class: "t-recording-actions" });
        if (retry)
            actions.append(T.el("button", { class: "t-btn tiny t-dictate-retry t-chat-retry", type: "button",
                onclick: () => { row.remove(); retry(); } }, entry?.status === "transcribed" ? "RESTORE TEXT" : "RETRY"));
        const url = entry ? entry.path ? `/api/voice/audio?path=${encodeURIComponent(entry.path)}`
            : `/api/voice/audio?id=${encodeURIComponent(entry.id)}` : URL.createObjectURL(take.file);
        actions.append(T.el("a", { class: "t-btn tiny", href: url, download: entry?.name || take.file.name }, "SAVE AUDIO"));
        actions.append(T.el("button", { class: "t-btn tiny", type: "button", onclick: async () => {
                const out = entry ? await Tycho.auth(() => entry.path ? Wire.discard(entry.path) : Wire.forgetRecording(entry.id)).catch(() => null) : { ok: true };
                if (out?.ok) {
                    row.remove();
                    if (!entry)
                        URL.revokeObjectURL(url);
                    else if (entry.path)
                        Recordings.pending(entry, false);
                }
                else
                    row.append(T.el("p", {}, out?.reason || "The recording couldn't be discarded."));
            } }, "DISCARD"));
        row.append(actions);
        host.append(row);
    },
    async restore(host, target, retry) {
        const out = await Wire.recordings().catch(() => null);
        const entries = out?.recordings || [];
        for (const pending of Drafts.get(target.draft).dictationUploads || []) {
            if (entries.some(x => x.id === pending.id) || pending.expiresAt * 1000 <= Date.now())
                Recordings.pending(pending, false);
            else
                entries.push(pending);
        }
        for (const entry of entries) {
            if (entry.target.draft !== target.draft)
                continue;
            const same = target.key ? entry.target.key === target.key && entry.target.revision === target.revision
                : !entry.target.version || entry.target.version === target.version;
            Recordings.controls(host, entry, same ? () => retry(Recordings.take(entry)) : null, same ? "Unfinished dictation." : `This recording belongs to an earlier ${target.key ? "version of this card" : "chat draft"}. Save its audio before discarding it.`);
        }
    },
    insert(ta, text, caret, entry, target) {
        if (target.key && !ta.isConnected)
            return false;
        if (target.version && Drafts.get(target.draft).dictationVersion !== target.version)
            return false;
        const id = target.draft;
        const done = Drafts.get(id).dictationApplied || [];
        if (!done.includes(entry.id)) {
            Dictate.insert(ta, text, caret);
            Drafts.set(id, { dictationApplied: [...done, entry.id] });
            Drafts.write();
        }
        if (Store.set(Drafts.KEY, Drafts.all()))
            Tycho.auth(() => Wire.forgetRecording(entry.id)).catch(() => { });
        return true;
    },
};
