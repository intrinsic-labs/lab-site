/* SYSTEM — the control panel. Every setting here is device-local (localStorage,
   applied by Sys in the kernel): text size, sound, and the two
   forget-this-device actions. Nothing here touches the server or the corpus —
   which is why none of it needs the token. */
"use strict";

Tycho.register({
  id: "system", kind: "system",
  title: "SYSTEM", glyph: "▤",
  blurb: "The control panel. Text size, sound, and the two forget-this-device\nactions. Every setting is device-local — nothing here\ntouches the server or the corpus.",

  mount(w) {
    const btn = (label, cls, onclick) =>
      T.el("button", { class: `t-btn ${cls || ""}`, onclick }, label);
    const kv = (k, v) => T.el("div", { class: "t-kv" },
      T.el("span", { class: "k" }, k), T.el("span", { class: "dots" }),
      T.el("span", { class: "v" }, v));

    /* ABOUT — identity + the living component gallery, now a SYSTEM subscreen.
       The way back is a text link in the body: the titlebar's ◂ that used to
       carry it is gone (2026-09-02), and a subscreen that can only be left by
       closing the program is a dead end. */
    const about = () => {
      w.setTitle("SYSTEM — ABOUT");
      w.body.replaceChildren(
        T.el("a", { class: "t-back", href: "#",
          onclick: e => { e.preventDefault(); draw(); } }, "◀ SYSTEM"),
        T.el("div", { class: "t-box" },
          T.el("div", { class: "cap" }, "SYSTEM"),
          kv("VERSION", `TYCHO OS ${Tycho.VERSION}`),
          kv("MODE", "LOCAL · LOOPBACK ONLY"),
          kv("CORPUS", "ATTACHED"),
          kv("PURPOSE", "SHARPEN THE MODEL OF YOU")),
        T.el("div", { class: "t-box" },
          T.el("div", { class: "cap" }, "COMPONENT GALLERY"),
          T.el("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px" },
            T.el("button", { class: "t-btn" }, "BUTTON"),
            T.el("button", { class: "t-btn primary" }, "PRIMARY"),
            T.el("button", { class: "t-btn danger" }, "DANGER"),
            T.el("button", { class: "t-btn", disabled: true }, "DISABLED")),
          T.el("div", { class: "t-seg", style: "margin-bottom:8px" },
            T.el("button", { class: "t-btn on" }, "ON"),
            T.el("button", { class: "t-btn" }, "OFF"),
            T.el("button", { class: "t-btn" }, "OFF")),
          T.el("input", { class: "t-field", placeholder: "text field",
                          style: "margin-bottom:8px" }),
          T.progress(7, 10),
          T.el("div", { style: "height:8px" }),
          kv("DOTTED LEADER", "VALUE"),
          T.el("textarea", { class: "t-textarea t-seed", rows: 2,
                             style: "margin-top:8px" }, "editable seed prompt (.t-seed)"),
          /* the dock as it is since 2026-09-02: floating icons, no bar, and
             the trash can at the far end */
          T.el("div", { class: "t-dock", style: "margin-top:8px" },
            T.el("span", { class: "t-dock-cells" },
              T.el("span", { class: "item on" },
                T.el("span", { class: "glyph" }, "▤"),
                T.el("span", { class: "lab" }, "ACTIVE")),
              T.el("span", { class: "item" },
                T.el("span", { class: "glyph" }, "▣"),
                T.el("span", { class: "lab" }, "OPEN")),
              T.el("span", { class: "item run" },
                T.el("span", { class: "glyph" }, "▁"),
                T.el("span", { class: "lab" }, "RUNNING")),
              T.el("span", { class: "item pin" },
                T.el("span", { class: "glyph" }, "▽"),
                T.el("span", { class: "lab" }, "PINNED")))),
          T.el("div", { class: "t-tabs", style: "margin-top:8px" },
            T.el("span", { class: "cell on" }, "S1",
              T.el("span", { class: "x" }, "×")),
            T.el("span", { class: "cell" }, "S2"),
            T.el("span", { class: "cell plus" }, "+")),
          T.el("div", { class: "t-thread", style: "margin-top:8px;max-height:130px" },
            T.el("div", { class: "msg you" },
              T.el("span", { class: "tag" }, "YOU"),
              T.el("span", { class: "txt" }, "message thread — .you right-aligned")),
            T.el("div", { class: "msg" },
              T.el("span", { class: "tag" }, "VAULT"),
              T.el("span", { class: "txt" }, "a reply lands on the left")),
            T.el("div", { class: "msg sys" }, "— .sys divider —"),
            T.el("div", { class: "msg busy" },
              T.el("span", { class: "tag" }, "VAULT"),
              T.el("span", { class: "txt" }, ".busy — a request is out"))),
          T.el("div", { style: "margin-top:8px" },
            T.el("div", { class: "row sel on" },
              T.el("span", { class: "dim" }, "▸▸"),
              T.el("span", { class: "id" }, "ROW.ON"),
              T.el("span", { class: "txt" }, "selectable list row — in flight / next up")),
            T.el("div", { class: "row sel" },
              T.el("span", { class: "dim" }, "02"),
              T.el("span", { class: "id" }, "ROW.SEL"),
              T.el("span", { class: "txt" }, "hover to invert; click to select"))),
          /* the form kit — INTAKE's shapes */
          T.el("div", { class: "t-form-row", style: "margin-top:12px" },
            T.el("label", { class: "k" }, "LABEL"),
            T.el("div", { class: "f" },
              T.el("input", { class: "t-field picked",
                              value: "form row · .picked field" }))),
          T.el("div", { class: "t-form-row" },
            T.el("label", { class: "k" }, "PAIR"),
            T.el("div", { class: "f" },
              T.el("div", { class: "pair" },
                T.el("input", { class: "t-field", placeholder: "two up" }),
                T.el("input", { class: "t-field", placeholder: "one row" })))),
          T.el("div", { class: "t-pick", style: "position:static;border-top:var(--line-hot)" },
            T.el("div", { class: "row sel lead" },
              T.el("span", { class: "id" }, "PICK LIST"),
              T.el("span", { class: "dim" }, "filtered")),
            T.el("div", { class: "row sel" },
              T.el("span", { class: "id" }, "SECOND MATCH"),
              T.el("span", { class: "dim" }, "category"))),
          T.el("div", { class: "t-flag t-won" },
            T.icon("check"), T.el("b", {}, "xxx-1 FILED ✓"),
            T.el("span", { class: "when" }, "the affirmative flag — the OS's one green")),
          T.el("div", { class: "t-box t-fail" },
            T.el("div", { class: "cap" }, "NOT FILED"),
            T.el("p", { class: "red" }, T.icon("warn"), " the refusal box")),
          T.el("div", { class: "t-receipt" },
            T.el("span", { class: "dim" }, "filed: "),
            T.el("a", { class: "out", href: "#" }, "xxx-1"),
            T.el("span", { class: "dim" }, " · "),
            T.el("a", { class: "out", href: "#" }, "xxx-2"))),
        primitives());
      w.statusbar.replaceChildren(T.el("span", {},
        "TYCHO is a calibration instrument. It is also an OS. These are the same thing."));
    };

    /* THE PHYSICAL PRIMITIVES, live and pressable (primitives-thinking-
       2026-09-01.md §4). This is the only place the trays exist yet — they are
       built and unwired on purpose, because the surface that needs them (the
       deck / quests) is gated on tyc-1, and a primitive nobody can put their
       hands on cannot be judged. Stamping HERE writes nothing anywhere: the
       target is a sample card, which is also how the impression gets
       screenshotted without a real label landing in the corpus. */
    const primitives = () => {
      const card = Tycho.indexCard({
        title: "INDEX CARD",
        body: "A card is **paper** — rounded corners, ruled lines, and the body " +
              "text sits on the ruling rather than floating over it.\n\n" +
              "It elicits nothing by itself. It is the surface the instruments " +
              "act on: what the stamp lands on, what a slip clips to.",
        foot: T.el("span", {}, "SAMPLE · nothing here writes"),
      });
      card.el.style.height = "200px";
      const st = Tycho.stamp({
        faces: [{ id: "ok", label: "APPROVED", tone: "ok" },
                { id: "no", label: "REJECTED", tone: "red" }],
        target: card.el,
      });
      const trayLog = T.el("span", { class: "dim small" }, "drag the file into a tray");
      const tr = Tycho.trays({
        trays: [{ id: "in", label: "IN" }, { id: "out", label: "OUT" }],
        onDrop: (id, item, trace) => {
          trayLog.textContent =
            `→ ${id.toUpperCase()} · ${trace.total_ms}ms · ` +
            `${trace.path.length} samples · ${trace.reversals} reversals`;
          setTimeout(() => tr.feed(Tycho.docIcon("SAMPLE.md")), 400);
        },
      });
      tr.feed(Tycho.docIcon("SAMPLE.md"));

      return T.el("div", { class: "t-box" },
        T.el("div", { class: "cap" }, "PRIMITIVES"),
        T.el("p", { class: "dim small", style: "margin-bottom:8px" },
          "INDEX CARD + RUBBER STAMP — pick a stamp up off the rest and drop it on the card"),
        T.el("div", { style: "display:flex;gap:16px;align-items:stretch" },
          T.el("div", { style: "flex:1;min-width:0;display:flex" }, card.el),
          st.el),
        T.el("p", { class: "dim small", style: "margin:14px 0 8px" },
          "FLIP CARD — tap the top card to flip it down, the bottom card to lift it back"),
        Tycho.flipCard({
          items: ["FIRST", "SECOND", "THIRD"],
          render: it => ({ title: it, sub: "A DECK HAS A FRONT" }),
        }).el,
        T.el("p", { class: "dim small", style: "margin:14px 0 8px" },
          "IN / OUT TRAYS — the drag is the instrument, the path is the signal"),
        tr.el,
        T.el("div", { style: "margin-top:8px" }, trayLog));
    };

    const draw = () => {
      w.setTitle("SYSTEM");
      const s = Sys.get();
      const textNow = Sys.SCALES[s.text] ? s.text : "standard";

      /* text size — scales the type tokens, layout stays put */
      const sizes = Object.keys(Sys.SCALES);
      const textSeg = T.el("div", { class: "t-seg" },
        ...sizes.map(k => T.el("button", {
          class: "t-btn" + (k === textNow ? " on" : ""),
          onclick: () => { Sys.set({ text: k }); draw(); },
        }, k.toUpperCase())));

      /* sound — the same switch the menu bar's SND item flips */
      const sound = btn(`SOUND: ${Sound.on ? "ON" : "OFF"}`, Sound.on ? "" : "", () => {
        Sound.toggle(); Tycho.menubar(); draw();
      });

      w.body.replaceChildren(
        T.el("div", { class: "t-box" },
          T.el("div", { class: "cap" }, "DISPLAY"),
          T.el("p", { class: "dim small", style: "margin-bottom:6px" }, "TEXT SIZE"),
          textSeg,
          ),
        T.el("div", { class: "t-box" },
          T.el("div", { class: "cap" }, "SOUND"),
          sound,
          T.el("p", { class: "dim small", style: "margin-top:6px" },
            "the boot chime, the clicks, the commit tone — one switch")),
        T.el("div", { class: "t-box" },
          T.el("div", { class: "cap" }, "THIS DEVICE"),
          T.el("div", { style: "display:flex;gap:8px;flex-wrap:wrap" },
            btn("FORGET TERMINAL TOKEN", "", () => {
              localStorage.removeItem("tycho.term.token");
              w.statusbar.replaceChildren(T.el("span", { class: "amber small" },
                "token forgotten — the next write asks for it again"));
            }),
            btn("SHUT DOWN", "", () => location.reload())),
          T.el("p", { class: "dim small", style: "margin-top:8px" },
            "settings live in this browser only — nothing here reaches the server")),
        T.el("div", { class: "t-box" },
          T.el("div", { class: "cap" }, "ABOUT"),
          btn("IDENTITY + COMPONENT GALLERY", "", about)));
      w.statusbar.replaceChildren(
        T.el("span", { class: "dim" }, `TychoOS ${Tycho.VERSION} · device-local`));
    };

    draw();
  },
});
