/* INTAKE — a task-capture slip.

   A ONE-WAY VALVE into Obsidian, and never a task browser. It lists nothing,
   opens nothing, edits nothing and checks nothing off: the only thing this
   program can do is put one task into the vault's backlog. That constraint is
   the whole design — a capture surface that can also browse is a surface you
   stop capturing into and start reading, and the reading surfaces already
   exist (Todo.md, Obsidian itself). The receipt's Obsidian link
   is the deliberate exit for "I need to refine this one now".

   It lives on the dock as a PINNED item (Tycho.PINNED), anchored at the right
   end rather than shuffling with the open windows, because the whole value is
   that the thought can be dumped from wherever he is standing in the OS.

   Two fields are primary — PROJECT and TITLE — and everything else the
   sanctioned creation path supports sits under MORE. Not because the rest
   doesn't matter, but because a capture slip that asks eight questions is one
   he routes around.

   The wire is POST /api/intake, which shells the vault's own create-task.mjs.
   No task rule lives on this screen: a refusal from that CLI is rendered
   verbatim, and the id in the receipt is the one it actually allocated. */
"use strict";

/* Session-local, deliberately: the receipt is a thing he glances at while
   filing three in a row, not a record. Module scope rather than mount scope so
   closing and reopening the window keeps it; a reload clears it, which is the
   stated lifetime. Nothing here is clickable into an editor — the ids link OUT
   to Obsidian and nowhere else. */
const INTAKE_FILED = [];
const INTAKE_MAX = 50;
/* the last project filed into, sticky for the same reason — three tasks into
   one project is the common shape of a capture burst */
let INTAKE_PROJECT = null;

/* the https bounce page that turns a vault path into an obsidian:// jump
   (~/dev/web/obsidian-link). `f` is the vault-relative path WITHOUT .md. */
const OBSIDIAN_BOUNCE = "https://obsidian-link-intrinsic-labs.vercel.app/o?f=";

