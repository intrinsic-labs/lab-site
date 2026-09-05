/* THE BENCH — one sheet of items, judged one at a time.

   Not a primitive in the sense the other four are: it elicits nothing of its
   own. It is the WORKBENCH those primitives stand on — the deck on the left,
   the paper on the right, the stamps on their rest beside it, the reveal
   sliding in underneath — and it exists because REPLAY and CALIBRATE were the
   same three hundred lines twice over. Two copies of a commit path is two
   places for a blind-protocol bug to live, and both copies had the same two:
   an impression laid before the write was refused, and everything after the
   `await` landing on whatever card happened to be in front by then.

   So the SHAPE lives here and the CONTENT is the program's:

     Tycho.bench({
       w,                       // the window mount() was handed
       path: "/api/sheet/golden",
       title: s => `REPLAY — ${s}`,
       done: it => !!it.label,  // has this item been answered?
       doneWord: "labelled",    // "3/40 labelled"
       key:  it => it.n,        // what the telemetry record is keyed on
       heading: it => it.heading,
       faces: [{ id, label, tone }, …],          // the stamps on the rest
       card: (it, b) => ({ body, foot, guard?, onRefuse?, onLock? }),
       payload: (it, picked, trace, tele) => ({…}),   // the /api/label body
       apply: (it, picked, out, sent) => {},          // record the answer
       inkId: it => "y",        // which face an already-answered item wears
       reveal: { cap, of: it => it.judge, empty? },
       keys: (e, b) => true,    // the program's own keys, before the bench's
     });

   It returns `{ items, status, ord, idx, tele, stamp }` and has already
   painted; a thrown fetch has already put NO SIGNAL on the screen and
   returns null.

   TWO RULES IT OWNS, AND THEY ARE THE REASON IT EXISTS:

     · NO INK BEFORE THE WRITE IS ALLOWED. The stamp's `guard` runs before the
       impression is laid, so `writing` is folded into it rather than checked
       inside the commit — a second drop during an in-flight write used to
       show a verdict that was never written, and then `lock()` froze it there.
     · EVERYTHING AFTER THE AWAIT IS GATED ON THE CARD IT STARTED ON. `idx` is
       snapshotted at the top of the commit and every effect afterwards — the
       reveal, the lock, the item's own fields, the reset on a failure — is
       skipped if the deck has moved on. Otherwise a slow write paints its
       answer onto the next item's paper, which is the blind protocol broken
       by the machine rather than by the hand. */
"use strict";

