"use strict";
Object.assign(Tycho, {
    viewer({ count, start = 0, caption = () => "", load, onClose = null }) {
        let index = Math.max(0, Math.min(start, count - 1));
        let open = true;
        const many = count > 1;
        const two = n => String(n).padStart(2, "0");
        const stage = T.el("div", { class: "t-viewer-stage" });
        const pos = T.el("div", { class: "t-viewer-pos", "aria-live": "polite" });
        const cap = T.el("div", { class: "t-viewer-cap" });
        const prev = many ? T.el("button", { class: "t-btn t-viewer-prev", type: "button", "aria-label": "Previous image",
            onclick: () => go(index - 1) }, "‹") : null;
        const next = many ? T.el("button", { class: "t-btn t-viewer-next", type: "button", "aria-label": "Next image",
            onclick: () => go(index + 1) }, "›") : null;
        const shut = T.el("button", { class: "t-btn tiny t-viewer-close", type: "button", onclick: () => close() }, "CLOSE ✕");
        const bar = T.el("div", { class: "t-viewer-bar" }, prev || T.el("span"), T.el("div", { class: "t-viewer-id" }, pos, cap), next || T.el("span"));
        const ov = T.el("div", { class: "t-viewer", role: "dialog", "aria-modal": "true", tabindex: "-1",
            "data-count": count }, T.el("div", { class: "t-viewer-top" }, shut), stage, bar);
        const show = enter => {
            const at = index;
            ov.dataset.index = at;
            pos.textContent = `${two(at + 1)} / ${two(count)}`;
            cap.textContent = String(caption(at) || "").toUpperCase();
            ov.setAttribute("aria-label", `Image ${at + 1} of ${count}: ${caption(at) || "image"}`);
            if (prev)
                prev.disabled = at === 0;
            if (next)
                next.disabled = at === count - 1;
            const state = (cls, text) => T.el("div", { class: `t-viewer-state ${cls}` }, text);
            stage.replaceChildren(state("dim", "DEVELOPING…"));
            Promise.resolve().then(() => load(at)).then(url => {
                if (!open || at !== index)
                    return;
                const img = T.el("img", { src: url, alt: caption(at) || "image", draggable: "false" });
                if (enter)
                    img.classList.add(`t-enter-${enter}`);
                stage.replaceChildren(img);
            }, e => {
                if (!open || at !== index)
                    return;
                stage.replaceChildren(state("amber", `COULDN'T LOAD THIS IMAGE${e?.message ? ` · ${e.message}` : ""}`));
            });
            for (const j of [at + 1, at - 1])
                if (j >= 0 && j < count)
                    Promise.resolve().then(() => load(j, { soon: true })).catch(() => { });
        };
        const go = (i, enter = i > index ? "next" : "prev") => {
            if (!open || i < 0 || i >= count || i === index)
                return false;
            index = i;
            show(enter);
            return true;
        };
        const close = () => {
            if (!open)
                return;
            open = false;
            ov.remove();
            removeEventListener("keydown", onKey, true);
            visualViewport?.removeEventListener("resize", zoomed);
            onClose?.();
        };
        const onKey = e => {
            if (e.key === "Escape")
                close();
            else if (e.key === "ArrowLeft")
                go(index - 1);
            else if (e.key === "ArrowRight")
                go(index + 1);
            else
                return;
            e.stopPropagation();
            e.preventDefault();
        };
        let drag = null, swallow = false;
        const pinchedIn = () => (visualViewport?.scale || 1) > 1.01;
        const zoomed = () => { stage.style.touchAction = pinchedIn() ? "auto" : ""; };
        visualViewport?.addEventListener("resize", zoomed);
        zoomed();
        const pic = () => stage.firstElementChild;
        const settle = () => {
            const p = pic();
            if (!p)
                return;
            p.style.transition = "transform 160ms ease-out";
            p.style.transform = "";
            p.addEventListener("transitionend", () => { p.style.transition = ""; }, { once: true });
        };
        stage.addEventListener("pointerdown", e => {
            if (drag) {
                drag = null;
                settle();
                return;
            }
            if (!e.isPrimary || pinchedIn() || (e.pointerType === "mouse" && e.button !== 0))
                return;
            drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, dx: 0, sideways: null };
        });
        stage.addEventListener("pointermove", e => {
            if (!drag || e.pointerId !== drag.id)
                return;
            const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
            if (drag.sideways === null && Math.hypot(dx, dy) > 10)
                drag.sideways = Math.abs(dx) > Math.abs(dy);
            if (!drag.sideways)
                return;
            const edge = (dx > 0 && index === 0) || (dx < 0 && index === count - 1);
            drag.dx = dx;
            const p = pic();
            if (p) {
                p.style.transition = "";
                p.style.transform = `translateX(${edge ? dx / 3 : dx}px)`;
            }
        });
        const release = e => {
            if (!drag || e.pointerId !== drag.id)
                return;
            const { dx, t, sideways } = drag;
            drag = null;
            if (!sideways)
                return;
            swallow = true;
            setTimeout(() => { swallow = false; }, 400);
            const fast = Math.abs(dx) / Math.max(1, e.timeStamp - t) > 0.4 && Math.abs(dx) > 24;
            const far = Math.abs(dx) > Math.min(80, stage.clientWidth / 4);
            if (e.type === "pointerup" && (fast || far) && go(index + (dx < 0 ? 1 : -1)))
                return;
            settle();
        };
        stage.addEventListener("pointerup", release);
        stage.addEventListener("pointercancel", release);
        ov.addEventListener("click", e => {
            if (swallow) {
                swallow = false;
                return;
            }
            if (e.target.closest(".t-viewer-bar, .t-viewer-top"))
                return;
            close();
        });
        ov._close = close;
        addEventListener("keydown", onKey, true);
        document.getElementById("frame").append(ov);
        show(null);
        ov.focus({ preventScroll: true });
        return { el: ov, index: () => index, go: i => go(i), close, isOpen: () => open };
    },
});
