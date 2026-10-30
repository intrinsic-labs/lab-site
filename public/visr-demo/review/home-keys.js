"use strict";
const HomeKeys = {
    MAP: { "/": "search", t: "telemetry", c: "chat", i: "capture" },
    view(e) {
        if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || Tycho.keys.composing(e))
            return null;
        if (e.shiftKey && e.key !== "/")
            return null;
        return Object.hasOwn(this.MAP, e.key) ? this.MAP[e.key] : null;
    },
    key(view) { return Object.keys(this.MAP).find(k => this.MAP[k] === view); },
};
