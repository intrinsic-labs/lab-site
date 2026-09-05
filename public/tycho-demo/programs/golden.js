/* REPLAY — the gho-33 golden sheet: did the ghost make YOUR decision?
   The meta-judge's pre-fill is withheld until the label commits (the paper
   sheet showed it inline; blind-then-reveal keeps the 85% gate honest).
   Writes land in the real evals/golden sheet; `ghost golden-score` unchanged.

   IT WAS CALLED GOLDEN UNTIL 2026-09-02 (Asher: "Golden is a terrible
   application name that doesn't say anything about what it is"). What the
   program shows you is a REPLAY — a moment out of a real session, played
   back, with the ghost's answer beside your own. Only the NAME moved: the
   registered id, the API kind and the sheet on disk are all still `golden`,
   because the server, the corpus and `ghost golden-score` key on that word,
   and renaming a wire contract to fix a label is how a rename breaks a
   pipeline.

   The bench it runs on is `primitives/bench.js` — the deck on the left, the
   paper on the right, the stamps on their rest, the reveal underneath — and
   is shared with CALIBRATE. What is left in here is only what is REPLAY's:
   the sheet it reads, the fair-test question, and what goes over the wire.
   Byte-for-byte what the segmented control used to send, plus the stamp's own
   trace under `telemetry.stamp` — which is the whole reason the primitive
   exists. */
"use strict";

Tycho.register({
  id: "golden", kind: "golden",
  title: "REPLAY", glyph: "◈",
  blurb: "Replays of your own turns — did the ghost make YOUR decision? The\nmeta-judge's pre-fill is withheld until the label commits, which is what\nkeeps the 85% gate honest.",

  async mount(w) {
    /* A LABEL THAT ONLY NAMES THE BLOCK UNDER IT IS NOT CONTENT (Asher,
       2026-09-02): the fenced excerpt under "**Context tail:**" is
       self-evidently the context tail. It is the SHEET'S OWN CAPTION SHAPE
       that is matched and nothing wider — a TOP-LEVEL bold-only paragraph
       sitting directly on top of the block it names, whose whole text is that
       one bold run. "**You actually said:** …" carries text of its own, so it
       stays; and a `**bold line**` inside a fenced conversation tail is inside
       a `<pre>`, so it is never a candidate at all. */
    function unlabel(node) {
      for (const p of [...node.querySelectorAll(":scope > p")]) {
        const only = p.children.length === 1 && p.firstElementChild?.tagName === "STRONG";
        if (only && p.textContent.trim() === p.firstElementChild.textContent.trim()
            && p.nextElementSibling?.tagName === "PRE") p.remove();
      }
      return node;
    }

    let fair = null, ticks = null;

    await Tycho.bench({
      w,
      path: "/api/sheet/golden",
      title: s => `REPLAY — ${s}`,
      done: it => !!it.label,
      doneWord: "labelled",
      key: it => it.n,
      heading: it => it.heading,
      faces: [{ id: "y", label: "SAME DECISION", tone: "ok" },
              { id: "n", label: "DIFFERENT", tone: "red" }],
      inkId: it => it.label[0].toLowerCase(),
      reveal: { cap: "THE JUDGE HAD SAID", of: it => it.judge,
                empty: "_(no pre-fill)_" },

      card(it, bench) {
        /* TWO BOXES, MUTUALLY EXCLUSIVE, AND ONE MUST BE TICKED (Asher,
           2026-09-02). It used to be a single tick defaulting to FAIR TEST,
           which meant the commonest value on the wire was one nobody had ever
           actually answered. `fair` starts null on an unlabelled item and the
           stamp will not land until it isn't.

           ONLY A LABELLED ITEM'S `fair` IS TRUSTED (2026-09-02): `eval/run.py`
           writes a heuristic guess into that field at sheet time, so EVERY
           item carries one — reading it back meant the guard never fired once
           in its life and the judge's own guess went over the wire wearing
           Asher's answer. The WIRE is unchanged — y or n, exactly as before;
           this changes who decided it, not what is written. */
        fair = it.label ? !/n/i.test(it.fair) : null;
        const paintTicks = () => {
          yes.classList.toggle("on", fair === true);
          no.classList.toggle("on", fair === false);
        };
        const mk = (val, label) => {
          const t = T.el("button", { class: "t-tick", type: "button" },
            T.el("span", { class: "box" }), T.el("span", { class: "lab" }, label));
          t.onclick = e => {
            if (bench.stamp?.locked) return;
            bench.tele.input(e); fair = val; paintTicks(); bench.status();
          };
          return t;
        };
        const yes = mk(true, "FAIR TEST"), no = mk(false, "NOT A FAIR TEST");
        ticks = T.el("div", { class: "t-ticks" }, yes, no);
        paintTicks();

        return {
          body: unlabel(T.md(it.body)),
          foot: T.el("div",
            { style: "display:flex;align-items:center;gap:12px;flex:1;min-width:0" },
            ticks, T.el("span", { style: "flex:1" }),
            T.el("span", { class: "item-of" },
                 `ITEM ${bench.ord(it.n)} / ${bench.items.length}`)),
          /* the fair-test question is the precondition, and the refusal is
             physical: the stamp springs back to its rest and the two boxes
             say why, in the status bar and in their own colour */
          guard: () => fair !== null,
          onRefuse: () => {
            ticks.classList.remove("pulse");
            void ticks.offsetWidth;             /* restart the animation */
            ticks.classList.add("pulse");
            bench.status(T.el("span", { class: "red" },
              "TICK FAIR TEST OR NOT A FAIR TEST FIRST"));
          },
          onLock: () => ticks.querySelectorAll(".t-tick")
            .forEach(t => { t.disabled = true; }),
        };
      },

      payload: (it, picked, trace, tele) => ({
        kind: "golden", id: it.n, label: picked,
        fair: fair ? "y" : "n",
        telemetry: { ...tele.payload(null), stamp: trace },
      }),
      /* `sent` rather than `fair`: the tick boxes belong to whichever card is
         in front, and this runs after the write came back */
      apply: (it, picked, out, sent) => {
        it.label = picked; it.fair = sent.fair; it.judge = out.reveal;
      },

      keys(e, bench) {
        /* f walks the fair-test answer: unanswered → FAIR TEST → NOT A FAIR TEST */
        if (e.key === "f") {
          ticks?.querySelector(fair === true
            ? ".t-tick:last-child" : ".t-tick:first-child")?.click();
          return true;
        }
        /* y/n are the sheet's own vocabulary and predate the stamp; they map
           onto the two stamps rather than becoming a second way to answer */
        if (e.key === "y") { bench.stamp?.key({ key: "1" }); return true; }
        if (e.key === "n") { bench.stamp?.key({ key: "2" }); return true; }
        return false;
      },
    });
  },
});
