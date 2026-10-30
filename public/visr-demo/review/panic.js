"use strict";
const Panic = {
    RELEASE: "intrinsic start",
    state(board, local) {
        const line = (board?.view?.health || []).find(l => /\bSTOP\b/.test(String(l))) || null;
        const said = !line ? null : /STOP engaged/i.test(line) ? true : /STOP released/i.test(line) ? false : null;
        const rendered = Date.parse(board?.renderedAt || "");
        const fresh = local && !(rendered > Date.parse(local.engagedAt || ""));
        if (said !== true && fresh)
            return { engaged: true, line: "🛑 STOP engaged just now, from VISR" };
        return { engaged: said, line };
    },
    row({ engaged, line }, { engaged: onEngaged } = {}) {
        if (engaged)
            return T.el("section", { class: "t-kill engaged t-note amber", role: "status" }, T.el("div", { class: "t-label" }, "STOP ENGAGED"), T.el("p", {}, Telemetry.inline(line || "STOP engaged")), T.el("p", {}, "No new runs start. Running sessions finish on their own."), T.el("p", {}, "Release it on the Mac with ", T.el("code", {}, this.RELEASE), "."));
        return T.el("section", { class: "t-kill" }, T.el("div", { class: "t-kill-state" }, T.el("div", { class: "t-label" }, "KILL SWITCH"), T.el("p", {}, engaged === false ? "Released. Runs start as usual." : "State unknown: the board doesn't say.")), T.el("button", { class: "t-btn danger t-kill-btn", type: "button", onclick: () => this.confirm(onEngaged) }, "PANIC"));
    },
    confirm(onEngaged) {
        const go = T.el("button", { class: "t-btn danger", type: "button" }, "ENGAGE STOP");
        const cancel = T.el("button", { class: "t-btn", type: "button" }, "CANCEL");
        const sh = Tycho.sheet({ cap: "PANIC · ENGAGE THE KILL SWITCH", acts: [cancel, go], kids: [
                T.el("p", {}, "Are you sure? This engages the kill switch."),
                T.el("ul", { class: "t-list t-kill-what" }, T.el("li", {}, "No new runs start."), T.el("li", {}, "Running sessions finish on their own."), T.el("li", {}, "Release it on the Mac with ", T.el("code", {}, this.RELEASE), ". There is no release here.")),
            ] });
        sh.el.classList.add("t-kill-sheet");
        cancel.onclick = () => sh.close();
        go.onclick = async () => {
            go.disabled = cancel.disabled = true;
            sh.say(T.el("p", { class: "t-say dim" }, "Engaging…"));
            let out;
            try {
                out = await Tycho.auth(() => Wire.stop());
            }
            catch (e) {
                out = { ok: false, reason: String(e?.message || e) };
            }
            go.disabled = cancel.disabled = false;
            if (out?.ok) {
                sh.close();
                Tycho.toast(out.alreadyEngaged ? "STOP was already engaged" : "STOP engaged");
                return onEngaged?.(out);
            }
            sh.say(T.el("div", { class: "t-note bad" }, T.el("div", { class: "t-label" }, "NOT ENGAGED"), T.el("p", {}, out ? String(out.reason || "The Mac did not confirm the stop.") : "The action token wasn't given."), T.el("p", {}, "On the Mac, ", T.el("code", {}, "intrinsic stop"), " does the same.")));
        };
        requestAnimationFrame(() => cancel.focus({ preventScroll: true }));
        return sh;
    },
};
