"use strict";
const ChatLinks = {
    catch(root, follow) {
        root.addEventListener("click", e => {
            const a = e.target.closest?.('a[href^="#item="], a[href^="#sfile="]');
            if (!a || !root.contains(a))
                return;
            const link = DeepLink.parse(a.getAttribute("href"));
            if (!link)
                return;
            e.preventDefault();
            follow(link);
        });
    },
    image(id) {
        const all = Thread.images();
        let at = all.findIndex(a => a.id === id);
        const set = at < 0 ? [{ id, name: "image" }] : all;
        at = Math.max(0, at);
        const urls = new Map();
        const load = i => {
            const a = set[i];
            if (!urls.has(a.id))
                urls.set(a.id, SuptWire.image(a.id).catch(e => { urls.delete(a.id); throw e; }));
            return urls.get(a.id);
        };
        const entry = SuptDock.on;
        if (entry)
            Nav.push({ ...(history.state || {}), viewer: true });
        return Tycho.viewer({ count: set.length, start: at, caption: i => set[i].name || "image", load,
            onClose: () => {
                for (const p of urls.values())
                    p.then(u => URL.revokeObjectURL(u), () => { });
                if (entry && history.state?.viewer)
                    history.back();
            } });
    },
};
