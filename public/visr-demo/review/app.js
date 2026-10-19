/* REVIEW · the app — everything waiting on Asher, on one surface.

   The card index (home.js) is the home screen; a tap opens the desk (desk.js),
   and home's menu (home-bar.js) the capture screen (capture.js), the
   telemetry board (telemetry.js), the Monday meeting (monday.js) or the
   settings (settings.js), over it, and
   back — the top bar's ‹ or the phone's own back gesture — returns to the deck exactly as it was.

   This file is the controller: it reads the queue, keeps it fresh (every 30s
   while on screen, and on every return to the app), sends every verb through
   the token gate, and remembers where he was (session.js) so a tab Android
   discarded, or the app closed and reopened, comes back to the same card,
   the same item, its scroll position and open sheet. A deep
   link (deeplink.js: `#item=<key>`, `#board`, `#monday`) wins over that: it is followed
   once the screen is up, after the daily boot if one runs, and again on
   every `hashchange` while the app is open.

   It holds no approval logic. What is waiting, which verbs an item offers
   and what they do are IntrinsicOS's (`intrinsic queue`, relayed). */
"use strict";

const POLL_MS = 30_000;

const App = {
  data: null, fault: null, checked: null, first: null,
  root: null, view: null, desk: null, busy: false, marking: false, lastRead: 0, leaving: false,
  reading: null, readSeq: 0, sig: "",

  /* any card: an item, or an owner release shown in the Happened lane (`Lanes`, deck-filter.js) */
  find(key) { return Lanes.items(this.data).find(i => i.key === key) || null; },

  /* acts after which the item no longer waits on him */
  SETTLES: new Set(["approve", "reject", "done", "accept", "park", "undo", "acknowledge", "not_needed"]),

  /* results after which it still does: the desk stays open and is redrawn
     from the new read (REFRESH on a Linear card) */
  STAYS: new Set(["refreshed"]),

  /* takes one item off the deck locally, until the next read says otherwise */
  drop(key) {
    if (!this.data) return;
    this.data = { ...this.data, items: this.data.items.filter(i => i.key !== key) };
    this.sig = Snapshot.sig(this.data);
    Snapshot.save(this.data, this.checked);
  },

  /* the last good read (snapshot.js) is the deck until the live one lands */
  prepare() {
    const snap = Snapshot.load();
    if (snap) { this.data = snap.data; this.checked = snap.checked; this.sig = Snapshot.sig(snap.data); Fmt.names = snap.data?.projects || {}; }
    this.first = this.refresh();
    return this.first;
  },

  /* One queue read at a time: a poll, a resume and a link arriving together
     share it. A read asked for after an act (`fresh`) starts anew and
     supersedes one already under way, whose older answer is then dropped,
     so the deck never steps back to before the act. */
  refresh({ fresh = false } = {}) {
    if (this.reading && !fresh) return this.reading;
    const seq = ++this.readSeq;
    const read = (async () => {
      let data = null, fault = null;
      try { data = await Wire.list(); } catch (e) { fault = e; }
      if (seq !== this.readSeq) return !fault;
      this.lastRead = Date.now();
      if (fault) { this.fault = fault; Link.show(fault, this.checked); return false; }
      this.fault = null;
      this.checked = new Date().toTimeString().slice(0, 5);
      Link.show(null);
      /* an unchanged answer keeps the data the deck was drawn from, so
         everything holding it (Home.last, the open desk) stays in step */
      const sig = Snapshot.sig(data);
      if (sig !== this.sig || !this.data) { this.data = data; this.sig = sig; Fmt.names = data?.projects || {}; Snapshot.save(data, this.checked); }
      return true;
    })();
    this.reading = read;
    read.finally(() => { if (this.reading === read) this.reading = null; });
    return read;
  },

  async start() {
    this.root = document.getElementById("app");
    this.root.replaceChildren(Home.mount({ open: key => this.open(key) }));
    Link.mount(() => this.refresh().then(() => Home.render(this.data, this.fault, this.checked)));
    Home.render(this.data, this.fault, this.checked);
    /* polling, resume, links and back are live before the first read lands,
       so a read that never lands can't leave the app without them */
    this.live();
    const shown = this.sig;
    await this.first;
    if (this.view) return;
    if (this.sig !== shown || !this.data) Home.render(this.data, this.fault, this.checked);
    const link = DeepLink.take();
    if (link) this.follow(link); else this.restore();
  },

  /* -- a link from a phone alert ---------------------------------------------- */
  follow(link) {
    if (link.board) return this.open("telemetry");
    if (link.monday !== undefined) return this.open("monday", { date: link.monday });
    if (this.find(link.item)) return this.open(link.item);
    this.home();
    Home.say("", "", this.fault ? "The deck couldn't be read, so the link wasn't opened."
      : "That item isn't waiting on you any more.");
  },

  /* -- where he was --------------------------------------------------------- */
  restore() {
    const s = Session.get();
    if (s.view === "capture") return this.open("capture", { restore: true });
    /* an install that saved the board under its earlier name, "bulletin", lands there too */
    if (s.view === "telemetry" || s.view === "bulletin") return this.open("telemetry", { restore: true });
    if (s.view === "monday") return this.open("monday", { restore: true });
    if (s.view === "settings") return this.open("settings", { restore: true });
    if (s.view === "desk" && this.find(s.key)) return this.open(s.key, { restore: true });
    Session.patch({ view: "ring", sheet: null });
  },

  /* -- moving between the deck and what it opens ----------------------------- */
  open(key, { restore = false, notice = null, date = "" } = {}) {
    if (key === "fault") { this.refresh().then(() => Home.render(this.data, this.fault, this.checked)); return; }
    if (key === "empty") return;
    this.close();
    if (key === "capture") {
      this.view = Capture.render({ back: () => this.back() });
      Session.patch({ view: "capture", key: null });
    } else if (key === "telemetry") {
      this.view = Telemetry.render({ back: () => this.back() });
      Session.patch({ view: "telemetry", key: null });
    } else if (key === "monday") {
      this.view = Monday.render({ back: () => this.back(), date });
      Session.patch({ view: "monday", key: null });
    } else if (key === "settings") {
      this.view = Settings.render({ back: () => this.back() });
      Session.patch({ view: "settings", key: null });
    } else {
      const item = this.find(key);
      if (!item) return;
      this.view = Desk.render(item, this.controls(item));
      this.desk = this.view;
      if (notice) this.desk.flag(notice);
      Session.patch({ view: "desk", key });
      Session.enter(key);
    }
    this.view.el.classList.add("t-over");
    this.root.append(this.view.el);
    document.body.classList.add("covered");
    if (!history.state?.view) history.pushState({ view: key }, "");
    Place.track(this.view, { restore });
    /* capture opened by his tap (+ NOTE) goes straight to the note, keyboard up */
    if (!restore) this.view.focus?.();
    const s = Session.get();
    if (restore && s.sheet && this.desk) {
      const item = this.desk.item;
      if (!(item.actions || []).includes(s.sheet)) return;
      if (s.sheet === "park") this.park(item); else if (s.sheet === "block") this.block(item); else this.compose(item, s.sheet);
    }
  },

  close() {
    if (!this.view) return;
    document.querySelector(".t-sheet")?._cancel?.();
    if (this.desk) Session.leave(this.desk.item.key);
    this.view.dispose?.();
    this.view.el.remove();
    this.view = this.desk = null;
    document.body.classList.remove("covered");
  },

  /* the top bar's ‹: undo our own history entry so the back gesture stays honest */
  back() {
    if (history.state?.view) history.back();
    else this.home();
  },

  home() {
    this.close();
    DocSheet.close();
    document.querySelector(".t-sheet")?._cancel?.();
    Session.patch({ view: "ring", key: null, sheet: null, scroll: 0 });
    Home.render(this.data, this.fault, this.checked);
  },

  /* -- the verbs -------------------------------------------------------------- */
  controls(item) {
    return {
      act: (action, extra) => this.perform(item.key, action, extra),
      compose: (action) => this.compose(item, action),
      park: () => this.park(item),
      block: () => this.block(item),
      mark: action => this.mark(item.key, action),
      back: () => this.back(),
      openDoc: path => DocSheet.open(path),
      saved: key => this.adopt(key),
    };
  },

  compose(item, action) {
    if (action === "handback") return Handback.open({ key: item.key,
      send: (text, nextAction) => this.perform(item.key, action, { text, nextAction }) });
    const refuse = action === "reject";
    const route = action === "route";
    const undo = action === "undo";
    return Compose.open({
      key: item.key, action,
      cap: refuse ? "REFUSE" : route ? "ROUTE TO OWNER" : undo ? "UNDO" : "FEEDBACK",
      hint: refuse ? "Why? (optional)"
        : route ? "What should the owner land? (optional)"
        : undo ? "Undo what the rule did. Why? (optional)"
        : item.kind === "chore" ? `A line for the task's Discussion${item.textMax ? `, ${item.textMax} characters at most` : ""}.`
        : "What should change?",
      files: Fmt.takesFiles(item, action),
      verb: refuse ? "REFUSE" : route ? "ROUTE" : undo ? "UNDO" : "SEND", tone: refuse || undo ? "danger" : "primary",
      needsText: !refuse && !route && !undo, max: item.textMax,
      send: (text, attachments) => this.perform(item.key, action, { text, attachments }),
    });
  },

  /* BLOCKED BY: a card's id as `blockedBy`, or the words as the act's text */
  block(item) {
    return Block.open({ item, items: this.data?.items || [],
      send: ({ blockedBy, text }) => this.perform(item.key, "block", blockedBy ? { blockedBy } : { text }) });
  },

  /* PARK's reason travels as the act's text, its next look alongside */
  park(item) {
    return Park.open({
      key: item.key,
      send: (text, nextLook) => this.perform(item.key, "park", { text, nextLook }),
    });
  },

  /* by the action, or by the runtime's result kind where one action has
     several outcomes */
  RESULT: { approve: ["APPROVED", "ok"], reject: ["REFUSED", "bad"], done: ["DONE", "ok"],
            accept: ["ACCEPTED", "ok"], park: ["PARKED", ""],
            feedback: ["FEEDBACK SENT", ""], later: ["FILED FOR LATER", ""],
            interactive: ["INTERACTIVE", ""], handback: ["HANDED BACK", ""],
            interactive_starting: ["STARTING", ""], interactive_running: ["INTERACTIVE OPEN", ""],
            handing_back: ["HANDING BACK", ""], handed_back: ["HANDED BACK", "ok"],
            handback_pending: ["HANDBACK NOT COMPLETE", "amber"],
            blocked_by: ["BLOCKED", "amber"], blocked: ["BLOCKED", "amber"], unblocked: ["UNBLOCKED", ""],
            refreshed: ["REFRESHED", ""],
            undo: ["UNDONE", "amber"], acknowledge: ["GOT IT", ""], not_needed: ["NOT NEEDED", ""] },

  async perform(key, action, extra = {}) {
    const item = this.desk?.item?.key === key ? this.desk.item : this.find(key);
    if (!item) return { ok: false, reason: "That item is no longer in the deck." };
    if (this.marking) return { ok: false, reason: "Wait a moment: your working mark is still being sent." };
    if (this.busy) return { ok: false, reason: "Wait a moment: an answer is still being sent." };
    const body = { key, revision: item.revision, action };
    /* a reason that may be left empty (REFUSE, UNDO) is sent only when written */
    if (extra.text !== undefined && (extra.text.trim() || !["reject", "undo"].includes(action))) body.text = extra.text;
    if (extra.attachments?.length) body.attachments = extra.attachments;
    if (action === "approve" && item.kind === "draft_outcome") body.reviewMinutes = Session.minutes(key);
    if (action === "approve" && typeof extra.owner === "string") body.owner = extra.owner;
    if (action === "approve" && Array.isArray(extra.repos) && extra.repos.length) body.repos = extra.repos;
    if (action === "park" && typeof extra.nextLook === "string") body.nextLook = extra.nextLook;
    if (action === "handback" && typeof extra.nextAction === "string") body.nextAction = extra.nextAction;
    if (action === "block" && typeof extra.blockedBy === "string") body.blockedBy = extra.blockedBy;
    /* a retry of this same act reuses its id (attempts.js), so an act whose
       answer was lost is never applied twice */
    const slot = `act|${key}|${action}`;
    /* the review clock keeps running while he waits, so it is no part of
       what makes a retry the same act */
    body.requestId = Attempts.id(slot, { ...body, reviewMinutes: undefined });
    this.busy = true;
    let out;
    try { out = await Tycho.auth(() => Wire.act(body)); }
    finally { this.busy = false; }
    if (!out) return { ok: false, reason: "Not sent: the action token wasn't given." };
    Attempts.settle(slot, out);
    if (out.ok && this.STAYS.has(out.result?.kind)) { await this.redraw(key, out); return out; }
    if (out.ok) {
      Drafts.clearItem(key);
      Session.leave(key);
      Session.forget(key);
      const was = Session.get();
      /* NOT NEEDED answers with its kind's own result (cancelled, parked…); it reads as itself */
      const [label, tone] = (action === "not_needed" && this.RESULT.not_needed) || this.RESULT[out.result?.kind] || this.RESULT[action] || [action.toUpperCase(), ""];
      await new Promise(r => setTimeout(r, ["approve", "reject", "done"].includes(action) ? 900 : 100));
      /* an act that settles the item takes it off the deck even when the
         read-back fails, so a resolved card never comes back to be judged */
      if (!(await this.refresh({ fresh: true })) && this.SETTLES.has(action)) this.drop(key);
      /* done with this card: the deck keeps its place, not the card, so LATER (which sends it to the back) lands on the next one */
      if (was.front === key) Session.patch({ front: null, frontIndex: was.frontIndex || 0 });
      this.toDeck();
      Home.say(label, tone, out.result?.message || "");
      return out;
    }
    if (out.code === "stale") await this.stale(key);
    return out;
  },

  /* back to the deck, past any pages pushed over the desk (stack.js) too, in one step */
  toDeck() {
    if (history.state?.view) { this.leaving = true; history.go(-1 - (this.desk?.stack.depth() || 0)); } else this.home();
  },

  /* a `refreshed` result: nothing was resolved, so his drafts and the review
     clock are kept, and the desk is redrawn from the new read with the
     runtime's message at its top, on the first page. Only an item the read
     no longer lists (every issue on the card closed) leaves for the deck,
     which then shows the message. */
  async redraw(key, out) {
    const [label, tone] = this.RESULT[out.result?.kind] || ["REFRESHED", ""];
    const message = out.result?.message || "";
    await this.refresh({ fresh: true });
    if (!this.find(key)) {
      Drafts.clearItem(key);
      Session.leave(key);
      Session.forget(key);
      this.toDeck();
      return Home.say(label, tone, message);
    }
    if (this.desk?.item.key !== key) return Home.say(label, tone, message);
    /* pages pushed over the desk hold history entries of their own: back
       out of them first, so one back from the redrawn desk is the deck */
    const sub = Math.min(this.desk.stack.depth(), history.state?.sub || 0);
    if (sub) {
      const popped = new Promise(r => addEventListener("popstate", r, { once: true }));
      history.go(-sub);
      await popped;
      if (this.desk?.item.key !== key) return;
    }
    const note = T.el("div", { class: "t-note ok" }, T.el("div", { class: "t-label" }, label),
      T.el("p", {}, message));
    this.close();
    this.open(key, { notice: note });
  },

  /* I'M ON IT (working.js): `mark_working` / `clear_working`, which every item
     takes. Nothing is resolved, so unlike perform() the desk stays open, his
     drafts and the review clock (Session) are left alone, and the item is
     read back and redrawn in place. One request at a time. */
  async mark(key, action) {
    if (this.marking) return null;
    if (this.busy) return { ok: false, reason: "Wait a moment: an answer is still being sent." };
    const item = this.desk?.item?.key === key ? this.desk.item : this.find(key);
    if (!item) return { ok: false, reason: "That item is no longer in the deck." };
    this.marking = this.busy = true;
    let out;
    try { out = await Tycho.auth(() => Wire.act({ key, revision: item.revision, action })); }
    finally { this.marking = this.busy = false; }
    if (!out) return { ok: false, reason: "Not sent: the action token wasn't given." };
    if (out.ok) {
      /* a failed read-back still shows what was accepted */
      if (await this.refresh({ fresh: true })) this.recheck();
      else if (this.desk?.item.key === key) this.desk.sync({ ...item, workingCleared: null,
        working: action === "mark_working" ? item.working || { since: new Date().toISOString() } : null });
      return out;
    }
    if (out.code === "stale") await this.stale(key);
    return out;
  },

  /* the item moved under him: reload it, keep everything he typed */
  async stale(key) {
    await this.refresh({ fresh: true });
    const again = this.find(key);
    if (!again) {
      this.back();
      Home.say("CHANGED", "bad", "It changed since you opened it and has left the deck.");
      return;
    }
    const note = T.el("div", { class: "t-note amber" }, T.el("div", { class: "t-label" }, "THIS CHANGED SINCE YOU OPENED IT"),
      T.el("p", {}, "It was reloaded. Nothing was sent, and anything you wrote is kept."));
    this.close();
    this.open(key, { notice: note });
  },

  /* after his own document save: the item's revision moved because of him,
     so the open desk takes the new revision without calling it a change */
  async adopt(key) {
    await this.refresh({ fresh: true });
    const it = this.find(key);
    /* the save may have lapsed his working mark: redraw it from the new revision */
    if (it && this.desk?.item.key === key) this.desk.sync(it);
  },

  /* -- staying current ------------------------------------------------------- */
  live() {
    setInterval(() => {
      if (document.visibilityState === "hidden" || this.busy) return;
      if (Date.now() - this.lastRead >= POLL_MS) this.reload();
    }, 5_000);
    Tycho.onResume(() => this.reload());
    /* the latest link wins: one still waiting on a refresh is dropped once a
       newer link arrives */
    let links = 0;
    addEventListener("hashchange", async () => {
      const link = DeepLink.take();
      if (!link) return;
      const mine = ++links;
      if (link.item && !this.find(link.item)) await this.refresh();
      if (mine === links) this.follow(link);
    });
    document.addEventListener("visibilitychange", () => {
      const key = this.desk?.item.key;
      if (!key) return;
      if (document.visibilityState === "hidden") Session.leave(key); else Session.enter(key);
    });
    /* the phone's back gesture. A document layer has its own history entry;
       the writing sheet has none, so backing out of it puts the desk's entry
       back rather than losing the desk with it. */
    addEventListener("popstate", e => {
      const st = e.state || {};
      if (this.leaving) { this.leaving = false; this.home(); return; }
      const depth = this.desk?.stack.depth() || 0;
      /* a full-screen image has no entry of its own: back puts it away and
         keeps the page it opened from */
      const viewer = document.querySelector(".t-viewer");
      if (viewer) {
        viewer._close?.();
        if (depth && (st.sub || 0) < depth) history.pushState({ ...history.state, sub: depth }, "");
        return;
      }
      if (DocSheet.el && !st.docSheet) { DocSheet.close(); return; }
      const sheet = document.querySelector(".t-sheet");
      if (sheet) {
        sheet._cancel?.();
        if (this.view && !st.view) history.pushState({ view: Session.get().key || Session.get().view || "capture" }, "");
        if (depth && (st.sub || 0) < depth) history.pushState({ ...history.state, sub: depth }, "");
        return;
      }
      /* a page pushed over the desk: back one page */
      if (depth > (st.sub || 0) && st.view) return this.desk.stack.settle(st.sub || 0);
      if (this.view && !st.view) this.home();
    });
    addEventListener("keydown", e => {
      if (!this.desk || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest?.("textarea, input, select, [contenteditable]")) return;
      if (document.querySelector(".t-sheet, .t-dialog, .t-viewer, .t-docsheet")) return;
      if (this.desk.key(e)) e.preventDefault();
    });
  },

  /* a poll or a return to the app. An unchanged answer leaves the deck as it
     is: redrawing it would stop a scrub, settle a flip and scroll the paper */
  async reload() {
    const was = [this.sig, !!this.fault, this.checked];
    await this.refresh();
    if (this.view) return this.recheck();
    const same = this.sig === was[0] && !!this.fault === was[1];
    const empty = !(this.data?.items || []).length;   // the empty card shows when it was checked
    if (same && !(empty && this.checked !== was[2])) return;
    Home.render(this.data, this.fault, this.checked);
  },

  /* the open desk against the latest read: gone, changed, or the same
     revision, whose working mark (the one thing that moves without a new
     revision) is redrawn in place */
  recheck() {
    if (!this.desk) return;
    const it = this.find(this.desk.item.key);
    if (!it) {
      this.desk.flag(T.el("div", { class: "t-note amber" }, T.el("div", { class: "t-label" }, "RESOLVED ELSEWHERE"),
        T.el("p", {}, "This item left the deck while you had it open.")));
      return;
    }
    if (it.revision === this.desk.item.revision) return this.desk.sync(it);
    if (!this.desk.editing())
      this.desk.flag(T.el("div", { class: "t-note amber" }, T.el("div", { class: "t-label" }, "THIS CHANGED"),
        T.el("p", {}, "It was updated since you opened it."),
        T.el("div", { class: "t-row" }, T.el("button", { class: "t-btn", onclick: () => {
          this.close(); this.open(it.key);
        } }, "RELOAD IT"))));
  },
};

Tycho.app = App;
