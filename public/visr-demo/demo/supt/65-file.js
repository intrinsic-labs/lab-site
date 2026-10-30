/* VISR DEMO · SUPERINTENDENT · filing — an idea, said in words, filed as a project's intake.

   Two slots, the project and the note. Said in one go ("file an idea for
   Larkspur: text families the day before pickup") it is filed at once;
   otherwise whatever is missing is asked for, one question at a time, and
   the answer fills it ("file an idea" → "Which project?" → "Larkspur" →
   "What's the idea?" → the idea). An idea with no project named goes where
   it plainly belongs ("the litter…" is Larkspur) or is asked about. A project
   thread files to its own project. "Never mind" drops it; a clearly
   different request while a question waits drops the question and is
   answered instead.

   Filing goes through the desk (`desk.fileIntake`), lands in the action
   log, and the reply says where it went and that it lives only in this
   browser.

     L.filing.start(c, ctx, msg, replyId) · L.filing.fill(ctx, msg, replyId) → reply | null (not an answer) */
"use strict";

(function (L) {
  const T = L.text, S = L.state;

  const LEADS = [
    /^(please|can you|could you|would you|hey|ok|okay|so|and)[\s,]+/i,
    /^(i(?: have|'ve|’ve|ve| had|'d|’d)?(?: just)? (?:got|have|had)? ?(an|a|one more|another) (idea|thought)|here is (an|a) (idea|thought)|(a |one )?(quick |new )?(idea|thought))[\s,:-]*/i,
    /^(file|note|jot( down)?|capture|write down|remember|log|add|make)( (an|a|this|that|my|the|one))?( (new|quick))?( (idea|note|thought|intake))?[\s,:-]*/i,
    /^(down|it|this)[\s,:-]+/i,
    /^(for|to|about|in|under|on|into)( the)? \S+( project| intake)?[\s,:-]*/i,
    /^(that|saying)\s+/i,
  ];

  function names() { return L.projects.names(); }

  /* the idea itself, without "file an idea for Larkspur:" and the like */
  function noteOf(raw) {
    let s = String(raw || "").trim();
    const colon = /^[^:]{0,80}:\s*([\s\S]+)$/.exec(s);
    if (colon && T.words(colon[1]).length >= 2) s = colon[1].trim();
    else {
      for (let again = true; again;) {
        again = false;
        for (const re of LEADS) {
          const next = s.replace(re, "");
          /* "for <x>" is only a lead-in when <x> is a project */
          if (next !== s && (!/^(for|to|about|in|under|on|into)\b/i.test(s) || L.projects.find(s.slice(0, s.length - next.length))))
            { s = next.trim(); again = true; }
        }
      }
    }
    for (const p of L.desk.projects()) s = s.replace(new RegExp(`\\s+(for|in|to|under) (the )?${p.name}( project)?\\.?$`, "i"), "");
    s = s.replace(/^["“]|["”]$/g, "").trim();
    return T.words(s).length >= 3 ? T.cap(s) : null;
  }

  const filing = {
    noteOf,

    start(c, ctx, msg, replyId) {
      const note = noteOf(msg.text);
      const at = note ? msg.text.toLowerCase().indexOf(note.toLowerCase().slice(0, 12)) : -1;
      const lead = at > 0 ? msg.text.slice(0, at) : msg.text;
      let project = L.projects.find(lead) || (ctx.project ? L.desk.project(ctx.project) : null);
      let inferred = false;
      if (!project && note) { project = L.projects.find(note, { loose: true }); inferred = !!project; }
      return this.advance(ctx, { type: "file", project: project?.ref || null, note, inferred }, msg, replyId);
    },

    async advance(ctx, p, msg, replyId) {
      if (!p.project) {
        ctx.pending = p;
        return { text: p.note ? `Which project should that go to: ${names()}?` : `Happy to. Which project is it for: ${names()}?` };
      }
      if (!p.note) {
        ctx.pending = p;
        const name = L.desk.project(p.project)?.name || p.project;
        return { text: `What's the idea for ${name}? Say it the way you'd tell a colleague; I'll file it as written.` };
      }
      ctx.pending = null;
      return this.file(ctx, p, replyId);
    },

    async file(ctx, p, replyId) {
      const proj = L.desk.project(p.project) || { ref: p.project, name: p.project };
      const out = await L.desk.file({ project: proj.ref, note: p.note });
      if (!out?.ok) return { text: `The intake didn't take it: ${out?.reason || "the desk didn't answer"}. Your words are above; try again in a moment.` };
      L.log.add({ tool: "intake", label: `Filed intake for ${proj.ref}`, summary: T.clip(p.note, 200), messageId: replyId,
        capability: { actor: "superintendent", action: "intake.file", capabilityClass: "standard", mode: "ask_first",
          approval: "request", target: out.path || proj.ref, result: `Filed to ${proj.name}'s intake.` } });
      S.intake = (S.intake || 0) + 1;
      const where = out.path ? ` at \`${out.path}\`` : "";
      const why = p.inferred ? ` It reads like a ${proj.name} idea, so that's where it went.` : "";
      const local = S.intake === 1 ? " On this page it lives only in your browser." : "";
      return { text: `Filed for **${proj.name}**: “${p.note}”\n\nIt's in ${proj.name}'s intake${where}, where the `
        + `drafter reads it in a few minutes and turns it into a draft outcome, a chore or nothing.${why}${local}`,
        used: [`Filed intake for ${proj.ref}`] };
    },

    /* an answer to the question it asked; null when it isn't one */
    async fill(ctx, msg, replyId) {
      const p = ctx.pending, raw = String(msg.text || "");
      if (!p.project) {
        const proj = L.projects.find(raw) || L.projects.find(raw, { loose: T.words(raw).length <= 3 });
        if (proj) {
          p.project = proj.ref;
          const rest = noteOf(raw.replace(new RegExp(proj.name, "i"), "").replace(/^\W+/, ""));
          if (!p.note && rest && T.words(rest).length >= 3) p.note = rest;
          return this.advance(ctx, p, msg, replyId);
        }
        if (L.intents.strong(raw, ctx, "file")) { ctx.pending = null; return null; }
        if (!p.note && T.words(raw).length >= 4) { p.note = noteOf(raw) || T.cap(raw.trim()); return this.advance(ctx, p, msg, replyId); }
        return { text: `I need a project for it: ${names()}?` };
      }
      if (L.intents.strong(raw, ctx, "file") && T.words(raw).length <= 6) { ctx.pending = null; return null; }
      /* it asked for the idea, so this answer is the idea: keep its words (only a stated
         "the idea is …" lead-in and wrapping quotes come off) */
      p.note = T.cap(raw.trim().replace(/^(the idea is|it is|it's|its|idea:?)\s+/i, "").replace(/^["“]|["”]$/g, "").trim());
      return this.advance(ctx, p, msg, replyId);
    },
  };

  L.filing = filing;
})(window.VISR_SUPT_LIB ||= {});
