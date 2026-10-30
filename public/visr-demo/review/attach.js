"use strict";
const Attach = {
    inFlight: {},
    MAX_FILE: 25 * 1024 * 1024, MAX_FILES: 10, MAX_TOTAL: 50 * 1024 * 1024,
    ACCEPT: "image/*,audio/*,video/*,application/pdf,*/*",
    tray(draftId) {
        let files = Drafts.get(draftId).files || [];
        const flight = Attach.inFlight[draftId] ||= { n: 0, bytes: 0 };
        const chips = T.el("div", { class: "t-chips" });
        const say = T.el("div", { class: "t-attach-say" });
        const keep = () => Drafts.set(draftId, { files });
        const picker = capture => {
            const input = T.el("input", { type: "file", accept: capture ? "image/*" : this.ACCEPT,
                multiple: capture ? null : "", capture: capture ? "environment" : null, hidden: "" });
            input.onchange = () => { [...input.files].forEach(add); input.value = ""; };
            return input;
        };
        const photoIn = picker(true), fileIn = picker(false);
        const total = () => files.reduce((n, f) => n + (f.size || 0), 0);
        const refuse = msg => { say.textContent = msg; setTimeout(() => { say.textContent = ""; }, 6000); };
        async function add(file) {
            if (files.length + flight.n >= Attach.MAX_FILES)
                return refuse(`At most ${Attach.MAX_FILES} attachments.`);
            if (!file.size)
                return refuse(`${file.name} is empty, so it wasn't attached.`);
            if (file.size > Attach.MAX_FILE)
                return refuse(`${file.name} is over 25 MB.`);
            if (total() + flight.bytes + file.size > Attach.MAX_TOTAL)
                return refuse("Together the attachments would be over 50 MB.");
            flight.n++;
            flight.bytes += file.size;
            const chip = Attach.chip({ name: file.name, size: file.size, contentType: file.type }, null);
            chip.classList.add("up");
            chips.append(chip);
            const bar = chip.querySelector(".t-chip-meta");
            const sending = Tycho.auth(() => Wire.upload(file, file.name, p => { bar.textContent = `UPLOADING ${Math.round(p * 100)}%`; }));
            const thumb = await Attach.thumb(file);
            if (thumb && chip.isConnected)
                chip.querySelector(".t-chip-ico")?.replaceWith(T.el("img", { class: "t-chip-img", src: thumb, alt: "" }));
            const out = await sending;
            flight.n--;
            flight.bytes -= file.size;
            chip.remove();
            if (!out?.ok)
                return refuse(out ? `Couldn't attach ${file.name}: ${out.reason}` : "Not attached — the action token wasn't given.");
            files = [...(Drafts.get(draftId).files || []), { path: out.path, name: out.name, contentType: out.contentType, size: out.size, thumb }];
            keep();
            draw();
            window.dispatchEvent(new CustomEvent("attach:changed", { detail: draftId }));
        }
        function draw() {
            chips.replaceChildren(...files.map(f => Attach.chip(f, () => {
                files = files.filter(x => x.path !== f.path);
                keep();
                draw();
                Tycho.auth(() => Wire.discard(f.path)).catch(() => { });
            })));
        }
        const resync = e => {
            if (!el.isConnected)
                return window.removeEventListener("attach:changed", resync);
            if (e.detail === draftId) {
                files = Drafts.get(draftId).files || [];
                draw();
            }
        };
        window.addEventListener("attach:changed", resync);
        const el = T.el("div", { class: "t-attach" }, T.el("div", { class: "t-row" }, T.el("button", { class: "t-btn", type: "button", onclick: () => photoIn.click() }, "PHOTO"), T.el("button", { class: "t-btn", type: "button", onclick: () => fileIn.click() }, "FILE"), photoIn, fileIn), chips, say);
        draw();
        return { el, files: () => files.map(({ path, name, contentType }) => ({ path, name, contentType })),
            busy: () => flight.n > 0, count: () => files.length,
            clear: paths => {
                const gone = new Set(paths);
                files = (Drafts.get(draftId).files || []).filter(f => !gone.has(f.path));
                keep();
                draw();
                window.dispatchEvent(new CustomEvent("attach:changed", { detail: draftId }));
            } };
    },
    chip(f, remove) {
        const kind = String(f.contentType || "").split("/")[0];
        const ico = f.thumb ? T.el("img", { class: "t-chip-img", src: f.thumb, alt: "" })
            : T.el("span", { class: "t-chip-ico" }, kind === "audio" ? "♪" : kind === "video" ? "▶" : kind === "image" ? "▣" : "▤");
        return T.el("div", { class: "t-file" }, ico, T.el("span", { class: "t-chip-text" }, T.el("span", { class: "t-chip-name" }, String(f.name)), T.el("span", { class: "t-chip-meta t-foot" }, Fmt.size(f.size || 0))), remove ? T.el("button", { class: "t-x", type: "button", "aria-label": `remove ${f.name}`, onclick: remove }, "×") : null);
    },
    async thumb(file, size = 96) {
        if (!/^image\//.test(file.type))
            return null;
        if (window.createImageBitmap) {
            try {
                const bmp = await createImageBitmap(file);
                const s = size / Math.max(bmp.width, bmp.height);
                const c = document.createElement("canvas");
                c.width = Math.max(1, Math.round(bmp.width * s));
                c.height = Math.max(1, Math.round(bmp.height * s));
                c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
                bmp.close();
                return c.toDataURL("image/jpeg", 0.7);
            }
            catch { }
        }
        return new Promise(resolve => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                const s = size / Math.max(img.width, img.height);
                const c = document.createElement("canvas");
                c.width = Math.max(1, Math.round(img.width * s));
                c.height = Math.max(1, Math.round(img.height * s));
                c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
                URL.revokeObjectURL(url);
                try {
                    resolve(c.toDataURL("image/jpeg", 0.7));
                }
                catch {
                    resolve(null);
                }
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
            img.src = url;
        });
    },
};
