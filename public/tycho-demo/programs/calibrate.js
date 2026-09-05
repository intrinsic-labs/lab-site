/* CALIBRATE — the gho-38 disagreement sheet as a native TychoOS program.
   Blind protocol: the engines' split stays hidden until Asher's mark commits,
   then reveals so he can see how they fell. Writes go through /api/label into
   the real corpus sheet; `ghost stage2-score` reads the result unchanged.

   It stands on the same bench REPLAY does (`primitives/bench.js`): FLIP CARD
   deck on the left — the cards themselves are the navigation — the moment on
   an INDEX CARD on the right, and three RUBBER STAMPS standing on a rest
   beside it: HIT (the affirmative green), WEAK (amber), MISS (red). A stamp is
   PICKED UP and DROPPED on the paper, and the drop is the commit, so the notes
   go where they can be written BEFORE the hand comes down: one ruled line at
   the foot of the card, which is what a margin note on a real sheet is. Same
   writes, same telemetry, plus the stamp's carry trace under
   `telemetry.stamp`. */
"use strict";

Tycho.register({
  id: "calibrate", kind: "disagreement",
  title: "CALIBRATE", glyph: "▟▙",
  blurb: "The disagreement sheet. Blind protocol: the engines' split stays\nhidden until your mark commits, then reveals so you can see how they fell.\nWrites land in the real corpus sheet.",

  async mount(w) {
    let notes = null;

    await Tycho.bench({
      w,
      path: "/api/sheet/disagreement",
      title: s => `CALIBRATE — ${s}`,
      done: it => !!it.verdict,
      doneWord: "marked",
      key: it => it.event_id,
      heading: it => it.heading,
      /* HIT is the affirmative verdict, so it wears the OS's one green
         (2026-09-02); WEAK and MISS keep amber and red */
      faces: [{ id: "HIT", label: "HIT", tone: "ok" },
              { id: "WEAK", label: "WEAK", tone: "amber" },
              { id: "MISS", label: "MISS", tone: "red" }],
      inkId: it => it.verdict,
      reveal: { cap: "THE ENGINES SPLIT", of: it => it.engines },

      card(it, bench) {
        /* the back-talk line — the one thing on this screen that is not a
           closed choice, and it sits on the card because that is what a margin
           note is */
        notes = T.el("input", { class: "t-card-note", type: "text",
          placeholder: "why, in your words — optional" });
        if (it.notes) notes.value = it.notes;
        if (it.verdict) notes.disabled = true;
        notes.addEventListener("input", e => bench.tele.input(e), { once: true });

        return {
          body: T.md(it.body),
          foot: T.el("div",
            { style: "display:flex;align-items:center;gap:12px;flex:1;min-width:0" },
            notes, T.el("span", { class: "item-of", style: "flex:none" },
                        `ITEM ${bench.ord(it.n)} / ${bench.items.length}`)),
          onLock: () => { notes.disabled = true; },
        };
      },

      payload: (it, picked, trace, tele) => ({
        kind: "disagreement", id: it.event_id,
        verdict: picked, notes: notes.value,
        telemetry: { ...tele.payload(notes.value.length), stamp: trace },
      }),
      /* `sent.notes` rather than `notes.value`: the input belongs to whichever
         card is in front, and this runs after the write came back */
      apply: (it, picked, out, sent) => {
        it.verdict = picked; it.notes = sent.notes;
        if (out.reveal) it.engines = out.reveal;
      },

      /* the notes line is a real text field: nothing on this screen may steal
         a keystroke out of it */
      keys: e => e.target === notes,
    });
  },
});
