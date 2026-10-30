"use strict";
const SpeechSpeed = {
    KEY: "tycho.speech.rate",
    RATES: [1, 1.25, 1.5, 1.75, 2],
    DEFAULT: 1.25,
    changed: null,
    get() {
        let saved = null;
        try {
            saved = localStorage.getItem(this.KEY);
        }
        catch { }
        const rate = Number(saved);
        return this.RATES.includes(rate) ? rate : this.DEFAULT;
    },
    set(rate) {
        if (!this.RATES.includes(rate))
            return;
        try {
            localStorage.setItem(this.KEY, String(rate));
        }
        catch { }
        this._rate = rate;
        this.changed?.();
    },
    current() { return this._rate ?? (this._rate = this.get()); },
    apply(audio) {
        const rate = this.current();
        audio.preservesPitch = true;
        audio.webkitPreservesPitch = true;
        audio.defaultPlaybackRate = rate;
        if (audio.playbackRate !== rate)
            audio.playbackRate = rate;
    },
    label: rate => `${rate}×`,
    control() {
        const field = { label: "Reading speed", options: this.RATES.map(r => ({ value: String(r), label: this.label(r) })) };
        const seg = SetControls.seg(field, String(this.current()), v => this.set(Number(v)));
        seg.el.classList.add("t-speed-seg");
        return T.el("div", { class: "t-set-field t-set-is-enum t-speed" }, T.el("div", { class: "t-set-head" }, T.el("label", { class: "t-set-label" }, field.label)), T.el("div", { class: "t-set-control" }, seg.el), T.el("div", { class: "t-set-help" }, "How fast replies are read aloud on this device. A change applies at once, even mid-reply."));
    },
};
