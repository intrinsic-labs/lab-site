"use strict";
const DeepLink = {
    parse(hash) {
        const h = String(hash || "").replace(/^#/, "");
        if (h === "board")
            return { board: true };
        if (h === "monday")
            return { monday: "" };
        if (h === "chat" || h === "chat=")
            return { chat: "" };
        const chat = /^chat=(.+)$/.exec(h);
        if (chat) {
            try {
                const id = decodeURIComponent(chat[1]).trim();
                const control = [...id].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
                return id && id.length <= 200 && !control ? { chat: id } : null;
            }
            catch {
                return null;
            }
        }
        const day = /^monday=(\d{4}-\d{2}-\d{2})$/.exec(h);
        if (day)
            return { monday: day[1] };
        const file = /^sfile=(f_[A-Za-z0-9._:-]{1,126})$/.exec(h);
        if (file)
            return { sfile: file[1] };
        const m = /^item=(.+?)(?:&shot=(\d{1,4}))?$/.exec(h);
        if (!m)
            return null;
        try {
            const key = decodeURIComponent(m[1]).trim();
            if (!key)
                return null;
            const shot = m[2] ? parseInt(m[2], 10) : 0;
            return shot > 0 ? { item: key, shot } : { item: key };
        }
        catch {
            return null;
        }
    },
    take() {
        const link = this.parse(location.hash);
        if (link)
            history.replaceState(history.state, "", location.pathname + location.search);
        return link;
    },
};
