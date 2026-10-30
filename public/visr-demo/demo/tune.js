/* VISR DEMO · tuning the vendored shell for a page it did not expect to be on.

   Loaded after review/app.js has defined every module and before the app
   starts (on DOMContentLoaded). No vendored file is edited; each change here
   wraps or replaces one method, and fails loudly if that method is gone.

   - Menu: Settings and Files are left out. Settings edits the real runtime's
     rules, agents, budgets and this device's notifications; Files browses the
     company's real prompt and skill folders. Neither has anything honest to
     show here, and App.open refuses both, so nothing else can reach them.
   - Telemetry: the kill switch row is left out. It stops real agents; the
     demo has none, and a PANIC button that does nothing would mislead.
   - Dictation: reported unusable, so its buttons are disabled and no
     microphone permission is ever asked for.
   - Chat attachments: a stored chat file's URL is answered by the scripted
     Superintendent when it offers one (`VISR_DEMO_SUPT.fileUrl(id)`), else a
     drawn placeholder, so an <img> or <a> never asks the network for
     /api/superintendent/file. */
"use strict";

(function () {
  const need = (ok, what) => { if (!ok) throw new Error(`demo/tune.js: ${what} is gone from the shell`); };
  need(typeof Dropdown?.attach === "function", "Dropdown.attach");
  need(typeof App?.open === "function", "App.open");
  need(typeof Panic?.row === "function", "Panic.row");
  need(typeof Voice?.usable === "function", "Voice.usable");
  need(typeof SuptWire?.fileUrl === "function", "SuptWire.fileUrl");

  const HIDDEN = new Set(["Settings", "Files"]);
  const attach = Dropdown.attach.bind(Dropdown);
  Dropdown.attach = (btn, opts) => {
    if (opts?.label !== "Menu" || typeof opts.items !== "function") return attach(btn, opts);
    const items = opts.items;
    return attach(btn, { ...opts, items: () => items().filter(i => !HIDDEN.has(i.label)) });
  };

  const open = App.open.bind(App);
  App.open = (key, opts) => (key === "settings" || key === "files" ? undefined : open(key, opts));

  Panic.row = () => {
    const el = document.createElement("section");
    el.hidden = true;
    return el;
  };

  Voice.usable = () => false;

  const PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#0d1218"/>'
    + '<text x="160" y="104" fill="#6b8798" font-family="monospace" font-size="12" text-anchor="middle">demo attachment</text></svg>');
  SuptWire.fileUrl = id => {
    const own = window.VISR_DEMO_SUPT?.fileUrl?.(id);
    return typeof own === "string" && !own.startsWith("/api/") ? own : PLACEHOLDER;
  };
})();
