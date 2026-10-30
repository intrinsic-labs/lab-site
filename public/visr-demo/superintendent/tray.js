"use strict";
const ChatTray = {
    THUMB: 192,
    create(draftId, { peek, changed }) {
        let { files = [], cards = [] } = Drafts.get(draftId);
        const uploading = [];
        const el = T.el("div", { class: "t-chat-tray" });
        const say = T.el("p", { class: "t-chat-say amber", role: "status" });
        const keep = () => { Drafts.set(draftId, { files, cards }); draw(); changed(); };
        const input = (accept, opts = {}) => {
            const i = T.el("input", { type: "file", accept, hidden: "", ...opts });
            i.onchange = () => { [...i.files].forEach(add); i.value = ""; };
            return i;
        };
        const pickIn = input(Attach.ACCEPT, { multiple: "" });
        const refuse = msg => { say.textContent = msg; setTimeout(() => { if (say.textContent === msg)
            say.textContent = ""; }, 6000); };
        const total = () => files.reduce((n, f) => n + (f.size || 0), 0);
        async function add(file) {
            if (files.length + uploading.length >= Attach.MAX_FILES)
                return refuse(`At most ${Attach.MAX_FILES} attachments.`);
            if (file.size > Attach.MAX_FILE)
                return refuse(`${file.name} is over 25 MB.`);
            if (total() + file.size > Attach.MAX_TOTAL)
                return refuse("Together the attachments would be over 50 MB.");
            const up = { name: file.name, size: file.size, contentType: file.type, thumb: null, pct: 0 };
            uploading.push(up);
            draw();
            changed();
            const sending = Tycho.auth(() => Wire.upload(file, file.name, p => { up.pct = p; up.bar && (up.bar.textContent = `${Math.round(p * 100)}%`); }));
            up.thumb = await Attach.thumb(file, ChatTray.THUMB);
            draw();
            const out = await sending.catch(() => null);
            uploading.splice(uploading.indexOf(up), 1);
            if (!out?.ok) {
                draw();
                changed();
                return refuse(out ? `Couldn't attach ${file.name}: ${out.reason}` : "Not attached: the action token wasn't given.");
            }
            files = [...files, { path: out.path, name: out.name, contentType: out.contentType, size: out.size, thumb: up.thumb }];
            keep();
        }
        const drop = f => {
            files = files.filter(x => x.path !== f.path);
            keep();
            Tycho.auth(() => Wire.discard(f.path)).catch(() => { });
        };
        const unCard = c => { cards = cards.filter(x => x.key !== c.key); keep(); };
        const ext = name => (String(name).match(/\.([A-Za-z0-9]{1,5})$/)?.[1] || "FILE").toUpperCase();
        const fileTile = (f, remove) => {
            const image = /^image\//.test(f.contentType || "") && f.thumb;
            const tile = image
                ? T.el("span", { class: "t-att photo" }, T.el("img", { src: f.thumb, alt: f.name }))
                : T.el("span", { class: "t-att file" }, T.el("span", { class: "t-att-ext" }, ext(f.name)), T.el("span", { class: "t-att-name" }, String(f.name)));
            if (remove)
                tile.append(CardRef.x(f.name, remove));
            return tile;
        };
        function draw() {
            const tiles = [];
            if (files.length || uploading.length) {
                for (const f of files)
                    tiles.push(fileTile(f, () => drop(f)));
                for (const u of uploading) {
                    const t = fileTile(u, null);
                    t.classList.add("up");
                    u.bar = T.el("span", { class: "t-att-up t-foot" }, `${Math.round(u.pct * 100)}%`);
                    t.append(u.bar);
                    tiles.push(t);
                }
                for (const c of cards)
                    tiles.push(CardRef.tile(c, { peek, remove: () => unCard(c) }));
                el.replaceChildren(T.el("div", { class: "t-chat-atts", "aria-label": "Attached" }, ...tiles));
            }
            else if (cards.length) {
                el.replaceChildren(T.el("div", { class: "t-chat-pills" }, ...cards.map(c => CardRef.pill(c, { peek, remove: () => unCard(c) }))));
            }
            else
                el.replaceChildren();
        }
        draw();
        return {
            el, say, inputs: [pickIn],
            pick: () => pickIn.click(),
            addFiles: list => [...list].forEach(add),
            has: key => cards.some(c => c.key === key),
            addCard(card) { if (!cards.some(c => c.key === card.key)) {
                cards = [...cards, card];
                keep();
            } },
            payload: () => ({
                attachments: files.map(({ path, name, contentType }) => ({ path, name, type: contentType })),
                cards: cards.map(c => CardRef.wire(c)),
            }),
            count: () => files.length + cards.length,
            busy: () => uploading.length > 0,
            snapshot: () => ({ files, cards }),
            clear() { files = []; cards = []; keep(); },
            restore(d) { files = d.files || []; cards = d.cards || []; keep(); },
        };
    },
};
