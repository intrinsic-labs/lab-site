/* REVIEW · attempts — one request id per thing he sends, kept until the Mac
   gives a definite answer.

   On a phone link a write can reach the Mac and be applied while its answer
   is lost. Sending it again must not do it twice, so every write that the
   Mac can de-duplicate (`intake file`, `queue act`) carries a request id,
   and a retry of the SAME request (same slot, same content) reuses it: the
   Mac recognises it and answers with what it already did. The id is kept in
   storage, so a reopened screen, a reload or an Android tab discard retries
   with the same id. Changing the request (other text, another project) is a
   new request with a new id. A definite answer, accepted or refused, ends
   the attempt; "no answer" (code `unknown`) keeps it.

     Attempts.id(slot, request) → the id to send
     Attempts.settle(slot, out)  → ends the attempt unless the outcome is unknown */
"use strict";

const Attempts = {
  KEY: "tycho.review.attempts",
  TTL_MS: 2 * 24 * 3600_000,

  id(slot, request) {
    const sig = JSON.stringify(request);
    const all = this.live();
    if (all[slot]?.sig === sig) return all[slot].id;
    const id = `desk-${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(2)).join("").slice(0, 10)}`;
    all[slot] = { sig, id, at: Date.now() };
    Store.set(this.KEY, all);
    return id;
  },

  settle(slot, out) {
    if (out && (out.code === "unknown" || out.code === "offline")) return;
    const all = this.live();
    if (!all[slot]) return;
    delete all[slot];
    Store.set(this.KEY, all);
  },

  /* the attempts younger than TTL_MS; older ones were answered or abandoned */
  live() {
    const all = Store.get(this.KEY, {}) || {};
    const now = Date.now();
    for (const [k, v] of Object.entries(all)) if (!v || now - (v.at || 0) > this.TTL_MS) delete all[k];
    return all;
  },
};
