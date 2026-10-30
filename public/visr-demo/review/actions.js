"use strict";
const Actions = {
    SHEETS: ["feedback", "handback", "route", "undo"],
    PLAIN: ["standing_edit"],
    render(item, o) {
        const has = a => (item.actions || []).includes(a);
        let busy = false;
        const say = T.el("div", { class: "t-bar-say" });
        const tell = (msg, tone = "bad") => {
            say.replaceChildren(msg ? T.el("span", { class: tone }, msg) : "");
        };
        const draft = item.kind === "draft_outcome";
        const plainKind = Actions.PLAIN.includes(item.kind);
        const faces = [];
        if (has("approve") && !plainKind)
            faces.push({ id: "approve", label: "APPROVE", tone: "ok" });
        if (has("done"))
            faces.push({ id: "done", label: "DONE", tone: "ok" });
        if (has("reject") && !plainKind)
            faces.push({ id: "reject", label: "REFUSE", tone: "red" });
        const stamp = faces.length ? Tycho.stamp({
            faces, target: o.target, area: o.area || (() => o.target),
            guard: () => !busy,
            onMiss: () => tell("Drag the stamp up onto the page.", "dim"),
            onStamp: async (id) => {
                busy = true;
                tell(null);
                let extra = {};
                if (id === "approve" && ApproveSheet.needed(item)) {
                    const picks = await ApproveSheet.confirm(item);
                    if (!picks) {
                        busy = false;
                        return stamp.reset();
                    }
                    extra = picks;
                }
                const out = id === "reject" ? await o.compose("reject") : await o.act(id, extra);
                busy = false;
                if (out?.ok)
                    return stamp.lock();
                if (out?.pending) {
                    tell("SENDING…", "dim");
                    return stamp.lock();
                }
                if (out?.code === "stale")
                    return;
                stamp.reset();
                if (out)
                    tell(out.reason || "not sent");
            },
        }) : null;
        const btns = [];
        const free = on => { for (const b of [...btns, more])
            if (b)
                b.disabled = !on; };
        const run = action => Actions.SHEETS.includes(action) ? o.compose(action)
            : action === "park" ? o.park() : action === "block" ? o.block()
                : action === "link" ? o.link() : o.act(action);
        const refused = out => out && !out.ok && !out.pending && out.code !== "stale";
        const fromMenu = (action, working = null) => async () => {
            if (busy)
                return;
            busy = true;
            free(false);
            tell(working?.say || null, "dim");
            const out = await run(action);
            busy = false;
            free(true);
            if (working)
                tell(null);
            if (refused(out))
                tell(out.reason || "not sent");
        };
        const plain = (action, label, tone = "", working = null) => {
            const b = T.el("button", { class: `t-btn ${tone}`.trim(), "data-act": action }, label);
            b.onclick = async () => {
                if (busy)
                    return;
                busy = true;
                free(false);
                tell(null);
                if (working) {
                    b.textContent = working.label;
                    b.setAttribute("aria-busy", "true");
                    tell(working.say, "dim");
                }
                const out = await run(action);
                busy = false;
                free(true);
                if (working) {
                    b.textContent = label;
                    b.setAttribute("aria-busy", "false");
                    tell(null);
                }
                if (refused(out))
                    tell(out.reason || "not sent");
            };
            return b;
        };
        const promoted = has("interactive") && Interactive.promoted(item);
        const session = promoted ? plain("interactive", "OPEN INTERACTIVE", "", Interactive.opening(item))
            : has("handback") ? plain("handback", "HAND BACK") : null;
        if (session && !has("accept"))
            btns.push(session);
        if (plainKind && has("approve"))
            btns.push(plain("approve", Fmt.verbFor(item, "approve"), "ok"));
        if (plainKind && has("reject"))
            btns.push(plain("reject", Fmt.verbFor(item, "reject"), "danger"));
        if (has("acknowledge"))
            btns.push(plain("acknowledge", Fmt.verb("acknowledge"), "ok"));
        if (has("undo"))
            btns.push(plain("undo", Fmt.verb("undo")));
        if (has("accept"))
            btns.push(plain("accept", "ACCEPT", "ok"));
        if (has("park"))
            btns.push(plain("park", "PARK"));
        if (has("route")) {
            const route = plain("route", "ROUTE", "ok");
            route.title = "Route to owner";
            route.setAttribute("aria-label", "Route to owner");
            btns.push(route);
        }
        if (has("refresh"))
            btns.push(plain("refresh", "REFRESH", "", { label: "READING…", say: "Re-reading this workspace in Linear." }));
        if (has("feedback"))
            btns.push(plain("feedback", "FEEDBACK"));
        const linkSide = o.link ? LinearLink.offered(item) : null;
        if (linkSide === "issue") {
            const link = plain("link", "LINK");
            link.title = "Link issues to outcomes";
            link.setAttribute("aria-label", "Link issues to outcomes");
            btns.push(link);
        }
        const menu = [has("block") ? { label: "BLOCKED BY", fn: fromMenu("block") } : null,
            has("unblock") ? { label: "UNBLOCK", fn: fromMenu("unblock") } : null,
            has("not_needed") && !has("acknowledge") ? { label: Fmt.verb("not_needed"), fn: fromMenu("not_needed") } : null,
            linkSide === "outcome" ? { label: "LINK TO LINEAR", fn: fromMenu("link") } : null,
            has("interactive") && !promoted ? { label: "OPEN INTERACTIVE", fn: fromMenu("interactive", Interactive.opening(item)) } : null].filter(Boolean);
        let later = null;
        if (has("later")) {
            later = plain("later", "LATER");
            btns.push(later);
            if (draft || menu.length || linkSide === "issue")
                later.classList.add("t-wide-only");
        }
        const inMenu = later?.classList.contains("t-wide-only") ? later : null;
        const more = inMenu || menu.length ? Actions.more(() => [
            ...(inMenu && getComputedStyle(inMenu).display === "none" ? [{ label: "LATER", fn: () => inMenu.click() }] : []),
            ...menu
        ], { narrowOnly: !menu.length }) : null;
        const wide = session && has("accept") ? session : null;
        if (wide) {
            wide.classList.add("wide");
            btns.push(wide);
        }
        const fill = !stamp && btns.length > 3;
        if (o.tool)
            o.tool.classList.toggle("wide", fill);
        const verbs = [...btns.filter(b => b !== wide), ...(more ? [more] : []), ...(wide ? [wide] : []), ...(o.tool ? [o.tool] : [])];
        const el = T.el("div", { class: "t-bar", "data-pid": "desk" }, faces.length || verbs.length ? T.el("div", { class: "t-bar-row" }, stamp ? stamp.el : null, verbs.length ? T.el("div", { class: `t-bar-verbs${fill ? " fill" : ""}` }, ...verbs) : null)
            : T.el("p", { class: "t-say dim" }, Lanes.happened(item) ? "Nothing to do here. It already happened."
                : "Nothing to do here. It is shown so you know it is waiting."), say);
        return { el, key: e => stamp?.key(e), say: tell };
    },
    more(items, { narrowOnly = false } = {}) {
        const b = T.el("button", { class: `t-btn t-more${narrowOnly ? " t-narrow-only" : ""}`, type: "button",
            "aria-label": "More actions", "aria-haspopup": "menu" }, "⋯");
        let open = null;
        b.onclick = () => {
            if (open?.el.isConnected) {
                open.close();
                open = null;
                return;
            }
            const r = b.getBoundingClientRect();
            open = Tycho.ctxmenu(r.right, r.top, items(), { owner: b });
            const menu = open.el;
            const box = document.getElementById("main").getBoundingClientRect();
            menu.style.left = Math.max(4, r.right - box.left - menu.offsetWidth) + "px";
            menu.style.top = Math.max(4, r.top - box.top - menu.offsetHeight - 6) + "px";
        };
        return b;
    },
};
