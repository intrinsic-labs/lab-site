/* REVIEW · icons — the line icons the app draws, in one place.

   Every icon is inline SVG on a 24px grid in the deck's own line: one colour
   (currentColor), a 2px stroke, round joins where the shape is a drawing
   (pencil, gear, funnel) and square ones where it is a box (the menu's V in
   a square, the monitor, the calendar), matching the square corners of the kit.

     Icons.html(name)   → the SVG as markup, for innerHTML
     Icons.node(name)   → the SVG as an element */
"use strict";

const Icons = {
  PATHS: {
    /* a pencil: body, tip, ferrule */
    pencil: '<path d="M4 20l1.2-4.8L16.5 3.9a2 2 0 0 1 2.8 0l.8.8a2 2 0 0 1 0 2.8L8.8 18.8z"/>'
      + '<path d="M14.5 5.9l3.6 3.6M5.2 15.2l3.6 3.6"/>',
    /* a gear: eight teeth round a hub */
    gear: '<path d="M18.2 9.7L20.7 9.9V14.1L18.2 14.3L18 14.7L19.7 16.7L16.7 19.7L14.7 18L14.3 18.2L14.1 20.7H9.9'
      + 'L9.7 18.2L9.3 18L7.3 19.7L4.3 16.7L6 14.7L5.8 14.3L3.3 14.1V9.9L5.8 9.7L6 9.3L4.3 7.3L7.3 4.3L9.3 6'
      + 'L9.7 5.8L9.9 3.3H14.1L14.3 5.8L14.7 6L16.7 4.3L19.7 7.3L18 9.3Z"/><circle cx="12" cy="12" r="3"/>',
    /* a monitor on its stand, a trace across the screen */
    monitor: '<g stroke-linejoin="miter" stroke-linecap="square"><rect x="3" y="4" width="18" height="12"/>'
      + '<path d="M12 16v4M8 20h8"/></g><path d="M6 11h2.5l1.5-3 3 6 1.5-3H18"/>',
    /* a calendar page: two rings over a square, the week's line across */
    calendar: '<g stroke-linejoin="miter" stroke-linecap="square"><rect x="3" y="5" width="18" height="16"/>'
      + '<path d="M3 10h18M8 3v4M16 3v4"/></g><path d="M7 15h4"/>',
    /* a funnel: what is let through */
    filter: '<path class="fill" d="M3.5 4.5h17l-6.5 8v6l-4 2v-8z"/>',
    /* the menu: a V in a square */
    menu: '<g stroke-linejoin="miter" stroke-linecap="square"><rect x="3" y="3" width="18" height="18"/>'
      + '<path d="M7.5 7.5L12 16.5L16.5 7.5"/></g>',
    /* the chosen row in a menu */
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    /* a row that opens a further menu, and the way back out of it */
    next: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
    back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
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
