/* VISR DEMO · SUPERINTENDENT · facts — how each sample project stands, and who is on what.

   The deck says what waits on you; this says what is moving elsewhere, in
   the same sample world as demo/corpus.js (Harlow's Patients and
   Appointments, Heelwork's exercise names, Larkspur's pickup plan, the
   GlyphDeck handheld, Liturgos slides, IntrinsicOS's local CI). A line
   changes once the deck does: accept Harlow's work and claude/opus moves on
   to cleanup; approve the pickup plan and codex/sol is building it. A
   project this file doesn't know (the corpus can grow) gets a plain line
   from the deck alone.

     L.facts.line(slug) → one or two sentences · L.facts.roster() → [{ agent, what }] */
"use strict";

(function (L) {
  const S = L.state;
  const gone = key => !L.desk.find(key);
  const was = (key, ...actions) => actions.includes(S.settled.get(key)?.action);

  const HARLOW = "owner:hlw-patients-and-appointments", PICKUP = "draft:lsp-pickup-plan",
    NAMES = "owner:hwk-exercise-title-fallback", CI = "decision:dec-41", SLIDES = "status:lit-service-slides",
    TABLET = "chore:gld-31";
  const answered = key => was(key, "feedback") || gone(key);

  const LINES = {
    harlow() {
      if (was(HARLOW, "accept")) return "Patients and Appointments is accepted; claude/opus is tearing down the preview and the emulator builds. The Patients list stays sample-backed until the client's patient cache ships.";
      if (was(HARLOW, "park")) return "Patients and Appointments is parked, so claude/opus has stopped. The PR stays green and unmerged.";
      return "claude/opus finished Patients and Appointments: PR #48 is green and both emulators pass. It waits on your merge and your accept; the Patients list is sample-backed until the client's patient cache ships.";
    },
    heelwork() {
      if (answered(NAMES)) return "codex/astra has your answer on the exercise names and is landing the server fallback. A server-hardening follow-up is in review.";
      return "codex/astra is stopped on one question for you: fall back to the dashboard's names on the server, or leave four exercises unnamed for the trainer to title. A server-hardening follow-up is in review.";
    },
    larkspur() {
      if (was(PICKUP, "approve")) return "codex/sol is building the pickup plan you approved. The application handoff shipped yesterday: a failed notice shows “Didn't send”, with Send again.";
      if (was(PICKUP, "reject", "not_needed")) return "The pickup-plan draft is closed. The application handoff shipped yesterday and is in use.";
      return "The pickup plan is drafted and waits on your approval; nobody has asked for it yet. The application handoff shipped yesterday: a failed notice shows “Didn't send”, with Send again.";
    },
    glyphdeck() {
      const you = gone(TABLET) ? "Your feel check is in" : "You're trying it on the tablet now";
      return `The handheld console for tablets is on the preview, with Studio's PR green. ${you}; it merges after that. Ringfall's lag in big fights is a separate outcome.`;
    },
    liturgos() {
      if (was(SLIDES, "approve")) return "Service slides are parked until the taxonomy redesign lands; the editor audit is saved with the outcome. The feature map and cold-start guide shipped this week.";
      if (was(SLIDES, "reject")) return "claude/sonnet is carrying on with service slides on the current arrangement model. The feature map and cold-start guide shipped this week.";
      return "claude/sonnet asks to park service slides until the taxonomy redesign lands. The feature map and cold-start guide shipped this week.";
    },
    vault() {
      const ci = was(CI, "approve") ? "claude/opus is enrolling the private repos in local CI, merging each runner change once its run is green"
        : "Local CI runs on the Mac for IntrinsicOS; the rollout to the private repos waits on your answer and on the GitHub App, a task that's yours";
      return `${ci}. codex/sol is making owners recover safely when a worktree is left on another branch. The docked chat shipped yesterday.`;
    },
  };

  const facts = {
    line(slug) { return (LINES[slug] || (() => "No work of its own is running right now."))(); },

    roster() {
      const opus = was(HARLOW, "accept") ? "Harlow patients and appointments: accepted, cleaning up the preview."
        : was(HARLOW, "park") ? "Harlow patients and appointments: parked by you, so stopped."
          : gone(HARLOW) ? "Harlow patients and appointments: off your deck; waiting for its next turn."
            : "Harlow patients and appointments: finished, waiting on your merge and accept.";
      const ci = was(CI, "approve") ? " Also enrolling the private repos in local CI." : " Also running the local CI rollout, which waits on your answer.";
      const sol = was(PICKUP, "approve") ? " And the Larkspur pickup plan: building it now that you've approved it."
        : was(PICKUP, "reject", "not_needed") ? "" : " Starts the Larkspur pickup plan if you approve it.";
      return [
        { agent: "claude/opus", what: opus + ci },
        { agent: "codex/sol", what: `IntrinsicOS owner-branch recovery: working, tests first.${sol}` },
        { agent: "codex/astra", what: answered(NAMES) ? "Heelwork exercise names: landing the server fallback, with your answer."
          : "Heelwork exercise names: waiting on your call, server fallback or a task for the trainer." },
        { agent: "claude/sonnet", what: was(SLIDES, "approve") ? "Liturgos service slides: parked until the taxonomy lands, so free."
          : "Liturgos service slides: audit done, asking to park until the taxonomy redesign lands." },
      ];
    },
  };

  L.facts = facts;
})(window.VISR_SUPT_LIB ||= {});
