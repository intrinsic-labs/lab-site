/* NET — every request to the Mac has a deadline, and the deadline covers the
   whole answer, body included.

   On a phone link that stalls rather than fails, a bare fetch() never
   settles: the deck sat on its first read, polls piled up behind it until
   the browser's six connections per host were spent, and a verb's "Sending…"
   could not end. Each call here aborts at its deadline and says which of
   three things happened, so the caller can choose the sentence:

     offline  the request never left (network down, server gone)
     timeout  no full answer inside the deadline. For a write the outcome is
              UNKNOWN: it may have reached the Mac and been applied
     cut      the answer started and was cut off (a frozen PWA, a dropped link)

     const { r, text } = await Net.fetch(path, init, Net.READ_MS)
     Net.READ_MS · Net.WRITE_MS · Net.LONG_MS
     err.net → "offline" | "timeout" | "cut"

   The deadlines sit above the server's own (tycho/*.py: 30s for a read, 120s
   for an act, 240s for dictation) so a slow but working Mac is never cut off
   before it answers. */
"use strict";

const Net = {
  READ_MS: 40_000,
  WRITE_MS: 135_000,
  LONG_MS: 260_000,

  async fetch(path, init = {}, ms = Net.READ_MS) {
    const ctl = new AbortController();
    const outer = init.signal;
    const relay = () => ctl.abort();
    if (outer) { if (outer.aborted) ctl.abort(); else outer.addEventListener("abort", relay, { once: true }); }
    let late = false;
    const timer = setTimeout(() => { late = true; ctl.abort(); }, ms);
    const fail = (kind, e) => {
      if (outer?.aborted && !late) throw e;            // the caller's own abort stays an AbortError
      const err = new Error(kind);
      err.net = late ? "timeout" : kind;
      throw err;
    };
    try {
      let r;
      try { r = await fetch(path, { ...init, signal: ctl.signal }); }
      catch (e) { fail("offline", e); }
      let text;
      try { text = await r.text(); }
      catch (e) { fail("cut", e); }
      return { r, text };
    } finally {
      clearTimeout(timer);
      outer?.removeEventListener("abort", relay);
    }
  },
};
