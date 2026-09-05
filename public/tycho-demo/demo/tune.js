/* TYCHO DEMO · tuning the vendored shell for a page it did not expect to be on.

   Loaded after every program has registered and before the scene module runs.
   Three adjustments, none of them edits to the shell's own files:

   1. The programs that need a Mac are hidden. TERM opens a pty on the server,
      INTAKE files tasks into a real vault, GOLDEN deals from a corpus sheet the
      demo does not carry. Hidden programs never appear in PROGRAMS or the
      dock; the shim refuses their wires too, in case a verb reaches them.
   2. The boot ritual is shortened. Twelve seconds is right for a machine you
      own and long for a demo a stranger tapped on; the same stages play at a
      little under half pace.
   3. CALIBRATE's blurb says the truth about where marks go here. */
"use strict";

(function () {
  for (const id of ["term", "intake", "golden"]) {
    const p = Tycho.programs.get(id);
    if (p) p.hidden = true;
  }
  Tycho.PINNED = [];

  const cal = Tycho.programs.get("calibrate");
  if (cal) cal.blurb = "The disagreement sheet. Blind protocol: the engines' split stays\nhidden until your mark commits, then reveals so you can see how they fell.\nDemo: your marks last until the page reloads.";

  const PACE = 0.45;
  const at = Boot.at.bind(Boot);
  Boot.at = (started, ms) => at(started, ms * PACE);
})();
