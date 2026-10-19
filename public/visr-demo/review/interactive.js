/* REVIEW · interactive — where "Open interactive" stands for an owner.

   IntrinsicOS reports it on owner items only (`interactive: { state, reason?,
   name?, remoteControl?, continuation? }`) and decides which verb follows:
   `interactive` while it can be opened (OPEN INTERACTIVE on the bar),
   `handback` while a session holds the owner (HAND BACK, handback.js). This
   file only says the state in plain words. It never calls anything
   connected that Claude has not reported connected: `launching` is a
   terminal that opened, and `remoteControl` other than `connected` is not
   connected yet. `name` is what the session is called in the Claude app, so
   the desk says to look for it there.

     Interactive.head(item) → nodes for the desk header (none for other kinds)
     Interactive.tag(item)  → the deck paper's short status mark, or null */
"use strict";

const Interactive = {
  info: item => (item?.interactive && typeof item.interactive === "object" ? item.interactive : null),

  /* [line, sentence, tone] for the desk: the footnote line and the plain
     sentence under it. Tone is the footnote's colour: caution where he has
     something to do, red where it failed. */
  say(info) {
    const name = String(info.name || "").trim();
    const look = name ? `Look for ${name} in the Claude app.` : "";
    const reason = String(info.reason || "").trim();
    switch (info.state) {
      case "available":
        return ["INTERACTIVE · AVAILABLE",
          "OPEN INTERACTIVE resumes this owner's session in a terminal on the Mac, with remote control.", ""];
      case "launching":
        return ["INTERACTIVE · STARTING — TERMINAL OPENED, SESSION NOT YET RUNNING",
          `Remote control is not connected yet.${look ? " " + look + " once it is." : ""}`, ""];
      case "open":
        return info.remoteControl === "connected"
          ? [`INTERACTIVE · OPEN · REMOTE CONTROL CONNECTED${name ? " · " + name : ""}`,
            `${look ? look + " " : ""}Hand it back here when you are done.`, ""]
          : [`INTERACTIVE · OPEN · REMOTE CONTROL NOT CONNECTED YET${name ? " · " + name : ""}`,
            `The session is running in a terminal on the Mac.${name ? ` It shows as ${name} in the Claude app once remote control connects.` : ""}`, ""];
      case "handing_back":
        return ["INTERACTIVE · HANDING BACK",
          "The session is closing. The owner continues on the same session once it has exited.", ""];
      case "closed_without_handback":
        return ["INTERACTIVE · CLOSED WITHOUT HANDBACK — HAND IT BACK",
          reason || "The session ended without a handback. HAND BACK returns the owner to automation.", "amber"];
      case "unavailable":
        return ["INTERACTIVE · UNAVAILABLE", reason || "This owner can't be opened interactively now.", ""];
      case "failed":
        return ["INTERACTIVE · FAILED", `${reason || "The last attempt to open it failed."} OPEN INTERACTIVE tries again.`, "bad"];
      default:
        return [`INTERACTIVE · ${String(info.state || "UNKNOWN").replace(/_/g, " ").toUpperCase()}`, reason, ""];
    }
  },

  CONTINUATION: { queued: "CONTINUATION QUEUED", started: "CONTINUATION STARTED", held: "CONTINUATION HELD" },

  /* "unavailable" asks nothing of him (a Codex owner, say), so the desk
     says nothing about it unless a continuation is under way */
  head(item) {
    const info = Interactive.info(item);
    if (!info || (info.state === "unavailable" && !info.continuation?.state)) return [];
    const [line, sentence, tone] = Interactive.say(info);
    const out = [T.el("div", { class: "t-foot t-inter-line" + (tone ? " " + tone : "") }, line),
      sentence ? T.el("p", { class: "t-inter-say" }, sentence) : null];
    const c = info.continuation;
    if (c?.state) {
      const word = Interactive.CONTINUATION[c.state] || `CONTINUATION ${String(c.state).toUpperCase()}`;
      out.push(T.el("div", { class: "t-foot t-inter-line" + (c.state === "held" ? " amber" : "") },
        c.reason ? `${word}: ${c.reason}` : word));
    }
    return [T.el("div", { class: "t-desk-inter", role: "status" }, ...out)];
  },

  /* the deck: only the states that ask something of him or are under way */
  TAGS: { launching: "INTERACTIVE STARTING", open: "INTERACTIVE OPEN", handing_back: "HANDING BACK",
          closed_without_handback: "HAND IT BACK", failed: "INTERACTIVE FAILED" },
  tag(item) {
    const info = Interactive.info(item);
    if (!info) return null;
    const word = Interactive.TAGS[info.state];
    const held = info.continuation?.state === "held";
    if (!word && !held) return null;
    const tone = info.state === "failed" ? "bad" : held || info.state === "closed_without_handback" ? "amber" : "";
    return T.el("span", { class: tone }, word || "CONTINUATION HELD");
  },
};
