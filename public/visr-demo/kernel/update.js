/* UPDATE — when the page moves onto a new version of the app.

   The service worker (sw.js) serves the app from its cache and installs a
   new version in the background; once it takes over, the open page is still
   running the old code. Within the first seconds of a launch (the browser's
   update check runs as the app opens) the page reloads at once, before
   there is anything to lose. Later, it waits until he leaves the app and
   reloads as he comes back. Drafts and the session (where he was) are kept
   in storage, so the reload lands him where he was, on the new code.

   No reload when the worker is installed for the first time (nothing was
   controlling the page), and none while the daily boot is running. */
"use strict";

const Update = {
  SOON_MS: 15_000,
  pending: false,

  watch() {
    const sw = navigator.serviceWorker;
    if (!sw) return;
    const had = !!sw.controller;
    sw.addEventListener("controllerchange", () => {
      if (!had || this.pending) return;
      this.pending = true;
      const booting = document.querySelector("#boot.running:not(.off)");
      if (performance.now() < this.SOON_MS && !booting) return location.reload();
      Tycho.onResume(() => location.reload());
    });
  },
};

Update.watch();
