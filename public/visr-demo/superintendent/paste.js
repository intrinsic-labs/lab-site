"use strict";
const ChatPaste = {
    catch(field, add) {
        field.addEventListener("paste", e => {
            const files = this.files(e.clipboardData);
            if (!files.length)
                return;
            e.preventDefault();
            add(files);
        });
    },
    files(data) {
        if (!data)
            return [];
        const types = [...(data.types || [])];
        let files = [...(data.files || [])];
        if (!files.length)
            files = [...(data.items || [])].filter(i => i.kind === "file").map(i => i.getAsFile()).filter(Boolean);
        if (!files.length)
            return [];
        const words = types.includes("text/plain") && types.includes("text/html") && data.getData("text/plain").trim();
        if (words)
            return [];
        return files.map((f, i) => this.named(f, i));
    },
    named(file, i) {
        if (file.name && !/^image\.\w+$/i.test(file.name))
            return file;
        const ext = (file.type.split("/")[1] || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "bin";
        const d = new Date(), z = n => String(n).padStart(2, "0");
        const stamp = `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`;
        return new File([file], `pasted-${stamp}${i ? `-${i + 1}` : ""}.${ext === "jpeg" ? "jpg" : ext}`, { type: file.type, lastModified: file.lastModified });
    },
};
