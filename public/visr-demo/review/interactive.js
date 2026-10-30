"use strict";
const Interactive = {
    info: item => (item?.interactive && typeof item.interactive === "object" ? item.interactive : null),
    say(info) {
        if (InteractiveCodex.is(info)) {
            const said = InteractiveCodex.say(info);
            if (said)
                return said;
        }
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
    opening: item => InteractiveCodex.is(Interactive.info(item)) ? InteractiveCodex.OPENING
        : { label: "OPENING…", say: "Opening a terminal on the Mac. This takes a few seconds." },
    CONTINUATION: { queued: "CONTINUATION QUEUED", started: "CONTINUATION STARTED", held: "CONTINUATION HELD" },
    promoted: item => Interactive.info(item)?.state === "failed",
    QUIET: new Set(["unavailable", "available"]),
    head(item) {
        const info = Interactive.info(item);
        if (!info || (Interactive.QUIET.has(info.state) && !info.continuation?.state))
            return [];
        const out = [];
        if (info.state !== "available") {
            const [line, sentence, tone] = Interactive.say(info);
            out.push(T.el("div", { class: "t-foot t-inter-line" + (tone ? " " + tone : "") }, line), sentence ? T.el("p", { class: "t-inter-say" }, sentence) : null);
            if (InteractiveCodex.is(info))
                out.push(...InteractiveCodex.extras(info));
        }
        const c = info.continuation;
        if (c?.state) {
            const word = Interactive.CONTINUATION[c.state] || `CONTINUATION ${String(c.state).toUpperCase()}`;
            out.push(T.el("div", { class: "t-foot t-inter-line" + (c.state === "held" ? " amber" : "") }, c.reason ? `${word}: ${c.reason}` : word));
        }
        return [T.el("div", { class: "t-desk-inter", role: "status" }, ...out)];
    },
    TAGS: { launching: "INTERACTIVE STARTING", open: "INTERACTIVE OPEN", handing_back: "HANDING BACK",
        closed_without_handback: "HAND IT BACK", failed: "INTERACTIVE FAILED" },
    tag(item) {
        const info = Interactive.info(item);
        if (!info)
            return null;
        const word = Interactive.TAGS[info.state];
        const held = info.continuation?.state === "held";
        if (!word && !held)
            return null;
        const tone = info.state === "failed" ? "bad" : held || info.state === "closed_without_handback" ? "amber" : "";
        return T.el("span", { class: tone }, word || "CONTINUATION HELD");
    },
};
