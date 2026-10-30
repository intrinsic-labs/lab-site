"use strict";
const Messages = {
    GAP_MS: 30 * 60_000,
    split(prev, m) {
        if (!prev)
            return true;
        const a = new Date(prev.at), b = new Date(m.at);
        if (isNaN(a) || isNaN(b))
            return false;
        return b - a >= this.GAP_MS || a.toDateString() !== b.toDateString();
    },
    when(at) {
        const day = this.day(at);
        return day && `${day} ${this.clock(at)}`;
    },
    clock(at) {
        const d = new Date(at);
        return isNaN(d) ? "" : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    },
    day(at) {
        const d = new Date(at);
        if (isNaN(d))
            return "";
        const day = new Date(d);
        day.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const back = Math.round((today - day) / 86_400_000);
        if (back === 0)
            return "TODAY";
        if (back === 1)
            return "YESTERDAY";
        const wd = d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
        const md = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}) }).toUpperCase();
        return `${wd} ${md}`;
    },
    divider(at) { return T.el("div", { class: "t-chat-when t-foot" }, this.when(at)); },
    node(m, ctl, { subjects = [] } = {}) {
        if (m.role === "event")
            return this.event(m, subjects);
        const n = m.role === "user" ? this.mine(m, ctl) : this.reply(m);
        const tags = this.tags(subjects);
        if (tags)
            n.prepend(tags);
        return n;
    },
    tags(subjects = []) {
        if (!subjects.length)
            return null;
        return T.el("span", { class: "t-subject-tags" }, ...subjects.map(s => T.el("span", { class: "t-subject-tag", "data-subject": String(s.id), title: String(s.title || s.id) }, String(s.id))));
    },
    MARKS: { alert: "!", arbiter: "◇", owner: "←", bot: "←", timer: "◷" },
    event(m, subjects = []) {
        const kind = m.source?.kind || "";
        const tags = this.tags(subjects);
        return T.el("div", { class: `t-event ${kind}${tags ? " tagged" : ""}`.trim(), "data-id": m.id || "", "data-kind": kind }, T.el("span", { class: "t-event-mark", "aria-hidden": "true" }, this.MARKS[kind] || "·"), T.el("span", { class: "t-event-text" }, tags, T.el("b", {}, String(m.source?.name || "")), " · ", T.el("span", { class: "what" }, String(m.text || ""))));
    },
    mine(m, ctl, cls = "") {
        const atts = m.attachments || [];
        const cards = m.cards || [];
        const ext = name => (String(name || "").match(/\.([A-Za-z0-9]{1,5})$/)?.[1] || "FILE").toUpperCase();
        const square = a => {
            const image = /^image\//.test(a.type || "");
            if (image)
                return a.id
                    ? T.el("button", { class: "t-att photo", type: "button", "aria-label": `Open ${a.name || "the picture"}`, onclick: () => ctl.image(a.id) }, T.el("img", { src: SuptWire.fileUrl(a.id), alt: String(a.name || ""), loading: "lazy", decoding: "async" }))
                    : T.el("span", { class: "t-att photo" }, a.thumb ? T.el("img", { src: a.thumb, alt: String(a.name || "") }) : null);
            return T.el(a.id ? "a" : "span", { class: "t-att file", ...(a.id ? { href: SuptWire.fileUrl(a.id), download: String(a.name || "") } : {}) }, T.el("span", { class: "t-att-ext" }, ext(a.name)), T.el("span", { class: "t-att-name" }, String(a.name || "file")));
        };
        const kids = [
            atts.length
                ? T.el("div", { class: "t-msg-atts" }, ...atts.map(square), ...cards.map(c => CardRef.tile(c, { peek: ctl.peek })))
                : cards.length ? T.el("div", { class: "t-msg-pills" }, ...cards.map(c => CardRef.pill(c, { peek: ctl.peek }))) : null,
            String(m.text || "").trim() ? T.el("p", {}, String(m.text)) : null,
        ];
        return T.el("div", { class: `t-msg me ${cls}`.trim(), "data-id": m.id || "" }, ...kids);
    },
    reply(m) {
        const md = T.md(String(m.text || ""));
        md.classList.add("t-msg", "supt");
        md.dataset.id = m.id;
        for (const a of md.querySelectorAll('a[href^="#item="], a[href^="#sfile="]'))
            a.classList.add("t-dl");
        for (const ul of [md.lastElementChild].filter(x => x?.matches("ul"))) {
            const lis = [...ul.children];
            const only = lis.length && lis.every(li => li.children.length === 1 && li.firstElementChild.matches("a.t-dl")
                && li.textContent.trim() === li.firstElementChild.textContent.trim());
            if (!only)
                continue;
            ul.classList.add("t-links");
            for (const a of ul.querySelectorAll("a.t-dl")) {
                const image = /[#&](shot|sfile)=/.test(a.getAttribute("href"));
                a.prepend(image ? T.el("i", { class: "t-imgglyph", "aria-hidden": "true" }) : CardRef.glyph());
            }
        }
        const offers = Offers.node(m);
        if (offers)
            md.append(offers);
        if (m.id)
            md.append(this.acts(m));
        return md;
    },
    SPIN: '<span class="t-spin" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>',
    spin() { const w = T.el("span"); w.innerHTML = this.SPIN; return w.firstChild; },
    ICONS: {
        play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>',
        pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3" width="3" height="10"/><rect x="9.5" y="3" width="3" height="10"/></svg>',
        copy: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect class="o" x="5.5" y="5.5" width="8" height="8"/><path class="o" d="M10.5 3.5v-1h-8v8h1"/></svg>',
    },
    acts(m) {
        const say = T.el("span", { class: "t-msg-said t-foot", role: "status" });
        const play = T.el("button", { class: "t-msg-act", type: "button", "aria-label": "Read it aloud" });
        const LABEL = { idle: "Read it aloud", loading: "Getting the audio; tap to cancel", playing: "Pause", paused: "Carry on reading",
            buffering: "Waiting for the next part; tap to pause", stalled: "Try that part again and carry on" };
        const show = (st, why) => {
            play.dataset.state = st;
            play.setAttribute("aria-label", LABEL[st] || LABEL.idle);
            play.innerHTML = st === "loading" || st === "buffering" ? this.SPIN : this.ICONS[st === "playing" ? "pause" : "play"];
            say.textContent = why || "";
        };
        show(Speech.state(m.id), Speech.note(m.id));
        if (Speech.state(m.id) !== "idle")
            Speech.tell = show;
        play.onclick = () => Speech.toggle(m.id, show);
        const copy = T.el("button", { class: "t-msg-act", type: "button", "aria-label": "Copy the reply",
            onclick: () => Tycho.copy(String(m.text || ""), "copied") });
        copy.innerHTML = this.ICONS.copy;
        const used = TurnSheet.used(m);
        return T.el("div", { class: "t-msg-acts" }, play, copy, say, used.length ? T.el("button", { class: "t-msg-used", type: "button", "aria-haspopup": "dialog",
            "aria-label": `${TurnSheet.TITLE}: ${used.join(", ")}`, onclick: () => TurnSheet.open(m) }, T.el("span", { class: "t-msg-used-text" }, used.join(" · "))) : null);
    },
    pending(body, was, ctl) {
        const attachments = (was.files || []).map(f => ({ name: f.name, type: f.contentType || "", thumb: f.thumb }));
        const n = this.mine({ ...body, attachments }, { ...ctl, peek: ctl.peek }, "pending");
        n.append(T.el("span", { class: "t-msg-state t-foot" }, "SENDING…"));
        return n;
    },
    unsent(e, ctl, { retry, discard }) {
        const attachments = (e.was?.files || []).map(f => ({ name: f.name, type: f.contentType || "", thumb: f.thumb }));
        const n = this.mine({ ...e.body, attachments }, ctl, "unsent");
        n.setAttribute("data-client", e.client_id);
        n.append(T.el("div", { class: "t-msg-unsent", role: "status" }, T.el("span", { class: "t-foot amber" }, "NOT SENT"), T.el("p", {}, String(e.reason || "")), T.el("div", { class: "t-msg-unsent-acts" }, T.el("button", { class: "t-btn tiny", type: "button", onclick: retry }, "RETRY"), T.el("button", { class: "t-btn tiny", type: "button", onclick: discard }, "DISCARD"))));
        return n;
    },
    WRITING: "The Superintendent is writing",
    thinking(progress = null, fallback = "") {
        const face = Face.node("sm");
        Face.busy(face);
        const n = T.el("div", { class: "t-chat-thinking", role: "status", "aria-label": this.WRITING }, face, this.spin(), T.el("span", { class: "t-chat-doing" }, T.el("span", { class: "t-chat-doing-label" }), T.el("span", { class: "t-chat-doing-since" })));
        this.doing(n, progress, fallback);
        return n;
    },
    doing(n, progress = null, fallback = "") {
        const label = n?.querySelector(".t-chat-doing-label"), since = n?.querySelector(".t-chat-doing-since");
        if (!label || !since)
            return;
        const now = SuptProgress.line(progress, fallback);
        if (label.textContent !== now.label)
            label.textContent = now.label;
        if (since.textContent !== now.suffix)
            since.textContent = now.suffix;
        const said = now.label ? `Superintendent: ${now.label}${now.suffix}` : this.WRITING;
        if (n.getAttribute("aria-label") !== said)
            n.setAttribute("aria-label", said);
    },
    failed(error) {
        return T.el("div", { class: "t-chat-err", role: "status" }, T.el("span", { class: "t-foot" }, "NO REPLY"), T.el("p", {}, String(error)));
    },
};
