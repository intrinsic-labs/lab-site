/* TYCHO KERNEL · helpers — T: the element builder, api, faults, markdown, icons. Loaded first; everything else in the OS builds on these. */
"use strict";

/* ---------------------------------------------------------------- helpers */
const T = {
  el(tag, attrs = {}, ...kids) {
    const n = document.createElement(tag);
    /* a tapped <button> takes focus as part of the BROWSER's own default
       pointerdown handling, invisible on desktop and, on a tablet, exactly
       what collapses the soft keyboard the instant you tap SEND / FILE /
       COMMIT / CREATE / … — every button built through this one helper, mid
       sentence, before its own click handler ever runs. One guard here
       covers all of them rather than an onpointerdown scattered across every
       program's own send button. It only fires when something that WANTS
       the keyboard is currently focused — an ordinary tap with nothing (or
       a non-editable surface, like a keyboard-shortcut panel's own
       `w.body`) focused is untouched, and the button's click still fires
       normally: preventDefault on pointerdown cancels the browser's focus
       shift, not the click that follows on pointerup. */
    if (tag === "button") n.addEventListener("pointerdown", T.keepFocus);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") n.className = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) n.setAttribute(k, v);
    }
    for (const kid of kids.flat()) {
      if (kid === null || kid === undefined) continue;
      n.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return n;
  },
  keepFocus(e) {
    const a = document.activeElement;
    if (!a) return;
    const editable = a.tagName === "TEXTAREA" ||
      (a.tagName === "INPUT" && !["checkbox", "radio", "range", "button",
        "submit", "reset", "color", "file", "hidden"].includes(a.type)) ||
      a.isContentEditable || Boolean(a.closest?.(".xterm-helper-textarea"));
    if (editable) e.preventDefault();
  },
  esc(s) {
    return String(s).replace(/[&<>"]/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  },
  /* minimal markdown → DOM for sheet bodies: fences, tables, bold, code */
  md(text) {
    const root = T.el("div", { class: "t-md" });
    const lines = String(text || "").split("\n");
    let i = 0, para = [];
    const flush = () => {
      if (!para.length) return;
      const html = T.esc(para.join(" "))
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/`([^`]+)`/g, "<code>$1</code>");
      const p = T.el("p"); p.innerHTML = html; root.append(p); para = [];
    };
    while (i < lines.length) {
      const ln = lines[i];
      if (ln.startsWith("```")) {
        flush();
        /* A FENCE DOES NOT ALWAYS CLOSE AT THE NEXT ``` (2026-09-02). The
           corpus sheets fence a raw CONVERSATION TAIL, and a conversation
           routinely contains code fences of its own — so closing at the first
           one truncated the card and reflowed the rest of it as prose, which
           is how a real paragraph could go missing. So: an ordinary block
           still closes at its first ``` and nothing changes for it; a fence
           whose content holds further fence lines closes at the LAST ``` that
           is followed by a blank line, a bold `**` paragraph, or the end. The
           search stops at the next top-level `**` caption, because that is
           where the sheet's next section starts and no block may reach past
           it. Nothing is ever DROPPED on any path — the worst case is one
           `<pre>` where there were two. */
        const start = ++i;
        let first = -1, end = -1, nested = false;
        for (let j = i; j < lines.length; j++) {
          if (!lines[j].startsWith("```")) {
            if (lines[j].startsWith("**")) break;
            continue;
          }
          if (first < 0) first = j;
          const nxt = lines[j + 1];
          if (!(nxt === undefined || nxt.trim() === "" || nxt.startsWith("**"))) {
            nested = true;
            continue;
          }
          end = j;
          if (!nested) break;      /* an ordinary block: the first close IS it */
        }
        if (end < 0) end = first < 0 ? lines.length : first;
        root.append(T.el("pre", {}, lines.slice(start, end).join("\n")));
        i = end + 1;
        continue;
      }
      if (ln.trimStart().startsWith("|")) {
        flush();
        const rows = [];
        while (i < lines.length && lines[i].trimStart().startsWith("|")) {
          const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
          if (!cells.every(c => /^:?-+:?$/.test(c))) rows.push(cells);
          i++;
        }
        const tbl = T.el("table");
        rows.forEach((cells, r) => {
          const tr = T.el("tr");
          cells.forEach(c => {
            const td = T.el(r === 0 ? "th" : "td");
            td.innerHTML = T.esc(c)
              .replace(/\*\*(HIT|WEAK|MISS)\*\*/g, '<strong class="v-$1">$1</strong>')
              .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
              .replace(/`([^`]+)`/g, "<code>$1</code>");
            tr.append(td);
          });
          tbl.append(tr);
        });
        root.append(tbl);
        continue;
      }
      if (ln.trim() === "") { flush(); i++; continue; }
      para.push(ln); i++;
    }
    flush();
    return root;
  },
  progress(done, total, max = 50) {
    const bar = T.el("div", { class: "t-progress",
                              title: `${done}/${total}` });
    const segs = Math.min(total, max) || 1;
    for (let s = 0; s < segs; s++)
      bar.append(T.el("i", { class: s < Math.round(done / total * segs) ? "on" : "" }));
    return bar;
  },
  /* The one HTTP chokepoint, and since 2026-08-31 the one place a half-answer
     is caught. An iOS PWA is FROZEN the moment it backgrounds: an in-flight
     fetch is aborted mid-body, and `res.json()` on a truncated body throws
     `Unexpected end of JSON input` — which is what reached the screen as a
     frozen window with a raw exception in it. So the body is read as text
     first and every failure shape is turned into a sentence a person can act
     on. Nothing here retries: whether a lost request should be repeated is the
     caller's judgment (a read, yes; a verb that may already have written, no). */
  async api(path, body) {
    let r;
    try {
      r = await fetch(path, body
        ? { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body) }
        : undefined);
    } catch {
      /* network down, server gone, or the tab was suspended mid-flight — the
         browser does not tell us which, so the sentence must cover all three */
      throw new Error("connection lost — the request never reached the Mac");
    }
    let text = "";
    try { text = await r.text(); }
    catch { throw new Error("connection lost — the answer was cut off"); }
    if (!text.trim())
      throw new Error(r.ok
        ? "connection lost — the answer arrived empty"
        : `the server said ${r.status}${r.statusText ? " " + r.statusText : ""}`);
    let out;
    try { out = JSON.parse(text); }
    catch {
      throw new Error(`the server answered with something that isn't JSON ` +
        `(${r.status}) — ${text.trim().slice(0, 200)}`);
    }
    if (!r.ok || out.error) throw T.thrown(out, r);
    return out;
  },
  /* An error carrying the server's own structured refusal. The message stays
     the one-line summary (every `catch (e) { e.message }` in the OS keeps
     working, `gated()`'s /bad token/ probe included), and `detail` + `remedy`
     ride alongside for the alert to show. */
  thrown(out, r) {
    const e = new Error(out.error || out.summary || out.reason ||
                        r?.statusText || `HTTP ${r?.status ?? "?"}`);
    if (out.detail) e.detail = out.detail;
    if (out.remedy) e.remedy = out.remedy;
    return e;
  },
  /* ---------------------------------------------------------------- faults
     A failed action's own words are usually a wall of stderr (git is the worst
     offender), and until now they went out raw: unstyled red, overflowing the
     window frame, unreadable on a tablet. The rule this pair encodes is that a
     fault has TWO registers — one line that says what happened, and the whole
     dump for when that line isn't enough. The summary never wraps past the
     frame; the dump lives behind a toggle in a box that scrolls. */
  /* Takes anything a failure arrives as — a thrown Error, or a verb's own
     `{ok:false, reason, detail, remedy}` refusal — and normalizes it to the
     three things a person needs: WHAT happened, the whole dump for when that
     isn't enough, and the exact command that fixes it when the server knows
     one. `remedy` is the campaign API's; absent everywhere else, and its
     absence is a normal shape rather than a degraded one. */
  fault(e) {
    const src = (e && typeof e === "object") ? e : { message: String(e ?? "") };
    const raw = String(src.summary ?? src.message ?? src.reason ??
                       src.error ?? src.text ?? e ?? "").replace(/\s+$/, "");
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    let head = lines[0] || "something went wrong";
    /* Three shapes, in the order they are worth preferring.
       1. A wrapper's own sentence sits in front of the command echo —
          "couldn't delete `x`: Command failed: git -C … branch -D x". That
          prefix is the best headline there is, and everything after it is
          detail by construction.
       2. Otherwise, when the first line IS just the echoed command, the useful
          sentence is the `error:`/`fatal:` line underneath it.
       3. Otherwise the first line stands. */
    const wrapped = head.match(/^(.*?)\s*[:—-]?\s*Command failed:/i);
    if (wrapped && wrapped[1].trim()) {
      head = wrapped[1].trim().replace(/[:\s]+$/, "");
    } else {
      const said = lines.find(l => /^(error|fatal|warning|refusing):/i.test(l));
      if (said && (head.length > 88 || /^command failed/i.test(head))) head = said;
    }
    /* unwrap a head that is ENTIRELY a code span; a head that merely quotes a
       branch name keeps its backticks, or "couldn't delete `x`" loses one */
    head = head.replace(/^(error|fatal):\s*/i, "").replace(/^`([^`]+)`$/, "$1");
    /* a headline is one sentence; a paragraph of it belongs in the dump */
    if (head.length > 180) head = head.slice(0, 179).trimEnd() + "…";
    const given = String(src.detail ?? "").trim();
    return {
      head,
      detail: given || (raw.length > head.length ? raw : ""),
      remedy: String(src.remedy ?? "").trim(),
    };
  },
  /* The fault's body, shared by the in-panel box and the OS alert so the two
     can never describe one failure differently: the headline, the REMEDY row
     (a real shell command, with its own COPY — the point is that he pastes it
     into a terminal, not that he reads it), and the dump behind DETAIL ▸. */
  faultBody(f, ...acts) {
    const dump = f.detail
      ? T.el("pre", { class: "dump", style: "display:none" }, f.detail) : null;
    const more = dump
      ? T.el("button", { class: "t-btn tiny", onclick() {
          const open = dump.style.display === "none";
          dump.style.display = open ? "" : "none";
          this.textContent = open ? "DETAIL ▾" : "DETAIL ▸";
        } }, "DETAIL ▸")
      : null;
    const row = [...acts.filter(Boolean), more].filter(Boolean);
    return [
      T.el("div", { class: "head" }, T.icon("warn"), T.el("span", {}, f.head)),
      f.remedy ? T.el("div", { class: "remedy" },
        T.el("span", { class: "cmd" }, f.remedy),
        T.el("button", { class: "t-btn tiny ico",
          title: "copy the command",
          onclick: () => Tycho.copy(f.remedy, "command copied") },
          T.icon("copy"))) : null,
      row.length ? T.el("div", { class: "acts" }, ...row) : null,
      dump,
    ];
  },
  /* the boxed form, for a whole SCREEN that failed (NO SIGNAL) — a state the
     window is in, which an alert would be wrong for because dismissing it
     would leave nothing behind. A failed ACTION uses Tycho.alert instead. */
  errBox(e, { cap = "FAULT", retry = null, retryLabel = "TAP TO RETRY" } = {}) {
    return T.el("div", { class: "t-box t-err" },
      T.el("div", { class: "cap" }, cap),
      ...T.faultBody(T.fault(e),
        retry ? T.el("button", { class: "t-btn tiny", onclick: retry }, retryLabel) : null));
  },
  /* pixel icon → inline SVG, tinted by currentColor. TychoOS's own icon set:
     9×9 bitmaps in the display's native idiom — no emoji on this screen. */
  icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 9 9");
    svg.setAttribute("class", "t-ico");
    svg.setAttribute("aria-hidden", "true");
    /* the icon's name travels with it so the event log can label an icon-only
       button — a ⋯ or a 👁 has no text, and "" is a useless log line */
    svg.setAttribute("data-ico", name);
    (T.ICONS[name] || T.ICONS.dot).forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== "#") continue;
        const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        r.setAttribute("x", x); r.setAttribute("y", y);
        r.setAttribute("width", 1); r.setAttribute("height", 1);
        svg.append(r);
      }
    });
    return svg;
  },
};

T.ICONS = {
  dot:      ["", "", "", "...###...", "...###...", "...###..."],
  mission:  ["....#....", "..##.##..", ".#..#..#.", "#..###..#", "#.##.##.#",
             "#..###..#", ".#..#..#.", "..##.##..", "....#...."],
  door:     [".#######.", ".#.....#.", ".#.....#.", ".#....##.", ".#....##.",
             ".#.....#.", ".#.....#.", ".#.....#.", ".#######."],
  talk:     [".########", ".#......#", ".#......#", ".#......#", ".########",
             "...##....", "...#.....", "", ""],
  eye:      ["", "..#####..", ".#.....#.", "#...#...#", "#..###..#",
             "#...#...#", ".#.....#.", "..#####..", ""],
  check:    ["", ".......##", "......##.", ".....##..", "##..##...",
             ".####....", "..##.....", "", ""],
  skip:     ["", ".#.....#.", ".##....#.", ".###...#.", ".####..#.",
             ".###...#.", ".##....#.", ".#.....#.", ""],
  broom:    [".......##", "......###", ".....##..", "....##...", "...##....",
             ".####....", "#####....", "###......", ""],
  stash:    ["", ".#######.", ".#..#..#.", ".#######.", ".#.....#.",
             ".#.....#.", ".#.....#.", ".#######.", ""],
  hold:     ["..#####..", ".#.....#.", "#...#...#", "#...#...#", "#...##..#",
             "#.......#", ".#.....#.", "..#####..", ""],
  trash:    ["...###...", ".#######.", "..#...#..", "..#.#.#..", "..#.#.#..",
             "..#.#.#..", "..#.#.#..", "..#...#..", "..#####.."],
  keep:     ["....#....", "...###...", "..#####..", "..#####..", "...###...",
             "....#....", "....#....", "....#....", "....#...."],
  folder:   ["", ".####....", ".#...####", ".########", ".#......#",
             ".#......#", ".#......#", ".########", ""],
  doc:      [".#####...", ".#...##..", ".#....#..", ".#....#..", ".#.##.#..",
             ".#....#..", ".#.##.#..", ".#....#..", ".######.."],
  gem:      ["", "..#####..", ".#.....#.", "#.......#", ".#.....#.",
             "..#...#..", "...#.#...", "....#....", ""],
  focus:    ["....#....", "....#....", "..#####..", ".#..#..#.", "#########",
             ".#..#..#.", "..#####..", "....#....", "....#...."],
  list:     ["", "##.######", "", "##.######", "", "##.######", "",
             "##.######", ""],
  branch:   [".##......", ".##...##.", "..#...##.", "..#..##..", "..####...",
             "..#......", "..#......", ".###.....", ""],
  term:     ["#########", "#.......#", "#.#.....#", "#..#....#", "#.#.....#",
             "#....##.#", "#.......#", "#########", ""],
  warn:     ["....#....", "...###...", "...#.#...", "..#.#.#..", "..#.#.#..",
             ".#..#..#.", ".#.....#.", "#...#...#", "#########"],
  /* the transport triangle — a START verb, an IN PROGRESS badge */
  play:     ["", ".##......", ".####....", ".######..", ".########",
             ".######..", ".####....", ".##......", ""],
  /* two offset sheets — the copy affordance, and the OS's own edit menu */
  copy:     ["..######.", "..#....#.", "..#....#.", "####...#.", "#..#####.",
             "#......#.", "#......#.", "#......#.", "########."],
  cut:      ["...#.#...", "...#.#...", "...#.#...", "....#....", "...###...",
             "..#...#..", ".##...##.", ".##...##.", "..#...#.."],
  paste:    [".######..", ".#.....#.", "##.###.##", "#.......#", "#.#####.#",
             "#.......#", "#.#####.#", "#.......#", "#########"],
  /* the attach pill's mark — a mission clipped onto a message */
  clip:     ["....###..", "...#...#.", "..#.....#", ".#.....#.", ".#....#..",
             ".#...#...", ".#..#....", "..##.....", ""],
};
