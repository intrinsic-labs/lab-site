"use strict";
const Net = {
    READ_MS: 40_000,
    WRITE_MS: 135_000,
    LONG_MS: 260_000,
    async fetch(path, init = {}, ms = Net.READ_MS) {
        const ctl = new AbortController();
        const outer = init.signal;
        const relay = () => ctl.abort();
        if (outer) {
            if (outer.aborted)
                ctl.abort();
            else
                outer.addEventListener("abort", relay, { once: true });
        }
        let late = false;
        const timer = setTimeout(() => { late = true; ctl.abort(); }, ms);
        const fail = (kind, e) => {
            if (outer?.aborted && !late)
                throw e;
            const err = new Error(kind);
            err.net = late ? "timeout" : kind;
            throw err;
        };
        try {
            let r;
            try {
                r = await fetch(path, { ...init, signal: ctl.signal });
            }
            catch (e) {
                fail("offline", e);
            }
            let text;
            try {
                text = await r.text();
            }
            catch (e) {
                fail("cut", e);
            }
            return { r, text };
        }
        finally {
            clearTimeout(timer);
            outer?.removeEventListener("abort", relay);
        }
    },
};
