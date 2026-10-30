"use strict";
const SuptPages = {
    stack: [],
    push(view) {
        view.el.classList.add("t-over", "t-supt-page");
        Chat.el.append(view.el);
        this.stack.push(view);
        Chat.composer?.blur();
    },
    pop() {
        const view = this.stack.pop();
        if (!view)
            return false;
        view.dispose?.();
        view.el.remove();
        return true;
    },
    clear() { while (this.pop())
        ; },
    depth() { return this.stack.length; },
};
