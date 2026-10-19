/* REVIEW · the action bar — always at the bottom of the desk, whatever he is
   reading (and beside every page pushed over it, stack.js).

   APPROVE, REFUSE and DONE are rubber stamps (primitives/stamp.js): picked up
   off the bar and carried onto the page, where the drop lays the impression
   and IS the commit. A tap does nothing — a stamp is not a button — so a tap
   (or a drop that missed the page) is when the bar says how, and not before.
   ACCEPT, PARK, FEEDBACK and LATER are plain verbs: ACCEPT settles an
   owner's work in one tap, PARK opens its sheet (park.js) for a reason and a
   next look, FEEDBACK the writing sheet. On an owner item OPEN INTERACTIVE
   is sent at once (it waits seconds on the Mac, so the button says OPENING…
   until the answer) and HAND BACK opens its sheet (handback.js). Only the
   verbs the item lists are drawn, never more. ACCEPT leads when it is
   offered, with OPEN INTERACTIVE on a row of its own under the four; else
   the session verb leads. While one is answered every plain verb is
   disabled, so a double tap sends once.

   `tool` is the desk's I'M ON IT toggle (working.js), drawn last among the
   verbs. It answers nothing, so it keeps its own in-flight guard and is
   never disabled with them; with four verbs and no stamp it takes a row of
   its own, like OPEN INTERACTIVE. A draft outcome has none (the desk passes
   no tool): his work on a draft is the decision itself.

   A Linear card's bar is ROUTE, REFRESH, FEEDBACK and LATER, four to a
   phone row: the button says ROUTE and carries its full name, Route to
   owner, as its title and aria-label, since ROUTE TO OWNER does not fit
   that row. REFRESH re-reads Linear and resolves nothing, so the desk
   stays and is redrawn from the new read (app.js `redraw`).

   A draft outcome's bar is APPROVE and REFUSE, FEEDBACK, and a square ⋯
   holding LATER, all on one row; a wide landscape screen, with a whole
   column for the bar, shows LATER itself instead of in the ⋯.

   The ⋯ is where an item's less used verbs live. BLOCKED BY (block.js) is
   there on every item that offers `block` (a chore, a draft), UNBLOCK
   while it is blocked, and NOT NEEDED on every item that offers
   `not_needed` (it retires the item without judging it); an item with
   those keeps its LATER in the ⋯ too on a phone, so a chore's bar is DONE,
   FEEDBACK, ⋯ and I'M ON IT, and an owner's ACCEPT, PARK, FEEDBACK and ⋯.

   A receipt (what a standing rule did for him) is GOT IT, in `--ok`, and
   UNDO, which opens the writing sheet for an optional why. An edit to his
   rules file someone else made (`standing_edit`) is KEEP AS MINE and
   REVERT, plain verbs rather than stamps. Where the
   ⋯ holds nothing but LATER it shows only where LATER doesn't. When the APPROVE
   stamp lands, the approve sheet (approve-sheet.js) asks who starts and
   which repos it may write; cancelling it puts the stamp back and sends
   nothing. A not-started owner's card (`owner_unstarted`) approves its fix
   the same way.

   REFUSE opens the writing sheet for a reason (optional) and attachments;
   cancelling it puts the stamp back. A refusal from the runtime puts the
   stamp back too and says why on the bar.

     const a = Actions.render(item, { target, area, act, compose, park, block, tool });
     a.el · a.key(e) · a.say(msg, tone) */
"use strict";

