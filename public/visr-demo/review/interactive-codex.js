"use strict";
const InteractiveCodex = {
    is: info => info?.provider === "codex",
    OPENING: { label: "OPENING…", say: "Opening in ChatGPT → Codex…" },
    say(info) {
        const name = String(info.name || "").trim();
        const reason = String(info.reason || "").trim();
        switch (info.state) {
            case "available":
                return ["INTERACTIVE · AVAILABLE",
                    "OPEN INTERACTIVE continues this owner's session in the Codex app.", ""];
            case "launching":
                return ["INTERACTIVE · STARTING — NOT YET OPEN IN THE CODEX APP",
                    `The Codex app does not have the session yet.${name ? ` Look for ${name} there once it does.` : ""}`, ""];
            case "open":
                return [`INTERACTIVE · OPEN · IN THE CODEX APP${name ? " · " + name : ""}`,
                    `${reason ? reason + " " : ""}${name ? `Look for ${name} in the Codex app. ` : ""}When you are done, say $handback in the chat, or HAND BACK here.`, ""];
            case "handing_back":
                return reason
                    ? ["INTERACTIVE · HANDING BACK — NOT DONE YET",
                        `${reason} The Mac keeps trying on its own.`, "amber"]
                    : ["INTERACTIVE · HANDING BACK",
                        "The owner continues headlessly in the same chat once its current turn in the Codex app has finished.", ""];
            default:
                return null;
        }
    },
    link: info => /^codex:\/\//i.test(String(info.deepLink || "")) ? String(info.deepLink) : null,
    extras(info) {
        const href = InteractiveCodex.link(info);
        const from = String(info.forkedFrom || "").trim().slice(0, 8);
        return [
            from ? T.el("p", { class: "t-inter-say" }, `Continued in a Codex app chat, forked from ${from}`) : null,
            href ? T.el("a", { class: "t-btn primary t-inter-open", href }, "OPEN IN CODEX") : null,
        ].filter(Boolean);
    },
};
