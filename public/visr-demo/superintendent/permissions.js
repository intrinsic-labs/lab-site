"use strict";
const SuptPermissions = {
    OPTIONS: [{ value: "ask_first", label: "Ask first" }, { value: "all_in", label: "All in" }],
    MEANS: {
        ask_first: "Ask first: asks with a chip before merges, deploys and protected edits.",
        all_in: "All in: acts without asking, in any turn, and logs it. Money, client or public sends, production "
            + "releases, deleting real data and held merges still need your request or a confirm tap.",
    },
    uncertain(out) {
        return !out?.ok && (out?.code === "unknown" || out?.code === "timeout" || !out?.code);
    },
    node() {
        const means = T.el("p", { class: "t-set-help t-supt-mode-means" });
        const trial = T.el("p", { class: "t-set-why t-supt-mode-trial" });
        const said = T.el("p", { class: "t-set-why amber t-supt-mode-err", role: "status" });
        const st = { mode: null, pending: false };
        const seg = SetControls.seg({ label: "Permission mode", options: this.OPTIONS }, null, v => change(v));
        const body = T.el("div", { class: "t-supt-mode" }, seg.el, means, trial, said);
        const enable = on => seg.el.querySelectorAll(".t-seg-opt").forEach(b => { b.disabled = !on; });
        const show = out => {
            st.mode = out.mode;
            st.trial = out.trial;
            seg.set(out.mode);
            means.textContent = this.MEANS[out.mode];
            trial.textContent = this.trial(out.trial);
            enable(true);
        };
        const change = async (mode) => {
            if (st.pending || mode === st.mode)
                return seg.set(st.mode);
            const was = st.mode;
            st.pending = true;
            said.textContent = "";
            means.textContent = this.MEANS[mode];
            enable(false);
            const out = await Tycho.auth(() => SuptWire.setMode(mode))
                .catch(e => ({ ok: false, code: "unknown", reason: String(e?.message || e) }));
            st.pending = false;
            if (out?.ok)
                return show(out);
            if (out && this.uncertain(out))
                return load("The Mac's answer to the switch was lost; this is the mode it has now.");
            show({ mode: was, trial: st.trial });
            said.textContent = `Not switched. ${out?.reason || "The action token wasn't given."}`;
        };
        const load = async (after = "") => {
            enable(false);
            said.textContent = "";
            means.textContent = "Reading the mode…";
            const out = await SuptWire.mode();
            if (out?.ok) {
                show(out);
                said.textContent = after;
                return;
            }
            means.textContent = "";
            if (out?.code === "unsupported")
                return body.replaceChildren(T.el("p", { class: "t-set-why" }, out.reason));
            st.mode = null;
            seg.set(null);
            said.replaceChildren(`${after ? "The Mac's answer to the switch was lost, and it may have switched. " : ""}`
                + `Couldn't read the mode: ${out?.reason || "the Mac didn't answer."} `, T.el("button", { class: "t-btn tiny", type: "button", onclick: () => load() }, "RETRY"));
        };
        load();
        return body;
    },
    trial(t) {
        const end = t?.endsAt ? new Date(t.endsAt) : null;
        if (!end || isNaN(end))
            return "";
        const day = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return `Two-week trial ${end > Date.now() ? "ends" : "ended"} ${day}`;
    },
};
