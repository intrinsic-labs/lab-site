"use strict";
const DeckFit = {
    SHARE: 0.84, MAX: 2.4, GAP: 14,
    watch(box, deck, below) {
        const apply = () => {
            deck.style.setProperty("--deck-fit", "1");
            const w = deck.offsetWidth, h = deck.offsetHeight;
            const roomH = box.clientHeight - (below?.offsetHeight || 0) - this.GAP;
            if (!w || !h || roomH <= 0)
                return;
            const fit = Math.min(roomH * this.SHARE / h, box.clientWidth * this.SHARE / w, this.MAX);
            const v = String(Math.max(1, fit).toFixed(3));
            deck.style.setProperty("--deck-fit", v);
            box.style.setProperty("--deck-fit-room", v);
        };
        if ("ResizeObserver" in window)
            new ResizeObserver(apply).observe(box);
        requestAnimationFrame(apply);
    },
};