Tycho.register({
  id: "intake", kind: null,
  title: "TASK", glyph: "▽",
  blurb: "A task-capture slip, and a one-way valve into Obsidian. It lists\nnothing and opens nothing: the only thing it can do is put one task into\nthe vault's backlog. That constraint is the whole design.",

  async mount(w) {
    let projects = [];
    let more = false;

    /* -- the wire ---------------------------------------------------------
       Throws on 401 ONLY, so Tycho.auth's one-paste token prompt handles the
       token and every other failure comes back as an ordinary {error} object.
       That split is what lets a refusal ("unknown tag #foo") be rendered
       loudly in the form instead of evaporating as a kernel toast. */
    const call = async body => {
      let r;
      try {
        r = await fetch("/api/intake", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: Tycho.token(), ...body }),
        });
      } catch (e) {
        return { error: `no signal — ${e.message}` };
      }
      let out = {};
      try { out = await r.json(); } catch { out = {}; }
      if (r.status === 401) throw new Error(out.error || "bad token");
      if (!r.ok && !out.error) out.error = r.statusText || `HTTP ${r.status}`;
      return out;
    };

    /* -- fields ----------------------------------------------------------- */
    const title = T.el("input", { class: "t-field", spellcheck: "false",
      placeholder: "the outcome, in one line" });
    const projField = T.el("input", { class: "t-field", spellcheck: "false",
      placeholder: "type to filter…" });
    const projList = T.el("div", { class: "t-pick", style: "display:none" });

    const due = T.el("input", { class: "t-field", spellcheck: "false",
      placeholder: "YYYY-MM-DD", inputmode: "numeric" });
    const est = T.el("input", { class: "t-field", spellcheck: "false",
      placeholder: "30m · 2h · 1.5h" });
    const tags = T.el("input", { class: "t-field", spellcheck: "false",
      placeholder: "#urgent #model:sonnet" });
    const rank = T.el("input", { class: "t-field", spellcheck: "false",
      placeholder: "rank", inputmode: "numeric" });
    const story = T.el("textarea", { class: "t-textarea", rows: 4,
      placeholder: "context, links, what made you think of it" });
    const acceptance = T.el("textarea", { class: "t-textarea", rows: 3,
      placeholder: "one criterion per line" });

    /* two-cell segmented pickers — the .t-seg idiom CALIBRATE's verdicts use */
    const seg = (opts, initial) => {
      let value = initial;
      const box = T.el("div", { class: "t-seg" });
      const draw = () => box.replaceChildren(...opts.map(([v, label]) =>
        T.el("button", { class: "t-btn" + (v === value ? " on" : ""),
          onclick: () => { value = v; draw(); } }, label)));
      draw();
      return { box, get: () => value, set: v => { value = v; draw(); } };
    };
    const owner = seg([["asher", "ASHER"], ["rtas", "RTAS"]], "asher");
    const place = seg([["active", "ACTIVE"], ["later", "LATER"]], "active");

    /* -- the project picker ----------------------------------------------
       Type-to-filter over the server's list of file-backend projects — never
       a hardcoded roster, so a project migrated tomorrow appears on its own.
       A pick is required: the field holding matching TEXT is not a selection,
       because "glyph" matching two projects must not silently choose one. */
    let chosen = null;

    const matches = () => {
      const q = projField.value.trim().toLowerCase();
      if (!q) return projects;
      return projects.filter(p =>
        p.slug.includes(q) || p.name.toLowerCase().includes(q) ||
        p.category.includes(q));
    };

    const pick = p => {
      chosen = p;
      INTAKE_PROJECT = p ? p.slug : null;
      projField.value = p ? p.name : "";
      projList.style.display = "none";
      projField.classList.toggle("picked", Boolean(p));
    };

    const drawList = () => {
      const rows = matches().slice(0, 8);
      if (!rows.length) {
        projList.replaceChildren(T.el("div", { class: "row dim" },
          "no project matches that"));
      } else {
        projList.replaceChildren(...rows.map((p, i) => T.el("div", {
          class: "row sel" + (i === 0 ? " lead" : ""),
          onpointerup: () => { pick(p); title.focus(); },
        },
          T.el("span", { class: "id" }, p.name),
          T.el("span", { class: "dim" }, p.category))));
      }
      projList.style.display = "";
    };

    projField.oninput = () => {
      if (chosen) { chosen = null; projField.classList.remove("picked"); }
      drawList();
    };
    /* coming back to a field that already holds a pick selects it, so typing
       replaces rather than appending to a project name he didn't type */
    projField.onfocus = () => { if (chosen) projField.select(); drawList(); };
    projField.onblur = () => setTimeout(() => {
      projList.style.display = "none";
    }, 150);            /* after a pointerup on a row, never before it */
    projField.onkeydown = ev => {
      if (ev.key === "Escape") return void (projList.style.display = "none");
      if (ev.key !== "Enter") return;
      ev.preventDefault();
      const hits = matches();
      /* Enter commits the obvious pick and moves on; ambiguity does not
         choose for him — it just shows the list */
      if (hits.length === 1 || (hits.length && projField.value.trim())) {
        pick(hits[0]); title.focus();
      } else drawList();
    };

    /* -- feedback --------------------------------------------------------- */
    const flash = T.el("div");
    const errBox = T.el("div");
    const receipt = T.el("div", { class: "t-receipt" });

    const clearFeedback = () => {
      flash.replaceChildren(); errBox.replaceChildren();
    };

    const showError = msg => {
      flash.replaceChildren();
      errBox.replaceChildren(T.el("div", { class: "t-box t-fail" },
        T.el("div", { class: "cap" }, "NOT FILED"),
        T.el("p", { class: "red" }, T.icon("warn"), " ", String(msg)),
        T.el("p", { class: "dim small" },
          "nothing was written and nothing was cleared — fix it and file again.")));
      errBox.scrollIntoView({ block: "nearest" });
    };

    const showFiled = out => {
      errBox.replaceChildren();
      flash.replaceChildren(T.el("div", { class: "t-flag t-won" },
        T.icon("check"), T.el("b", {}, `${out.id} FILED ✓`),
        T.el("span", { class: "when" },
          out.mission ? `stamped to ${out.mission}` : "")));
    };

    const drawReceipt = () => {
      if (!INTAKE_FILED.length) return receipt.replaceChildren();
      const kids = [T.el("span", { class: "dim" }, "filed: ")];
      INTAKE_FILED.forEach((f, i) => {
        if (i) kids.push(T.el("span", { class: "dim" }, " · "));
        kids.push(f.rel
          ? T.el("a", { class: "out", target: "_blank", rel: "noreferrer",
              href: OBSIDIAN_BOUNCE + encodeURIComponent(f.rel),
              title: "open in Obsidian" }, f.id)
          : T.el("span", {}, f.id));
      });
      receipt.replaceChildren(...kids);
    };

    /* -- the verb ---------------------------------------------------------- */
    const fileBtn = T.el("button", { class: "t-btn primary" },
      T.icon("check"), "FILE");

    async function submit() {
      if (fileBtn.disabled) return;
      if (!chosen) { showError("pick a project first"); projField.focus(); return; }
      if (!title.value.trim()) { showError("a task needs a title"); title.focus(); return; }
      clearFeedback();
      fileBtn.disabled = true;
      status("filing…");
      const body = {
        verb: "file",
        project: chosen.slug,
        title: title.value.trim(),
        owner: owner.get(),
        due: due.value.trim(),
        est: est.value.trim(),
        tags: tags.value.trim(),
        rank: rank.value.trim(),
        later: place.get() === "later",
        story: story.value,
        acceptance: acceptance.value,
      };
      const out = await Tycho.auth(() => call(body));
      fileBtn.disabled = false;
      status();
      /* a null here is the token dialog's own refusal path — say so rather
         than leaving a dead button */
      if (!out) return showError("authorization refused — the TERM token was not accepted");
      if (!out.ok) return showError(out.error || out.reason || "create-task refused it");

      /* the id in the receipt is the one create-task actually allocated —
         never a guess, which is why the whole round trip exists */
      INTAKE_FILED.push({ id: out.id, rel: out.rel || "" });
      if (INTAKE_FILED.length > INTAKE_MAX) INTAKE_FILED.shift();
      Log.event("intake", LOG.TASK_FILED, out.id,
                { project: body.project, owner: body.owner,
                  later: body.later, ...(out.mission ? { mission: out.mission } : {}) });
      Sound.commit();
      showFiled(out);
      drawReceipt();
      /* everything he typed clears; the PROJECT stays, because three tasks
         into one project is the shape of a capture burst */
      title.value = ""; due.value = ""; est.value = "";
      tags.value = ""; rank.value = ""; story.value = ""; acceptance.value = "";
      owner.set("asher"); place.set("active");
      status(`${INTAKE_FILED.length} filed this session`);
      title.focus();
    }

    fileBtn.addEventListener("click", submit);
    /* ⏎ in a single-line field files (the two-field case is the whole point);
       ⌘/^⏎ files from anywhere, the story textarea included */
    const enterFiles = ev => {
      if (ev.key !== "Enter") return;
      ev.preventDefault();
      /* ⌘⏎ inside one of these fields belongs to the window listener below —
         handling it here too would fire submit twice on one keypress */
      if (!ev.metaKey && !ev.ctrlKey) submit();
    };
    title.onkeydown = enterFiles;
    for (const f of [due, est, tags, rank]) f.onkeydown = enterFiles;
    w.body.addEventListener("keydown", ev => {
      if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) {
        ev.preventDefault(); submit();
      }
    });

    /* -- layout ------------------------------------------------------------ */
    const field = (label, ...kids) => T.el("div", { class: "t-form-row" },
      T.el("label", { class: "k" }, label),
      T.el("div", { class: "f" }, ...kids));
    /* a label too long for the 62px column stacks above its field instead */
    const stacked = (label, ...kids) => T.el("div", { class: "t-form-row stack" },
      T.el("label", { class: "k" }, label),
      T.el("div", { class: "f" }, ...kids));

    const moreBody = T.el("div", { class: "t-more", style: "display:none" },
      field("OWNER", owner.box),
      field("DUE·EST", T.el("div", { class: "pair" }, due, est)),
      field("TAGS", tags),
      stacked("PLACE·RANK", T.el("div", { class: "pair" }, place.box, rank)),
      field("STORY", story),
      field("DONE WHEN", acceptance));

    const moreBtn = T.el("button", { class: "t-btn tiny", onclick: () => {
      more = !more;
      moreBody.style.display = more ? "" : "none";
      moreBtn.textContent = more ? "MORE ▾" : "MORE ▸";
    } }, "MORE ▸");

    /* NO BOX (2026-09-02): the slip is already a 640px column in the middle
       of the screen, so a border drawn around it is a second frame inside
       the first — chrome for its own sake. One caption line over a rule is
       all the structure a form this shape needs. */
    const form = T.el("div", { class: "t-slip-form" },
      T.el("div", { class: "cap" }, "FILE A TASK"),
      field("PROJECT", T.el("div", { class: "t-combo" }, projField, projList)),
      field("TITLE", title),
      T.el("div", { style: "margin:6px 0" }, moreBtn),
      moreBody,
      T.el("div", { class: "t-actions" }, fileBtn,
        T.el("span", { class: "dim small" }, "⏎ files · ⌘⏎ from anywhere")));

    function status(msg) {
      w.statusbar.replaceChildren(
        T.el("b", {}, "TASK"),
        T.el("span", { class: "dim" }, " · capture only"),
        T.el("span", { style: "flex:1" }),
        T.el("span", { class: "state dim small" }, String(msg || "")));
    }

    /* -- boot -------------------------------------------------------------- */
    /* CAPPED AND CENTRED (Asher, 2026-09-02): two fields stretched across a
       1440px desk is a form nobody can read. `.t-slip` is the column. */
    w.body.replaceChildren(
      T.el("div", { class: "t-slip" }, flash, errBox, form, receipt));
    status("loading projects…");
    drawReceipt();

    const out = await call({ verb: "projects" }).catch(e => ({ error: e.message }));
    if (!out || !out.ok) {
      status("no project list");
      showError(`couldn't read the vault's projects — ${
        (out && (out.error || out.reason)) || "no answer"}`);
      return;
    }
    projects = out.projects || [];
    status(`${projects.length} project${projects.length === 1 ? "" : "s"}`);
    const back = INTAKE_PROJECT && projects.find(p => p.slug === INTAKE_PROJECT);
    if (back) pick(back);
    (chosen ? title : projField).focus({ preventScroll: true });
  },
});
