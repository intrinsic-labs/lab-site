/* REVIEW · snapshot — the last queue read that worked, kept on the device.

   On a stalled link the deck used to say "Nothing waiting" until the first
   read landed, which could be never. The last good read is kept in
   localStorage instead and drawn at once on the next launch; the live read
   replaces it as soon as it lands. Acting on an item from it is safe: every
   verb carries the item's revision and the Mac refuses a stale one.

   `sig` is the read minus `generatedAt` (the only field that moves when
   nothing changed), so an unchanged poll neither rewrites storage nor
   redraws the deck.

     Snapshot.load() → { data, checked } | null
     Snapshot.save(data, checked)
     Snapshot.sig(data) → string */
"use strict";

const Snapshot = {
  KEY: "tycho.review.snapshot",

  sig(data) {
    if (!data) return "";
    const { generatedAt, ...rest } = data;
    return JSON.stringify(rest);
  },

  load() {
    const s = Store.get(this.KEY);
    return s && s.data && Array.isArray(s.data.items) ? s : null;
  },

  save(data, checked) {
    try { Store.set(this.KEY, { data, checked }); } catch { /* full storage: the live read still works */ }
  },
};
