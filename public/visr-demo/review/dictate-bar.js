"use strict";
const DictateBar = {
    create({ stop, label }) {
        const stopBtn = T.el("button", { class: "t-btn t-voice rec", type: "button", onclick: () => stop() }, "■ STOP");
        const clock = T.el("span", { class: "t-chat-clock", role: "timer" });
        const what = T.el("span", { class: "t-foot t-dictate-for" }, `INTO ${label}`);
        const el = T.el("div", { class: "t-dictate-bar" }, T.el("div", { class: "t-chat-rec" }, stopBtn, clock, what));
        const time = s => {
            clock.replaceChildren(T.el("span", { class: "dot", "aria-hidden": "true" }), Dictate.clock(s));
            clock.setAttribute("aria-label", `Recording, ${Math.round(s)} seconds`);
        };
        time(0);
        new ResizeObserver(() => {
            if (el.isConnected)
                document.getElementById("frame").style.setProperty("--rec-h", `${el.offsetHeight}px`);
        }).observe(el);
        return { el, time };
    },
};
