/* REVIEW · Monday — this week's Monday meeting, opened from home's menu.

   The meeting as IntrinsicOS recorded it (`intrinsic monday read`, relayed
   by tycho/monday.py): the "State of the company" note and the action list,
   under the shared top bar, with ‹ previous / next › stepping between
   meetings in place (monday-view.js draws it). Read-only: nothing on it acts,
   and nothing on it is a card. `#monday` opens it from a link, and
   `#monday=YYYY-MM-DD` one meeting.

   It opens fast: the latest meeting read last time (`tycho.monday.last`) is
   drawn at once while the live read lands, every meeting read while the
   screen is open is kept, and once one is drawn the one before it is read
   ahead, so last week is one tap away with no wait. A return to the app
   reads the shown meeting again. A failed read says so over what was shown;
   a runtime without the verb says it needs an update.

     const v = Monday.render({ back, date? });   // v.el · v.page · v.dispose() */
"use strict";

const Monday = {
  LAST: "tycho.monday.last",
  FRESH_MS: 20_000,

  render(ctl) {
    const box = T.el("div", { class: "t-monday-body", "aria-live": "polite" });
    const page = T.el("div", { class: "t-monday-page" }, T.el("div", { class: "t-monday-inner" }, box));
    const el = T.el("section", { class: "t-monday", "data-pid": "monday" },
      TopBar.render({ title: "Monday", back: () => ctl.back() }), page);

    /* answers by the date asked for ("" is the latest), each with when it came */
    const kept = new Map();
    let want = ctl.date || "", shown = null, fault = null, alive = true;

    const draw = () => {
      if (!alive) return;
      const m = shown;
      if (!m) {
        box.replaceChildren(fault ? this.trouble(fault) : T.el("p", { class: "dim" }, "Reading the meeting…"));
        return;
      }
      if (!m.date) {
        box.replaceChildren(fault ? this.trouble(fault) : T.el("p", { class: "dim t-monday-empty" }, "No Monday meeting recorded yet."));
        return;
      }
      box.replaceChildren(MondayView.head(m, step),
        ...(fault ? [this.stale(fault)] : []), ...MondayView.body(m));
    };

    const keep = (asked, m) => {
      const at = Date.now();
      kept.set(asked, { m, at });
      if (m.date) kept.set(m.date, { m, at });
      if (asked === "" && m.date) Store.set(this.LAST, m);
    };

    const fetchOne = async asked => {
      const out = await Wire.monday(asked);
      if (out.ok) keep(asked, out);
      return out;
    };

    /* read ahead: the meeting before this one, quietly */
    const ahead = m => {
      if (m?.previous && !kept.has(m.previous)) fetchOne(m.previous).catch(() => {});
    };

    let seq = 0;
    const load = async asked => {
      const mine = ++seq;
      const out = await fetchOne(asked);
      if (!alive || mine !== seq) return;
      if (out.ok) { shown = out; fault = null; } else fault = out;
      draw();
      if (out.ok) ahead(out);
    };

    const step = date => {
      want = date;
      seq++;  // a read still on its way for the meeting left behind must not redraw it
      const k = kept.get(date);
      if (k) { shown = k.m; fault = null; draw(); page.scrollTop = 0; ahead(k.m); if (Date.now() - k.at < this.FRESH_MS) return; }
      else { shown = null; fault = null; draw(); page.scrollTop = 0; }
      load(date);
    };

    const last = want ? null : Store.get(this.LAST);
    if (last?.date) shown = last;
    draw();
    load(want);

    const resume = () => { if (alive && document.visibilityState === "visible") load(want); };
    document.addEventListener("visibilitychange", resume);
    return {
      el, page,
      dispose() { alive = false; document.removeEventListener("visibilitychange", resume); },
    };
  },

  /* nothing to show: why */
  trouble(out) {
    if (out.code === "unsupported")
      return T.el("p", { class: "dim" }, out.reason || "The Monday meeting needs a runtime update.");
    return T.el("div", { class: "t-note amber" }, T.el("div", { class: "t-label" }, "MEETING UNAVAILABLE"),
      T.el("p", {}, String(out.reason || "The meeting couldn't be read.")));
  },

  /* a meeting on screen, and the latest read of it failed */
  stale(out) {
    if (out.code === "unsupported") return T.el("p", { class: "dim" }, out.reason);
    return T.el("div", { class: "t-note amber" }, T.el("div", { class: "t-label" }, "LAST READ FAILED"),
      T.el("p", {}, `${out.reason || "The meeting couldn't be read."} This is what was read before.`));
  },
};
