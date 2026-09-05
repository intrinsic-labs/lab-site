/* TERM — a real local shell in a TychoOS window, rendered by xterm.js
   (vendored, MIT). Full ANSI/TUI support: vim, top, claude — the works.
   Token-gated (one paste per device, remembered); pty sessions survive
   window-close and tab-suspend — reattach resumes from the ring buffer.
   Up to 4 shells live in a tab strip at the top of the body; each tab is its
   own xterm instance, so switching flips displays — no clear, no replay.

   One WEBSOCKET per tab carries input and output both. It replaced a long-poll
   GET plus one POST per onData, which had no ordering: six parallel requests
   raced onto the pty, so a burst of typing arrived scrambled and a TUI's escape
   sequences arrived wedged. `/api/term` still carries start/list/kill — one-shot
   control verbs, where order cannot matter. See tycho/term_socket.py. */
"use strict";

Tycho.register({
  id: "term", kind: null,
  title: "TERM", glyph: ">_",
  blurb: "A real local shell, rendered by xterm.js. Full ANSI/TUI — vim,\ntop, claude. Up to 4 tabs; pty sessions survive window-close and\ntab-suspend, so reattaching resumes where you left it.",

  mount(w) {
    const MAX = 4;
    const store = {
      get token() { return localStorage.getItem("tycho.term.token") || ""; },
      set token(v) { localStorage.setItem("tycho.term.token", v); },
      get tabs() {
        try { return JSON.parse(localStorage.getItem("tycho.term.tabs")) || []; }
        catch { return []; }
      },
      set tabs(v) { localStorage.setItem("tycho.term.tabs", JSON.stringify(v)); },
      get active() { return +(localStorage.getItem("tycho.term.active") || 0); },
      set active(v) { localStorage.setItem("tycho.term.active", v); },
    };
    /* migrate the pre-tabs singular keys into one seeded tab */
    {
      const old = localStorage.getItem("tycho.term.sid");
      if (old) {
        if (!store.tabs.length) store.tabs = [{ sid: old }];
        localStorage.removeItem("tycho.term.sid");
        localStorage.removeItem("tycho.term.off");
      }
    }

    /* { sid, label, host, term, fit, alive, offset, sock, queue, retry } */
    const tabs = [];
    let act = -1, booted = false;
    const strip = T.el("div", { class: "t-tabs" });
    const origClose = w.close;
    const sleep = ms => new Promise(res => setTimeout(res, ms));
    const cur = () => tabs[act] || null;

    async function api(body) {
      return T.api("/api/term", { token: store.token, ...body });
    }
    /* every byte the user produces — keys, softkeys, and a mouse-tracking TUI's
       pointer reports — goes out the tab's own socket, in order. While one is
       still opening the bytes queue (bounded); a keystroke is never silently
       dropped into a reconnect. */
    function put(tab, data) {
      if (!tab?.sid) return status("NO SESSION");
      const msg = JSON.stringify({ t: "i", d: data });
      if (tab.sock?.readyState === WebSocket.OPEN) return tab.sock.send(msg);
      if (tab.queue.length < 256) tab.queue.push(msg);
    }
    function send(data) { put(cur(), data); }   /* softkeys → the active tab */
    /* the soft-keyboard toolbar's hook (tycho/os/soft-keyboard.js): ESC/TAB/
       arrow taps and the CTRL/ALT sticky modifiers reach whichever tab is
       active through this one door, without the toolbar knowing anything
       about tabs, sockets or xterm. Reassigned on every mount — TERM is a
       singleton window, so there is only ever one live hook — and left in
       place after close: `put` already says NO SESSION for a dead tab, so a
       stale reference is harmless rather than something needing teardown. */
    Tycho.term = {
      send,
      focused: () => document.activeElement?.closest?.('.t-window[data-pid="term"]') || null,
    };
    function save() {
      store.tabs = tabs.map(t => ({ sid: t.sid, label: t.label || "" }));
      store.active = Math.max(0, act);
    }

    /* -- tab strip ----------------------------------------------------------- */
    function tabLabel(t, i) {
      const l = (t.label || "").trim();
      return l ? (l.length > 8 ? l.slice(0, 8) + "…" : l).toUpperCase() : `S${i + 1}`;
    }
    function renderStrip() {
      const cells = tabs.map((t, i) => {
        const cell = T.el("span", {
          class: "cell" + (i === act ? " on" : ""),
          onpointerup: () => { if (i !== act) show(i); },
        }, tabLabel(t, i));
        if (i === act && tabs.length > 1) cell.append(   /* detach, never kill */
          T.el("span", { class: "x", onpointerup: e => {
            e.stopPropagation(); closeTab(i);
          } }, "×"));
        return cell;
      });
      if (tabs.length < MAX) cells.push(T.el("span", {
        class: "cell plus",
        onpointerup: () => { newTab().catch(e => status(String(e.message))); },
      }, "+"));
      strip.replaceChildren(...cells);
    }

    /* -- one socket per tab -------------------------------------------------
       A dropped socket reconnects from tab.offset, so the server's ring buffer
       replays exactly what was missed — which is what makes a suspended tablet
       tab resume mid-scrollback instead of blank. Hidden tabs hold theirs open:
       a websocket is not an HTTP connection and does not compete for the pool
       the old long-poll had to ration. */
    function connect(tab) {
      if (!tab.alive || !tab.sid) return;
      const sid = tab.sid;
      const scheme = location.protocol === "https:" ? "wss://" : "ws://";
      let sock;
      try {
        sock = new WebSocket(`${scheme}${location.host}/api/term/ws?sid=${sid}` +
          `&offset=${tab.offset}&token=${encodeURIComponent(store.token)}`);
      } catch { return void retry(tab, sid); }
      tab.sock = sock;
      sock.onopen = () => {
        if (sid !== tab.sid) return sock.close();
        tab.retry = 0;
        const q = tab.queue.splice(0);
        for (const m of q) sock.send(m);
        resize(tab);
        if (tab === cur()) status("LINKED");
      };
      sock.onmessage = e => {
        if (sid !== tab.sid) return;
        let m; try { m = JSON.parse(e.data); } catch { return; }
        if (m.d) tab.term.write(m.d);
        if (typeof m.o === "number") tab.offset = m.o;
        if (m.dead) { tab.sock = null; sock.close(); ended(tab, "SESSION ENDED"); }
      };
      sock.onclose = () => {
        if (tab.sock !== sock || sid !== tab.sid || !tab.alive) return;
        tab.sock = null;
        retry(tab, sid);
      };
      sock.onerror = () => { try { sock.close(); } catch {} };
    }
    /* a close mid-session is almost always the pty outliving a network blip, so
       reconnect rather than declare the session over — the server is the only
       thing that may say a session is gone, and it says it as `dead` or by
       refusing the handshake with 410 */
    async function retry(tab, sid) {
      const wait = Math.min(3000, 400 * Math.pow(2, tab.retry++));
      if (tab === cur()) status("RECONNECTING…");
      await sleep(wait);
      if (!tab.alive || sid !== tab.sid) return;
      try {
        const live = (await api({ op: "list" })).sessions
          .some(s => s.sid === sid && !s.dead);
        if (!live) return ended(tab, "SESSION GONE");
      } catch { /* the server itself is down — keep trying */ }
      connect(tab);
    }
    /* -- coming back after a suspension --------------------------------------
       A frozen tab's sockets die without ever firing `onclose` in time to
       matter, and a tab that DID fire it is sitting out the tail of its
       exponential backoff — up to three seconds of a dead-looking terminal
       after the screen is already back. So a resume resets the backoff and
       reconnects anything not currently open, right now. The replay is free:
       `connect` reconnects from `tab.offset` and the server's ring buffer
       hands back exactly what was missed. */
    const unResume = Tycho.onResume(({ awayMs }) => {
      if (!w.body.isConnected) return void unResume();
      if (awayMs < 5_000) return;
      for (const tab of tabs) {
        if (!tab.alive || !tab.sid) continue;
        if (tab.sock?.readyState === WebSocket.OPEN) continue;
        drop(tab);
        tab.retry = 0;
        connect(tab);
      }
    });

    function resize(tab) {
      if (tab.sock?.readyState === WebSocket.OPEN)
        tab.sock.send(JSON.stringify({ t: "r", c: tab.term.cols, r: tab.term.rows }));
    }
    function drop(tab) {
      const sock = tab.sock;
      tab.sock = null; tab.queue.length = 0;
      try { sock?.close(); } catch {}
    }
    function ended(tab, why) {
      tab.sid = "";
      drop(tab);
      tab.term.write(`\r\n[${why.toLowerCase()} — × closes this tab, + opens a new shell]\r\n`);
      if (tab === cur()) status(why);
      save(); renderStrip();
    }

    /* build a tab: its own Terminal + FitAddon + host div. The new tab is
       revealed before term.open — xterm can't measure a display:none host. */
    function makeTab(sid, label) {
      const host = T.el("div", { style: "height:100%;background:#0b0e12" });
      const tab = { sid: sid || "", label: label || "", host, alive: true,
                    offset: 0, sock: null, queue: [], retry: 0 };
      w.body.append(host);
      tabs.push(tab);
      act = tabs.length - 1;
      for (const t of tabs) t.host.style.display = t === tab ? "" : "none";
      tab.term = new Terminal({
        allowProposedApi: true,
        cursorBlink: true,
        fontFamily: '"Departure Mono", Menlo, monospace',
        fontSize: 12,
        /* The OS's own ink went cold white-blue on 2026-09-02, so the ground,
           the foreground, the cursor and the selection follow it. The ANSI
           SLOTS do not: `green` here is what a program ASKING for green gets,
           and a shell painting a passing test green must not come out the
           colour of the chrome. They stay their own colours, tuned to this
           ground — and ANSI green is now the OS's own --ok, since the two mean
           the same thing on this screen. */
        theme: {
          background: "#0b0e12", foreground: "#cfe3f0",
          cursor: "#cfe3f0", cursorAccent: "#0b0e12",
          selectionBackground: "#2a3a44", selectionForeground: "#eaf4fd",
          /* ANSI black is a step below the selection wash on purpose: they
             were the same value, so selected text on a black cell vanished */
          black: "#1b262d", red: "#ff5340", green: "#6ee7a0",
          yellow: "#ffd24d", blue: "#5aa9ff", magenta: "#ff9b3d",
          cyan: "#7ce0e6", white: "#cfe3f0",
          brightBlack: "#6b8798", brightRed: "#ff7a6b", brightGreen: "#a4f2c4",
          brightYellow: "#ffe38f", brightBlue: "#8cc4ff", brightMagenta: "#ffba75",
          brightCyan: "#b0f0f4", brightWhite: "#eaf4fd",
        },
      });
      tab.fit = new FitAddon.FitAddon();
      tab.term.loadAddon(tab.fit);
      tab.term.open(host);
      tab.fit.fit();
      /* a CTRL/ALT sticky latch armed on the soft-keyboard toolbar transforms
         the very next byte typed here — Ctrl-C out of a tablet with no
         hardware Control key. Optional-chained: TERM works unmodified if the
         toolbar script is missing or hasn't loaded yet. */
      tab.term.onData(d => put(tab,
        typeof SoftKB !== "undefined" ? SoftKB.filterTermData(d) : d));
      tab.term.onResize(() => resize(tab));
      return tab;
    }
    function discard(tab) {
      const i = tabs.indexOf(tab);
      tab.alive = false;
      drop(tab);
      try { tab.term?.dispose(); } catch {}
      tab.host.remove();
      if (i >= 0) tabs.splice(i, 1);
      if (act > i) act--;
      if (act >= tabs.length) act = tabs.length - 1;
    }

    async function newTab(sid, label) {
      if (tabs.length >= MAX) { status("4 SHELLS MAX"); return null; }
      const tab = makeTab(sid, label);
      try {
        if (!tab.sid) {
          const r = await api({ op: "start",
            cols: tab.term.cols, rows: tab.term.rows });
          tab.sid = r.sid; tab.offset = 0;
        }
      } catch (e) { discard(tab); renderStrip(); throw e; }
      status("LINKED");
      connect(tab);   /* the socket carries the size; no separate resize call */
      renderStrip(); save();
      tab.term.focus();
      return tab;
    }

    /* live switch: flip displays — the hidden xterm kept its screen state */
    function show(i) {
      act = i;
      tabs.forEach((t, j) => t.host.style.display = j === i ? "" : "none");
      const t = tabs[i];
      try { t.fit.fit(); } catch {}
      status(t.sid ? "LINKED" : "SESSION ENDED");
      renderStrip(); save();
      t.term.focus();
    }

    /* tab close = detach only; the pty stays alive server-side (KILL kills) */
    function closeTab(i) {
      const wasAct = i === act;
      discard(tabs[i]);
      if (!tabs.length) {
        act = -1; save();
        newTab().catch(e => status(String(e.message)));
        return;
      }
      if (wasAct) show(Math.min(i, tabs.length - 1));
      else { renderStrip(); save(); }
    }

    /* termAt hands us a sid: reuse a tab already on it, a
       new tab if there's room, else repoint the active tab (the displaced
       pty stays alive server-side — reachable again via termAt) */
    function adopt(sid, label) {
      const i = tabs.findIndex(t => t.sid === sid);
      if (i >= 0) return show(i);
      if (tabs.length < MAX) {
        newTab(sid, label).catch(e => status(String(e.message)));
        return;
      }
      const tab = cur();
      drop(tab);                                /* the displaced pty stays alive */
      tab.sid = sid; tab.label = label || ""; tab.offset = 0; tab.retry = 0;
      tab.term.clear(); tab.term.reset();       /* rebind replays — that's fine */
      status("LINKED");
      connect(tab);
      renderStrip(); save();
      tab.term.focus();
    }

    function status(s) {
      const key = (label, seq) => T.el("button",
        { class: "t-btn", style: "padding:2px 8px;font-size:10px",
          onclick: () => send(seq) }, label);
      w.statusbar.replaceChildren(
        T.el("b", {}, s),
        T.el("span", { style: "flex:1" }),
        key("ESC", "\x1b"), key("TAB", "\t"), key("^C", "\x03"),
        key("↑", "\x1b[A"), key("↓", "\x1b[B"),
        T.el("button", { class: "t-btn danger",
          style: "padding:2px 8px;font-size:10px",
          onclick: async () => {
            const t = cur(); if (!t) return;
            if (t.sid) await api({ op: "kill", sid: t.sid }).catch(() => {});
            closeTab(act);       /* closeTab starts a fresh shell if none left */
          } }, "KILL"));
    }

    /* -- frame: the tab strip, then the hosts, both inside the body ---------- */
    function setup() {
      if (booted) return;
      booted = true;
      w.body.replaceChildren();
      w.body.style.padding = "6px";
      w.body.parentElement.insertBefore(strip, w.body);
      new ResizeObserver(() => {
        const t = cur(); if (t) try { t.fit.fit(); } catch {}
      }).observe(w.body);
    }

    async function init() {
      setup();
      let saved = store.tabs.slice(0, MAX);
      if (saved.length) {
        /* revive only the tabs whose sessions still exist on the server;
           a failed roster read means a bad token — fall through to gate() */
        const live = new Map((await api({ op: "list" })).sessions
          .filter(s => !s.dead).map(s => [s.sid, s.label]));
        saved = saved.filter(t => live.has(t.sid))
          .map(t => ({ sid: t.sid, label: t.label || live.get(t.sid) }));
      }
      if (saved.length) {
        const keep = store.active;
        for (const t of saved) await newTab(t.sid, t.label);
        show(Math.min(Math.max(0, keep), tabs.length - 1));
      } else if (!w.args?.sid) {
        await newTab();
      }
      if (w.args?.sid) adopt(w.args.sid, w.args.label);
    }

    /* -- token gate ---------------------------------------------------------- */
    function gate(err) {
      strip.remove(); booted = false;
      while (tabs.length) discard(tabs[0]);
      act = -1;
      w.body.style.padding = "";
      const tok = T.el("input", { class: "t-field", type: "password",
        placeholder: "terminal token — ~/.cache/tycho/term-token on the Mac" });
      const go = T.el("button", { class: "t-btn primary" }, "LINK");
      go.onclick = async () => {
        store.token = tok.value.trim();
        try { await init(); }
        catch (e) { gate(String(e.message)); }
      };
      tok.onkeydown = e => { if (e.key === "Enter") go.click(); };
      w.body.replaceChildren(T.el("div", { class: "t-box" },
        T.el("div", { class: "cap" }, "AUTHORIZATION REQUIRED"),
        T.el("p", { class: "small dim", style: "margin-bottom:8px" },
          "A shell is the whole machine. The token proves it's you — once per device."),
        err ? T.el("p", { class: "red small", style: "margin-bottom:8px" }, err) : null,
        tok, T.el("div", { style: "height:8px" }), go));
      w.statusbar.replaceChildren(T.el("span", {}, "NOT LINKED"));
    }

    w.close = () => {                       /* sessions survive close */
      for (const t of tabs) { t.alive = false; drop(t); }
      origClose();
    };

    /* a caller hands over a freshly started session as {sid, label} — adopt
       whether this window is being mounted or was already open */
    w.onWake(spec => { if (spec?.sid && booted) adopt(spec.sid, spec.label); });

    if (typeof Terminal === "undefined") {
      w.body.replaceChildren(T.el("p", { class: "red" },
        "xterm vendor files missing — see tycho/os/vendor/"));
      return;
    }
    if (store.token) init().catch(() => gate());
    else gate();
  },
});
