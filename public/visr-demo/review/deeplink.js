/* REVIEW · deep links — a phone alert opens the thing it is about.

   ntfy and other links point into the app by fragment, so the static shell
   (and the service worker's cached copy of it) serves every link:
     #item=<encodeURIComponent(queue key)>   that item's desk
     #board                                  the telemetry board
     #monday                                 the latest Monday meeting
     #monday=YYYY-MM-DD                      that Monday meeting
   The fragment is read once and cleared with replaceState, so a reload lands
   where he was rather than reopening the link. Any other fragment is left
   alone. The controller (app.js) decides what opening means.

     DeepLink.parse(hash) → { item } | { board: true } | { monday: date | "" } | null
     DeepLink.take()      → the same for this page's hash, which is cleared */
"use strict";

const DeepLink = {
  parse(hash) {
    const h = String(hash || "").replace(/^#/, "");
    if (h === "board") return { board: true };
    if (h === "monday") return { monday: "" };
    const day = /^monday=(\d{4}-\d{2}-\d{2})$/.exec(h);
    if (day) return { monday: day[1] };
    const m = /^item=(.+)$/.exec(h);
    if (!m) return null;
    try {
      const key = decodeURIComponent(m[1]).trim();
      return key ? { item: key } : null;
    } catch { return null; }
  },

  take() {
    const link = this.parse(location.hash);
    if (link) history.replaceState(history.state, "", location.pathname + location.search);
    return link;
  },
};