Tycho.bench = async function bench(o) {
  const w = o.w;
  w.body.append(T.el("p", { class: "dim small" }, "reading sheet…"));
  let sheet;
  try { sheet = await T.api(o.path); }
  catch (e) {
    w.body.replaceChildren(T.el("div", { class: "t-box" },
      T.el("div", { class: "cap" }, "NO SIGNAL"),
      T.el("p", { class: "red" }, String(e.message))));
    return null;
  }

  const items = sheet.items;
  const ord = n => String(n).padStart(2, "0");
  const clean = s => String(s || "").replace(/`/g, "");
  let idx = Math.max(0, items.findIndex(it => !o.done(it)));
  if (items.every(it => o.done(it))) idx = 0;

  let st = null, tele = null, writing = false, hooks = {};

  function status(msg) {
    if (msg) return void w.statusbar.replaceChildren(msg);
    const done = items.filter(it => o.done(it)).length;
    w.statusbar.replaceChildren(
      T.el("b", {}, `${done}/${items.length}`), ` ${o.doneWord}`,
      T.el("span", { style: "flex:1" }),
      T.progress(done, items.length),
      T.el("span", {}, sheet.sheet));
  }

  /* -- the deck: the sequence, and the one in front ------------------------ */
  const deck = Tycho.flipCard({
    items, index: idx,
    render: it => ({
      title: clean(o.heading(it)),
      sub: `${ord(it.n)} / ${items.length} · ${o.done(it) ? o.doneWord : "open"}`,
    }),
    onChange: i => { idx = i; pane(); },
  });
  /* no ◀ ▶ pads: the cards themselves are the navigation now (flipcard.js).
     This is the counter alone, small and unboxed, so you can still see where
     in the deck you are. */
  const at = T.el("div", { class: "deck-at" });

  /* -- the pane: the paper, the rest, the reveal --------------------------- */
  const card = Tycho.indexCard({});
  const reveal = T.el("div", { class: "reveal" });
  const rest = T.el("div", { class: "rest" });

  w.body.classList.add("t-flush");
  w.body.replaceChildren(T.el("div", { class: "t-bench" },
    T.el("div", { class: "deck" }, deck.el, at),
    T.el("div", { class: "pane" }, card.el, rest, reveal)));

  /* the answer arrives as a second, smaller piece of the same paper sliding
     in under the card — not a third boxed panel */
  const showReveal = raw => reveal.replaceChildren(
    Tycho.indexCard({ small: true, body: T.el("div", {},
      T.el("div", { class: "t-card-cap" }, o.reveal.cap),
      T.md(raw)) }).el);

  async function commit(picked, trace) {
    /* WHICH CARD THIS IS THE VERDICT FOR. Everything below the await is
       checked against it: a write that lands after the deck has moved on has
       already written the right row, and must paint nothing. */
    const my = idx, it = items[my];
    if (writing) return;
    writing = true;
    tele.pick(picked);
    status(T.el("span", { class: "amber" }, "WRITING…"));
    try {
      /* built BEFORE the await, so what is recorded on the item afterwards is
         what actually went over the wire rather than whatever the card in
         front is holding by the time the answer comes back */
      const sent = o.payload(it, picked, trace, tele);
      const out = await T.api("/api/label", sent);
      o.apply(it, picked, out, sent);
      Sound.commit();
      if (my !== idx) { writing = false; return; }
      const raw = o.reveal.of(it) || o.reveal.empty;
      if (raw) showReveal(raw);
      st.lock();
      hooks.onLock?.();
      /* repaint the deck so the front card's sub line stops saying "open" */
      deck.set(items, idx);
      status();
      setTimeout(() => { writing = false; if (idx < items.length - 1) deck.next(); }, 900);
    } catch (e) {
      writing = false;
      if (my !== idx) return;
      /* nothing was written, so the impression comes back off the card — a
         stamp still sitting there would be a receipt for a write that never
         happened */
      st.reset();
      status(T.el("span", { class: "red" }, String(e.message)));
    }
  }

  /* the whole right column, rebuilt for whichever card is in front */
  function pane() {
    const it = items[idx];
    tele = new Tele(o.key(it));
    /* the impression is a child of the CARD, not of the stamp's own row, so
       building a fresh stamp for the next item does not take the last one's
       mark off the paper — the old stamp has to be told to lift it. Without
       this the previous item's verdict rides along on top of the next item's
       words, which since 2026-09-02 is loud rather than subtle: a dropped
       impression sits wherever the hand put it. */
    st?.reset();

    hooks = o.card(it, api) || {};
    card.set({ body: hooks.body, foot: hooks.foot });

    st = Tycho.stamp({
      faces: o.faces,
      target: card.el,
      /* the ink lands on the ITEM'S WORDS — not across the foot line, which is
         the one part of the paper that is the program's chrome */
      area: () => card.body,
      /* THE REFUSAL RUNS BEFORE ANY INK. `writing` belongs in here rather
         than in the commit for exactly that reason: a guard that lives past
         the impression is a guard the eye has already seen through. */
      guard: () => !writing && (hooks.guard ? hooks.guard() : true),
      onRefuse: () => { if (!writing) hooks.onRefuse?.(); },
      onStamp: commit,
    });
    rest.replaceChildren(st.el);

    reveal.replaceChildren();
    const raw = o.reveal.of(it);
    if (raw) showReveal(raw);
    if (o.done(it)) { st.ink(o.inkId(it)); st.lock(); hooks.onLock?.(); }

    at.textContent = `${ord(idx + 1)} / ${items.length}`;
    w.setTitle(o.title(sheet.sheet));
    status();
  }

  w.body.onkeydown = e => {
    tele?.input(e);
    if (o.keys?.(e, api)) return;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") return void deck.prev();
    if (e.key === "ArrowDown" || e.key === "ArrowRight") return void deck.next();
    st?.key(e);
  };
  w.body.tabIndex = 0;

  const api = {
    items, status, ord,
    get idx() { return idx; },
    get tele() { return tele; },
    get stamp() { return st; },
  };
  pane();
  w.body.focus({ preventScroll: true });
  return api;
};
