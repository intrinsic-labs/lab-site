/* REVIEW · working — "I'm on it": Asher's own mark that he is working on an
   item himself (an interactive chore, a session he is in the middle of).

   The mark is IntrinsicOS's (`working: {since}` on the item, set and cleared
   with the universal `mark_working` / `clear_working` acts). It never
   resolves anything: every verb stays on the bar. It belongs to the item's
   revision, so when the content changes the runtime drops it and says so
   once (`workingCleared: {markedAt, reason: "revised"}`) until he marks it
   again or dismisses the notice (`clear_working`).

   Lit in the ink at full (`--working`), so it reads apart from LATER (amber)
   and from an answer waiting on the system (`--wait`).

     Working.on(item) · Working.tag(item) (the deck's status mark)
     Working.head(item, { dismiss }) (the desk header's line or notice)
     Working.toggle(item, { press }) → { el, set(item) } (the top bar's toggle;
       disabled while its request is in flight) */
"use strict";

const Working = {
  on: item => !!item?.working,

  /* the paper's status mark: lit while he is on it, a quiet word when the
     runtime dropped his mark because the item changed */
  tag(item) {
    if (Working.on(item)) return T.el("span", { class: "t-working-tag" }, "YOU'RE ON IT");
    if (item?.workingCleared) return T.el("span", {}, "WORKING MARK CLEARED");
    return null;
  },

  /* the desk header: since when, or why the mark is gone */
  head(item, { dismiss }) {
    if (Working.on(item)) {
      const since = Fmt.clock(item.working.since);
      return [T.el("div", { class: "t-foot t-working" },
        T.el("span", { class: "t-working-tag" }, "YOU'RE WORKING ON THIS"),
        /* the space stays outside the unbreakable "SINCE …": inside it,
           Safari has nowhere to wrap and the page scrolls sideways */
        ...(since ? [" ", T.el("span", { class: "t-working-since" }, `SINCE ${since}`)] : []))];
    }
    const gone = item?.workingCleared;
    if (!gone) return [];
    const at = Fmt.clock(gone.markedAt);
    const ok = T.el("button", { class: "t-btn tiny", type: "button" }, "DISMISS");
    ok.onclick = async () => {
      if (ok.disabled) return;
      ok.disabled = true;
      await dismiss();
      ok.disabled = false;
    };
    return [T.el("div", { class: "t-note t-working-gone", role: "status" },
      T.el("div", { class: "t-label" }, "YOUR WORKING MARK WAS CLEARED"),
      T.el("p", {}, `This changed after you marked it${at ? " at " + at : ""}, so the mark didn't carry over. `
        + "Press I'M ON IT again if you still are."),
      T.el("div", { class: "t-row" }, ok))];
  },

  /* one button, pressed while he is on it; a press sends the opposite */
  toggle(item, { press }) {
    const el = T.el("button", { class: "t-btn t-working-toggle", type: "button" }, "I'M ON IT");
    const set = it => {
      el.setAttribute("aria-pressed", String(Working.on(it)));
      el.title = Working.on(it) ? "You're on it. Press to clear the mark." : "Mark that you're working on this yourself.";
    };
    set(item);
    el.onclick = async () => {
      if (el.disabled) return;
      el.disabled = true; el.setAttribute("aria-busy", "true");
      try { await press(el.getAttribute("aria-pressed") === "true" ? "clear_working" : "mark_working"); }
      finally { el.disabled = false; el.setAttribute("aria-busy", "false"); }
    };
    return { el, set };
  },
};
