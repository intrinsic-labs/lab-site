"use strict";
const Icons = {
    PATHS: {
        pencil: '<path d="M4 20l1.2-4.8L16.5 3.9a2 2 0 0 1 2.8 0l.8.8a2 2 0 0 1 0 2.8L8.8 18.8z"/>'
            + '<path d="M14.5 5.9l3.6 3.6M5.2 15.2l3.6 3.6"/>',
        gear: '<path d="M18.2 9.7L20.7 9.9V14.1L18.2 14.3L18 14.7L19.7 16.7L16.7 19.7L14.7 18L14.3 18.2L14.1 20.7H9.9'
            + 'L9.7 18.2L9.3 18L7.3 19.7L4.3 16.7L6 14.7L5.8 14.3L3.3 14.1V9.9L5.8 9.7L6 9.3L4.3 7.3L7.3 4.3L9.3 6'
            + 'L9.7 5.8L9.9 3.3H14.1L14.3 5.8L14.7 6L16.7 4.3L19.7 7.3L18 9.3Z"/><circle cx="12" cy="12" r="3"/>',
        monitor: '<g stroke-linejoin="miter" stroke-linecap="square"><rect x="3" y="4" width="18" height="12"/>'
            + '<path d="M12 16v4M8 20h8"/></g><path d="M6 11h2.5l1.5-3 3 6 1.5-3H18"/>',
        calendar: '<g stroke-linejoin="miter" stroke-linecap="square"><rect x="3" y="5" width="18" height="16"/>'
            + '<path d="M3 10h18M8 3v4M16 3v4"/></g><path d="M7 15h4"/>',
        search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>',
        filter: '<path class="fill" d="M3.5 4.5h17l-6.5 8v6l-4 2v-8z"/>',
        menu: '<g stroke-linejoin="miter" stroke-linecap="square"><rect x="3" y="3" width="18" height="18"/>'
            + '<path d="M7.5 7.5L12 16.5L16.5 7.5"/></g>',
        check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        next: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
        back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
        close: '<path d="M6 6l12 12M18 6L6 18"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        send: '<path d="M12 19V5.5M6 11l6-6 6 6"/>',
        mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
        camera: '<g stroke-linejoin="miter" stroke-linecap="square"><rect x="3" y="7" width="18" height="13"/>'
            + '<path d="M8.5 7l1.5-3h4l1.5 3"/></g><circle cx="12" cy="13.5" r="3.5"/>',
        image: '<g stroke-linejoin="miter" stroke-linecap="square"><rect x="3" y="4" width="18" height="16"/></g>'
            + '<path d="M3.5 17l5-5.5 4 4 2.5-2.5 5.5 5.5"/><circle cx="15.5" cy="8.5" r="1.5"/>',
        file: '<g stroke-linejoin="miter" stroke-linecap="square"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></g>',
        "pr-open": '<circle cx="6" cy="5.5" r="2.5"/><circle cx="6" cy="18.5" r="2.5"/><path d="M6 8v8"/>'
            + '<circle cx="18" cy="18.5" r="2.5"/><path d="M18 16V9.5A3.5 3.5 0 0 0 14.5 6H10.5M13 3.5L10.5 6L13 8.5"/>',
        "pr-draft": '<circle cx="6" cy="5.5" r="2.5"/><circle cx="6" cy="18.5" r="2.5"/><path d="M6 8v8"/>'
            + '<circle cx="18" cy="18.5" r="2.5"/><path stroke-width="2.6" d="M18 5.5h0M18 11h0"/>',
        "pr-merged": '<circle cx="6" cy="5.5" r="2.5"/><circle cx="6" cy="18.5" r="2.5"/><path d="M6 8v8"/>'
            + '<circle cx="18" cy="14" r="2.5"/><path d="M6 8c0 3.5 2.5 6 6 6h3.5"/>',
        "pr-closed": '<circle cx="6" cy="5.5" r="2.5"/><circle cx="6" cy="18.5" r="2.5"/><path d="M6 8v8"/>'
            + '<circle cx="18" cy="18.5" r="2.5"/><path d="M18 16v-4.5M15.5 3.5l5 5M20.5 3.5l-5 5"/>',
    },
    html(name) {
        return '<svg class="t-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            + 'stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + (this.PATHS[name] || "") + "</svg>";
    },
    node(name) {
        const t = document.createElement("template");
        t.innerHTML = this.html(name);
        return t.content.firstChild;
    },
};
