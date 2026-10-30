/* VISR DEMO · SUPERINTENDENT · the routes — what demo/shim.js asks, answered.

   demo/shim.js calls `window.VISR_DEMO_SUPT.answer(path, method, body, desk)`
   for every `/api/superintendent/*` request, with the in-memory review desk.
   The answers are the shapes tycho/server.py relays (see
   os/superintendent/wire.js for the client side):

     GET  thread?after&thread&subject → {ok, messages, busy, activity, progress, error, threads}
     GET  actions?before&limit        → {ok, actions, more}        (newest first, 15 a page)
     GET  file?id                     → 404, JSON reason: no files are kept in the demo
     GET  speech?id&part              → 409, JSON reason: no voice in the demo
     GET  mode                        → {ok, mode: "ask_first", since, setBy, trial}
     POST mode                        → refused, with why: the demo stays on Ask first
     POST send {text, cards, client_id, thread?, subject?} → {ok, message, busy: true}
     POST decide {offerId, item?, decision, revision, requestId} → {ok, offer} | refusal
     POST undo {receiptId, revision}  → {ok, summary} | refusal

   `path` may carry its query string (or be a URL); for a GET, fields of
   `body` count as query parameters too. On the first call the desk's event
   feed is subscribed: an act or intake you make on the deck yourself goes
   into the action log, and into what the conversation knows ("Since we
   last spoke you parked …"), and turns any chip for that card stale. */
"use strict";

(function (L) {
  const S = L.state, T = L.text;
  const NO_VOICE = "Voice isn't available in the demo.";
  const NO_FILES = "Files aren't kept in the demo.";
  const SKIP = new Set(["mark_working", "clear_working"]);

  const json = (status, out) => typeof Response === "function"
    ? new Response(JSON.stringify(out), { status, headers: { "Content-Type": "application/json" } })
    : { status, ...out };

  function heard(e) {
    if (!e || typeof e !== "object") return;
    const at = e.at ? new Date(e.at).toISOString() : L.clock.iso();
    if (e.type === "act" && e.key && e.action && !SKIP.has(e.action)) {
      if (L.desk.self(e.key, e.action)) return;
      const title = L.desk.title(e.key);
      S.deckActs.push({ key: e.key, action: e.action, title, at });
      if (!["feedback", "later"].includes(e.action)) {
        S.settled.set(e.key, { action: e.action, by: "deck", at, title });
        L.offers.settle(e.key, e.action, "deck");
      }
      L.log.add({ at, tool: "deck_act", label: `You ${L.acts.did(e.action, String(e.key).split(":").pop())} on the deck`,
        summary: `${title}: done from the card itself.`, target: { key: e.key, title } });
    }
    if (e.type === "intake") {
      const p = L.desk.project(e.project) || { ref: String(e.project || "a project") };
      if (L.desk.self(p.ref, "intake")) return;
      L.log.add({ at, tool: "intake_seen", label: `You filed intake for ${p.ref}`, summary: "Filed from the deck; the strategist reads it on its next pass." });
    }
  }

  function parse(path, body, method) {
    const u = path instanceof URL ? path : new URL(String(path || ""), "http://visr-demo.invalid");
    const q = Object.fromEntries(u.searchParams);
    if (method === "GET" && body && typeof body === "object") Object.assign(q, body);
    return { route: u.pathname.replace(/^\/api\/superintendent\/?/, "").replace(/\/$/, ""), q };
  }

  async function answer(path, method = "GET", body = {}, desk = null) {
    if (L.desk.use(desk)) L.desk.on(heard);
    L.seed();
    await L.turns.settle();
    const verb = String(method || "GET").toUpperCase();
    const { route, q } = parse(path, body, verb);
    const b = body && typeof body === "object" ? body : {};

    if (route === "thread" && verb === "GET")
      return L.turns.read({ after: q.after || null, thread: q.thread || null, subject: q.subject || null });
    if (route === "actions" && verb === "GET") {
      const limit = q.limit == null || q.limit === "" ? null : Number(q.limit);
      if (limit !== null && !(Number.isInteger(limit) && limit >= 1 && limit <= 100))
        return { ok: false, code: "invalid", reason: "limit is a whole number from 1 to 100" };
      return L.log.page(q.before || null, limit);
    }
    if (route === "file") return json(404, { ok: false, code: "gone", reason: NO_FILES });
    if (route === "speech") return json(409, { ok: false, code: "demo", reason: NO_VOICE });
    if (route === "mode" && verb === "GET")
      return { ok: true, mode: "ask_first", since: L.clock.ago(60 * 24 * 14), setBy: "default", trial: null };
    if (route === "mode") return { ok: false, code: "refused",
      reason: "The demo stays on Ask first: nothing here acts without your word or your tap." };
    if (route === "send" && verb === "POST") return L.turns.send(b);
    if (route === "decide" && verb === "POST") {
      if (!["yes", "no", "accept"].includes(b.decision)) return { ok: false, code: "invalid", reason: "A decision is yes, no or accept." };
      if ((b.decision === "accept") !== (b.item != null)) return { ok: false, code: "invalid", reason: "An accept names the outcome it accepts; yes and no name none." };
      return L.offers.decide(b);
    }
    if (route === "undo" && verb === "POST") {
      if (typeof b.receiptId !== "string" || typeof b.revision !== "string")
        return { ok: false, code: "invalid", reason: "An undo needs the receipt id and the revision the log showed." };
      const entry = L.log.find(b.receiptId);
      if (!entry) return { ok: false, code: "gone", reason: "Nothing to undo for that receipt: it may already be undone." };
      if (entry.undo.revision !== b.revision)
        return { ok: false, code: "stale", reason: "The receipt changed since the log was read; reopen the log and try again." };
      const out = await L.acts.undo(entry);
      return out.ok ? { ok: true, summary: T.clip(out.summary, 2000) } : { ok: false, code: "refused", reason: out.reason };
    }
    return { ok: false, code: "unsupported", reason: "The demo's Superintendent doesn't answer that." };
  }

  window.VISR_DEMO_SUPT = { answer };
})(window.VISR_SUPT_LIB ||= {});