const Actions = {
  /* the verbs that open a writing sheet first */
  SHEETS: ["feedback", "handback", "route", "undo"],

  /* kinds whose approve and reject are plain verbs, not stamps: keeping an
     edit to his own rules file, or reverting it, judges no one's work */
  PLAIN: ["standing_edit"],

  render(item, o) {
    const has = a => (item.actions || []).includes(a);
    let busy = false;
    const say = T.el("div", { class: "t-bar-say" });
    const tell = (msg, tone = "bad") => {
      say.replaceChildren(msg ? T.el("span", { class: tone }, msg) : "");
    };

    const draft = item.kind === "draft_outcome";
    const plainKind = Actions.PLAIN.includes(item.kind);
    const faces = [];
    if (has("approve") && !plainKind) faces.push({ id: "approve", label: "APPROVE", tone: "ok" });
    if (has("done")) faces.push({ id: "done", label: "DONE", tone: "ok" });
    if (has("reject") && !plainKind) faces.push({ id: "reject", label: "REFUSE", tone: "red" });

    const stamp = faces.length ? Tycho.stamp({
      faces, target: o.target, area: o.area || (() => o.target),
      guard: () => !busy,
      onMiss: () => tell("Drag the stamp up onto the page.", "dim"),
      onStamp: async id => {
        busy = true; tell(null);
        let extra = {};
        if (id === "approve" && ApproveSheet.needed(item)) {
          const picks = await ApproveSheet.confirm(item);
          if (!picks) { busy = false; return stamp.reset(); }
          extra = picks;
        }
        const out = id === "reject" ? await o.compose("reject") : await o.act(id, extra);
        busy = false;
        if (out?.ok) return stamp.lock();
        if (out?.code === "stale") return;
        stamp.reset();
        if (out) tell(out.reason || "not sent");
      },
    }) : null;

    const btns = [];
    const free = on => { for (const b of btns) b.disabled = !on; };
    const run = action => Actions.SHEETS.includes(action) ? o.compose(action)
      : action === "park" ? o.park() : action === "block" ? o.block() : o.act(action);
    /* a verb from the ⋯: the same one-at-a-time guard as the buttons */
    const fromMenu = action => async () => {
      if (busy) return;
      busy = true; free(false); tell(null);
      const out = await run(action);
      busy = false; free(true);
      if (out && !out.ok && out.code !== "stale") tell(out.reason || "not sent");
    };
    /* `working`: what the button says while a slow act is in flight, and the
       line the bar says meanwhile */
    const plain = (action, label, tone = "", working = null) => {
      const b = T.el("button", { class: `t-btn ${tone}`.trim(), "data-act": action }, label);
      b.onclick = async () => {
        if (busy) return;
        busy = true; free(false); tell(null);
        if (working) { b.textContent = working.label; b.setAttribute("aria-busy", "true"); tell(working.say, "dim"); }
        const out = await run(action);
        busy = false; free(true);
        if (working) { b.textContent = label; b.setAttribute("aria-busy", "false"); tell(null); }
        if (out && !out.ok && out.code !== "stale") tell(out.reason || "not sent");
      };
      return b;
    };
    /* the session verb leads unless ACCEPT does; then it is a row of its own
       under the four (.wide) */
    const session = has("interactive") ? plain("interactive", "OPEN INTERACTIVE", "",
      { label: "OPENING…", say: "Opening a terminal on the Mac. This takes a few seconds." })
      : has("handback") ? plain("handback", "HAND BACK") : null;
    if (session && !has("accept")) btns.push(session);
    if (plainKind && has("approve")) btns.push(plain("approve", Fmt.verbFor(item, "approve"), "ok"));
    if (plainKind && has("reject")) btns.push(plain("reject", Fmt.verbFor(item, "reject"), "danger"));
    /* a receipt: GOT IT retires it, UNDO opens the sheet for an optional why */
    if (has("acknowledge")) btns.push(plain("acknowledge", Fmt.verb("acknowledge"), "ok"));
    if (has("undo")) btns.push(plain("undo", Fmt.verb("undo")));
    if (has("accept")) btns.push(plain("accept", "ACCEPT", "ok"));
    if (has("park")) btns.push(plain("park", "PARK"));
    if (has("route")) {
      const route = plain("route", "ROUTE", "ok");
      route.title = "Route to owner";
      route.setAttribute("aria-label", "Route to owner");
      btns.push(route);
    }
    if (has("refresh")) btns.push(plain("refresh", "REFRESH", "",
      { label: "READING…", say: "Re-reading this workspace in Linear." }));
    if (has("feedback")) btns.push(plain("feedback", "FEEDBACK"));
    /* NOT NEEDED: not on a receipt that offers GOT IT, which is the same act */
    const menu = [has("block") ? { label: "BLOCKED BY", fn: fromMenu("block") } : null,
      has("unblock") ? { label: "UNBLOCK", fn: fromMenu("unblock") } : null,
      has("not_needed") && !has("acknowledge") ? { label: Fmt.verb("not_needed"), fn: fromMenu("not_needed") } : null].filter(Boolean);
    let later = null;
    if (has("later")) {
      later = plain("later", "LATER");
      btns.push(later);
      if (draft || menu.length) later.classList.add("t-wide-only");
    }
    /* LATER is in the ⋯ only while its own button is hidden */
    const inMenu = later?.classList.contains("t-wide-only") ? later : null;
    const more = inMenu || menu.length ? Actions.more(() => [
      ...(inMenu && getComputedStyle(inMenu).display === "none" ? [{ label: "LATER", fn: () => inMenu.click() }] : []),
      ...menu], { narrowOnly: !menu.length }) : null;
    /* beside ACCEPT the session verb is a row of its own, under the ⋯'s row */
    const wide = session && has("accept") ? session : null;
    if (wide) { wide.classList.add("wide"); btns.push(wide); }
    const fill = !stamp && btns.length > 3;
    if (o.tool) o.tool.classList.toggle("wide", fill);
    const verbs = [...btns.filter(b => b !== wide), ...(more ? [more] : []), ...(wide ? [wide] : []), ...(o.tool ? [o.tool] : [])];

    const el = T.el("div", { class: "t-bar", "data-pid": "desk" },
      faces.length || verbs.length ? T.el("div", { class: "t-bar-row" },
        stamp ? stamp.el : null, verbs.length ? T.el("div", { class: `t-bar-verbs${fill ? " fill" : ""}` }, ...verbs) : null)
        : T.el("p", { class: "t-say dim" }, Lanes.happened(item) ? "Nothing to do here. It already happened."
          : "Nothing to do here. It is shown so you know it is waiting."),
      say);
    return { el, key: e => stamp?.key(e), say: tell };
  },

  /* the square ⋯: the item's less used verbs (`items()`, read on each
     open), in a menu over it; a second tap on ⋯ closes it */
  more(items, { narrowOnly = false } = {}) {
    const b = T.el("button", { class: `t-btn t-more${narrowOnly ? " t-narrow-only" : ""}`, type: "button",
      "aria-label": "More actions", "aria-haspopup": "menu" }, "⋯");
    let open = null;
    b.onclick = () => {
      if (open?.el.isConnected) { open.close(); open = null; return; }
      const r = b.getBoundingClientRect();
      open = Tycho.ctxmenu(r.right, r.top, items(), { owner: b });
      const menu = open.el;
      const box = document.getElementById("main").getBoundingClientRect();
      menu.style.left = Math.max(4, r.right - box.left - menu.offsetWidth) + "px";
      menu.style.top = Math.max(4, r.top - box.top - menu.offsetHeight - 6) + "px";
    };
    return b;
  },
};
