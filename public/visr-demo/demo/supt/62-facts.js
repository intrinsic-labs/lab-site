/* VISR DEMO · SUPERINTENDENT · facts — how each invented project stands, and who is on what.

   The deck says what waits on you; this says what is moving elsewhere, in
   the same fiction as demo/corpus.js (Northwind's launch, Orchard's season
   planner, Lanternfish's sonar calibration). A line changes once the deck
   does: accept the launch checklist and agent/birch is free; approve the
   planner draft and agent/ash is building it. A project this file doesn't
   know (the corpus can grow) gets a plain line from the deck alone.

     L.facts.line(slug) → one or two sentences · L.facts.roster() → [{ agent, what }] */
"use strict";

(function (L) {
  const S = L.state;
  const gone = key => !L.desk.find(key);
  const was = (key, ...actions) => actions.includes(S.settled.get(key)?.action);

  const CHECKLIST = "owner:nw-launch-checklist", PLANNER = "draft:orc-season-planner", SONAR = "owner:lan-sonar-tuning";

  const LINES = {
    northwind() {
      if (was(CHECKLIST, "accept")) return "The launch checklist is accepted. DNS moves Thursday at 14:00, and forty-one redirects still need the client's confirmation.";
      if (was(CHECKLIST, "park")) return "The launch checklist is parked, so agent/birch has stopped. DNS is still booked for Thursday at 14:00.";
      return "agent/birch finished the launch checklist and it waits on your accept. DNS moves Thursday at 14:00; forty-one redirects need the client's confirmation.";
    },
    orchard() {
      if (was(PLANNER, "approve")) return "agent/ash is building the season planner you approved. The yield import shipped yesterday, so it reads real yields.";
      if (was(PLANNER, "reject", "not_needed")) return "The season planner draft is closed. The yield import shipped yesterday and is in use.";
      return "The season planner is drafted and waits on your approval; the open question is whether growers share one frost date. The yield import shipped yesterday.";
    },
    lanternfish() {
      if (was(SONAR, "feedback") || gone(SONAR)) return "agent/cedar has your answer on the sonar and is calibrating. The lake test waits until the sonar reads within half a metre.";
      return "agent/cedar is stopped on one question for you: calibrate the sonar against the tank now, or wait for a dock test next week. The lake test is asking to be parked until it's tuned.";
    },
  };

  const facts = {
    line(slug) { return (LINES[slug] || (() => "No work of its own is running right now."))(); },

    roster() {
      const birch = was(CHECKLIST, "accept") ? "Northwind launch checklist: accepted, so free for the next outcome."
        : was(CHECKLIST, "park") ? "Northwind launch checklist: parked by you, so stopped."
          : gone(CHECKLIST) ? "Northwind launch checklist: off your deck; waiting for its next turn."
            : "Northwind launch checklist: finished and waiting on your accept.";
      const ash = was(PLANNER, "approve") ? "Orchard season planner: building it now that you've approved it."
        : was(PLANNER, "reject", "not_needed") ? "Orchard season planner: the draft was closed, so idle."
          : "Orchard season planner: drafted it from your intake note; starts building once you approve.";
      return [
        { agent: "agent/birch", what: birch },
        { agent: "agent/cedar", what: was(SONAR, "feedback") || gone(SONAR) ? "Lanternfish sonar tuning: calibrating, with your answer."
          : "Lanternfish sonar tuning: waiting on your call, tank or dock." },
        { agent: "agent/ash", what: ash },
      ];
    },
  };

  L.facts = facts;
})(window.VISR_SUPT_LIB ||= {});
