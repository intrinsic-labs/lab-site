"use strict";
const DeskStack = {
    create(root, { face = null } = {}) {
        const el = T.el("div", { class: "t-desk-stack" }, root);
        const pages = [];
        const back = () => {
            if (!pages.length)
                return;
            if (history.state?.sub)
                history.back();
            else
                pop();
        };
        const pop = () => {
            const top = pages.pop();
            if (!top)
                return;
            top.dispose?.();
            top.el.remove();
            root.hidden = pages.length > 0;
            pages.at(-1)?.el.removeAttribute("hidden");
        };
        return {
            el, back,
            depth: () => pages.length,
            page: () => (pages.at(-1)?.el || root).querySelector(".t-desk-page"),
            push({ title, build }) {
                const made = build();
                const body = made?.el || made;
                const page = T.el("div", { class: "t-desk-page" }, T.el("div", { class: "t-desk-inner t-sub-inner" }, body));
                const screen = T.el("div", { class: "t-desk-screen t-sub" }, TopBar.render({ title, back, label: "Back", face }), page);
                pages.at(-1)?.el.setAttribute("hidden", "");
                root.hidden = true;
                pages.push({ el: screen, dispose: made?.dispose });
                el.append(screen);
                Nav.push({ ...(history.state || {}), sub: pages.length });
                return screen;
            },
            settle(depth = 0) { while (pages.length > depth)
                pop(); },
            dispose() { while (pages.length)
                pop(); },
        };
    },
};
