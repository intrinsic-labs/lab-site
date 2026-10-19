/* VISR DEMO · tuning the vendored shell for a page it did not expect to be on.

   Loaded after every module has registered and before the app starts (the
   kernel starts on DOMContentLoaded). One adjustment, no edits to the shell's
   own files: the menu's SETTINGS row is hidden, because the settings screen
   edits the real runtime's rules, agents and budgets, and has nothing honest
   to show against an invented queue. New note, Telemetry and Monday stay:
   the shim answers them with invented data. */
"use strict";

(function () {
  const attach = Dropdown.attach.bind(Dropdown);
  Dropdown.attach = (btn, opts) => {
    if (opts?.label !== "Menu" || typeof opts.items !== "function") return attach(btn, opts);
    const items = opts.items;
    return attach(btn, { ...opts, items: () => items().filter(i => i.label !== "Settings") });
  };
})();
