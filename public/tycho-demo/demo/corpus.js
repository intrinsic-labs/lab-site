/* TYCHO DEMO · the synthetic corpus.

   Everything the hosted demo shows comes from here, and all of it is invented:
   the Hollowmere Survey is a fictional field study, its surveyor is a
   fictional person, and no cabinet, drawer, file or sheet below corresponds
   to anything real. The shape mirrors what the real server would answer —
   ROOT/<cabinet>/<drawer>/<files>, loose files at ROOT as the DESK, a
   captions sidecar, and one disagreement sheet for CALIBRATE — so the shell
   runs unmodified against it (demo/shim.js is the server). */
"use strict";

(function () {
  const DAY = 86400;
  const T0 = 1756900000; // a fixed "now", so the dates never drift
  const at = daysAgo => T0 - daysAgo * DAY;
  const file = (name, text, daysAgo) => ({ kind: "file", name, mtime: at(daysAgo), text });
  const dir = (name, children, daysAgo) => ({ kind: "dir", name, mtime: at(daysAgo), children });

  const ROOT = dir("", [
    /* -- DESK: loose files at ROOT ------------------------------------- */
    file("read-me.md", `# The Hollowmere Survey

A season's field notes on the mere and its margin, kept by one surveyor
and filed here as she left them.

**How this desk is arranged.** Field notes by season; specimens by kind;
correspondence by whether it was sent. Loose things stay on the desk
until they earn a drawer.

**On the record.** A note written the same day is the record. A note
rewritten later is a memory, and is marked as one.`, 2),
    file("to-do.txt", `- re-count the heron roost before the leaves come down
- send the moss sheets to the museum (ask first — see LETTERS)
- decide whether the "second" warbler was a second warbler
- weather log: fill the gap from the week of rain`, 1),
    file("weather.csv", `date,dawn_temp_c,wind,sky,mere_level_cm
day 61,7,light NW,clear,-3
day 62,9,calm,haze,-3
day 63,11,SW freshening,overcast,-2
day 64,8,W strong,rain,+4
day 65,6,NW,clearing,+6
day 66,5,calm,clear,+5`, 3),

    /* -- FIELD NOTES ---------------------------------------------------- */
    dir("Field Notes", [
      dir("Spring", [
        file("day-04.md", `# Day 4 — first walk of the margin

Reed edge on the north shore already loud. Two warblers I could hear
and not see; one I could see and not name.

The heron roost is where it was last year: nine birds at dusk, the
same alders. Marked the count as **certain**.`, 118),
        file("day-11.md", `# Day 11 — the second warbler

Same reed edge, same hour. The unnamed bird again — or a second one.
Longer phrase, drops at the end. I wrote "second warbler" and then
struck it: I have one description and two guesses.

Left it as an open question in the margin.`, 111),
        file("day-19.md", `# Day 19 — water rising

Mere up four centimetres after the rain; the sedge shelf on the east
bank is under. The moss on the boathouse steps is a different green
where the water reached it. Took a sheet of each.`, 103),
      ], 103),
      dir("Summer", [
        file("day-47.md", `# Day 47 — the roost, recounted

Eleven herons, not nine. Either two arrived or I miscounted in April.
I am recording eleven and marking April as **probably low** rather
than rewriting it. The April note stays as written.`, 75),
        file("day-52.md", `# Day 52 — dragonflies over the shelf

The east shelf is dry again and the sedge is standing. Hawkers over it
all afternoon. Not my subject, noted because the shelf recovering is.`, 70),
      ], 70),
      dir("Autumn", [
        file("day-88.md", `# Day 88 — leaves down, roost visible

Counted the roost properly with the alders bare: **eleven**. Summer's
count holds. The spring count was low.

This is the thing I keep learning: the first count is a guess with a
number on it, and the number makes it feel like more than a guess.`, 34),
      ], 34),
    ], 34),

    /* -- SPECIMENS ------------------------------------------------------ */
    dir("Specimens", [
      dir("Birds", [
        file("heron-roost.md", `# Grey heron — the alder roost

Site: north shore alders, above the reed edge.

| count | day | confidence |
|---|---|---|
| 9 | 4 | certain (at the time) |
| 11 | 47 | probable |
| 11 | 88 | certain — trees bare |

The spring count is kept, and marked. Corrections are additions here,
never erasures.`, 34),
        file("reed-warbler-q.md", `# Reed-edge warbler(s) — open question

One bird described on day 4, a longer phrase on day 11. Two guesses,
one description. Status: **unresolved**, and honestly so. Nothing
downstream of this note may treat it as two birds.`, 111),
      ], 34),
      dir("Mosses", [
        file("boathouse-steps.md", `# Boathouse steps — two sheets

Two sheets taken day 19: one from the dry riser, one from the tread the
flood reached. Same species, I think; the green differs with the water.
Pressed, labelled by step, awaiting the museum's answer on where to
send them.`, 103),
        file("sheet-labels.csv", `sheet,site,day,note
M-01,boathouse steps (riser),19,dry
M-02,boathouse steps (tread),19,reached by flood
M-03,east shelf sedge base,52,after recovery`, 70),
      ], 70),
    ], 34),

    /* -- CORRESPONDENCE ------------------------------------------------- */
    dir("Correspondence", [
      dir("Letters", [
        file("to-the-museum.md", `# To the museum — on the moss sheets

Sent day 71.

I have three moss sheets from the mere I would rather you held than I.
Before I post them: do you want the two from the steps as a pair? They
are the same plant under two conditions, and I think the pair is the
specimen, not either sheet.`, 69),
        file("from-the-museum.md", `# From the museum — reply

Received day 80.

Send the pair as a pair, and label the condition on each. We would
also take the sedge-base sheet. Whatever you do, do not separate what
you observed together.`, 60),
      ], 60),
      dir("Drafts", [
        file("season-summary-draft.md", `# The season, in one page (draft)

What I am sure of: eleven herons; the east shelf floods and recovers
in a season; the boathouse moss reads the water line.

What I am not: how many warblers. One description, two guesses, and I
have decided the honest number is "at least one".

Draft. Not sent to anyone.`, 5),
      ], 5),
    ], 5),
  ], 1);

  /* drawer captions — the sidecar the real server keeps (files.py · label) */
  const LABELS = {
    "@programs": { meta: "WHAT THE MACHINE CAN RUN" },
    "@desk": { meta: "LOOSE UNTIL IT EARNS A DRAWER" },
    "Field Notes/Spring": { meta: "DAYS 1–30 · FIRST PASS" },
    "Field Notes/Summer": { meta: "DAYS 31–60 · RECOUNTS" },
    "Field Notes/Autumn": { meta: "DAYS 61–90 · TREES BARE" },
    "Specimens/Birds": { meta: "COUNTS, WITH THEIR CONFIDENCE" },
    "Specimens/Mosses": { meta: "THREE SHEETS, PRESSED" },
    "Correspondence/Letters": { meta: "SENT AND RECEIVED" },
    "Correspondence/Drafts": { meta: "NOT SENT TO ANYONE" },
  };

  /* the disagreement sheet CALIBRATE deals from. Each item is a call the
     surveyor made; two fictional engines scored it and split. The split is
     withheld until the person's own mark commits (the blind protocol), then
     revealed as `engines`. */
  const SHEET = {
    name: "hollowmere-disagreement-01.md",
    items: [
      {
        n: 1, event_id: "hm-004", heading: "Day 4 — the roost count",
        body: `**The call.** Nine herons at dusk, marked **certain**.

**What followed.** Eleven on day 47 and again on day 88, with the trees bare.

Was marking the first count **certain** the right call at the time?`,
        engines: `| engine | call | why |
|---|---|---|
| A | MISS | "certain" on a leafed-out roost at dusk overstated what she could see |
| B | WEAK | the count was honest; the confidence word was the error |`,
        verdict: "", notes: "",
      },
      {
        n: 2, event_id: "hm-011", heading: "Day 11 — striking “second warbler”",
        body: `**The call.** She wrote "second warbler", then struck it and left the question open.

**What followed.** The question is still open at the season's end, and the summary says "at least one".

Was striking it — rather than keeping the guess — the right call?`,
        engines: `| engine | call | why |
|---|---|---|
| A | HIT | one description cannot support two birds; the strike is the honest record |
| B | HIT | agrees — and notes the margin question is what made the summary honest |`,
        verdict: "", notes: "",
      },
      {
        n: 3, event_id: "hm-047", heading: "Day 47 — recount without rewriting",
        body: `**The call.** Eleven herons recorded; the April note kept as written and marked **probably low**.

**The alternative.** Correct the April note to eleven so the record is consistent.

Was keeping the wrong number, marked, better than fixing it?`,
        engines: `| engine | call | why |
|---|---|---|
| A | HIT | a corrected note hides that a correction happened |
| B | MISS | a reader of April alone is misled; the mark should live on that page too |`,
        verdict: "", notes: "",
      },
      {
        n: 4, event_id: "hm-071", heading: "Day 71 — asking before posting the sheets",
        body: `**The call.** Wrote to the museum asking whether to send the two step sheets as a pair, instead of just sending them.

**What followed.** The museum answered: as a pair, and label the condition on each.

Was the letter worth the nine days it cost?`,
        engines: `| engine | call | why |
|---|---|---|
| A | WEAK | the answer was predictable; she could have sent the pair and said why |
| B | HIT | the pairing was a judgment about the specimen, and she asked the party it was for |`,
        verdict: "", notes: "",
      },
    ],
  };

  window.TYCHO_DEMO_CORPUS = { ROOT, LABELS, SHEET, rootPath: "/hollowmere/desk" };
})();
