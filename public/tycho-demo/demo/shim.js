/* TYCHO DEMO · the mock server.

   The real shell talks to tycho/server.py over `/api/*` (and probes `/health`).
   This script is loaded before the kernel and wraps `fetch`, so every one of
   those calls is answered here, from memory, against the synthetic corpus in
   demo/corpus.js. Nothing leaves the page: a URL this shim does not recognise
   falls through to the real `fetch`, and the shell only ever asks for its own
   static files that way.

   The contract mirrored is files.py / server.py — same ops, same envelopes
   ({ok:true, …} or {ok:false, reason} + `error` on a 4xx) — so the shell runs
   byte-for-byte unmodified. Writes (rename, new file, trash, put back, captions,
   a CALIBRATE verdict) mutate the in-memory tree and last until the page is
   reloaded; the token gate the Mac enforces is not enforced here, since there
   is no Mac. Anything that needs one — a pty, the vault, a model — refuses in
   the shell's own error voice. */
"use strict";

(function () {
  const C = window.TYCHO_DEMO_CORPUS;
  if (!C) throw new Error("demo/corpus.js must load before demo/shim.js");
  const ROOT = C.ROOT;
  const labels = { ...C.LABELS };
  const sheet = C.SHEET;
  const trash = [];
  const PER_CABINET = 3;
  const now = () => Math.floor(Date.now() / 1000);
  const okName = n => !!n && !n.startsWith(".") && !n.includes("/") && n.length <= 120;

  /* -- the tree ----------------------------------------------------------- */
  const segs = rel => String(rel || "").split("/").filter(Boolean);
  function resolve(rel) {
    const parts = segs(rel);
    if (parts.some(s => s === "..")) return null;
    let node = ROOT, parent = null;
    for (const s of parts) {
      if (node.kind !== "dir") return null;
      parent = node;
      node = node.children.find(c => c.name === s);
      if (!node) return { missing: true, parent, name: s, rel: parts.join("/") };
    }
    return { node, parent, rel: parts.join("/") };
  }
  const entry = n => ({ name: n.name, kind: n.kind, mtime: n.mtime, size: n.kind === "file" ? new TextEncoder().encode(n.text).length : 0 });
  const moveLabels = (from, to) => {
    for (const k of Object.keys(labels)) {
      if (k === from || k.startsWith(from + "/")) { labels[to + k.slice(from.length)] = labels[k]; delete labels[k]; }
    }
  };
  const dropLabels = key => { for (const k of Object.keys(labels)) if (k === key || k.startsWith(key + "/")) delete labels[k]; };

  const refuse = reason => ({ ok: false, reason });

  function files(req) {
    const op = req.op;
    const r = resolve(req.path);
    if (r === null) return refuse("path leaves the desktop folder");
    const { node, parent, rel } = r;

    if (op === "list") {
      if (!node || node.kind !== "dir") return refuse("not a folder");
      const entries = node.children.filter(c => !c.name.startsWith(".")).map(entry)
        .sort((a, b) => (a.kind !== "dir") - (b.kind !== "dir") || a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      return { ok: true, entries, root: C.rootPath };
    }
    if (op === "read") {
      if (!node || node.kind !== "file") return refuse("not a file");
      return { ok: true, text: node.text };
    }
    if (op === "labels") return { ok: true, labels };
    if (op === "label") {
      const key = String(req.path || "").trim().replace(/^\/+|\/+$/g, "");
      if (!key) return refuse("one drawer at a time");
      if (!key.startsWith("@") && (segs(key).length > 2 || !segs(key).every(okName))) return refuse("one drawer at a time");
      const cur = { ...(labels[key] || {}) };
      for (const k of ["name", "meta"]) {
        if (k in req) { const v = String(req[k] || "").trim().slice(0, 80); if (v) cur[k] = v; else delete cur[k]; }
      }
      if (Object.keys(cur).length) labels[key] = cur; else delete labels[key];
      return { ok: true, label: cur };
    }
    if (op === "mkdir") {
      if (!node || node.kind !== "dir") return refuse("not a folder");
      const name = String(req.name || "").trim();
      if (!okName(name)) return refuse("not a usable folder name");
      if (node.children.some(c => c.name === name)) return refuse(`'${name}' already exists`);
      if (parent === ROOT && node.children.filter(c => c.kind === "dir").length >= PER_CABINET) return refuse("this cabinet is full");
      node.children.push({ kind: "dir", name, mtime: now(), children: [] });
      return { ok: true, created: name };
    }
    if (op === "write") {
      if (!rel) return refuse("not a usable file name");
      if (node && node.kind === "dir") return refuse("that's a folder");
      if (!parent || parent.kind !== "dir") return refuse("the folder for it doesn't exist");
      if (req.fresh && node) return refuse(`'${r.name || node.name}' already exists`);
      const name = segs(rel).pop();
      if (!okName(name)) return refuse("not a usable file name");
      if (node) { node.text = String(req.text || ""); node.mtime = now(); }
      else parent.children.push({ kind: "file", name, mtime: now(), text: String(req.text || "") });
      return { ok: true, wrote: name };
    }
    if (op === "rename") {
      if (!rel) return refuse("the desktop itself stays");
      if (!node) return refuse("nothing there to rename");
      const name = String(req.name || "").trim();
      if (!okName(name)) return refuse("not a usable name");
      if (parent.children.some(c => c.name === name)) return refuse(`'${name}' already exists`);
      const to = [...segs(rel).slice(0, -1), name].join("/");
      node.name = name;
      moveLabels(rel, to);
      return { ok: true, renamed: name };
    }
    if (op === "trash") {
      if (!rel) return refuse("the desktop itself stays");
      if (!node) return refuse("already gone");
      parent.children.splice(parent.children.indexOf(node), 1);
      let dest = node.name, n = 2;
      const dot = node.name.lastIndexOf(".");
      const stem = node.kind === "file" && dot > 0 ? node.name.slice(0, dot) : node.name;
      const suffix = node.kind === "file" && dot > 0 ? node.name.slice(dot) : "";
      while (trash.some(t => t.name === dest)) dest = `${stem} ${n++}${suffix}`;
      trash.push({ name: dest, from: rel, at: now(), kind: node.kind, node });
      dropLabels(rel);
      return { ok: true, trashed: node.name, dest };
    }
    if (op === "trash-list") {
      const entries = trash.map(({ name, from, at, kind }) => ({ name, from, at, kind }))
        .sort((a, b) => b.at - a.at || a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      return { ok: true, entries };
    }
    if (op === "putback") {
      const rec = trash.find(t => t.name === String(req.name || "").trim());
      if (!rec) return refuse("Tycho didn't put that one here");
      const target = resolve(rec.from);
      if (!target || !target.rel) return refuse("where it came from is not a place");
      if (target.node) return refuse(`'${target.node.name}' is back there already`);
      if (!target.parent || target.parent.kind !== "dir") return refuse("the folder it came from is gone");
      rec.node.name = target.name;
      target.parent.children.push(rec.node);
      trash.splice(trash.indexOf(rec), 1);
      return { ok: true, restored: rec.from };
    }
    return refuse(`unknown files op '${op}'`);
  }

  /* -- CALIBRATE: the disagreement sheet, blind until marked --------------- */
  const instruments = () => [{
    kind: "disagreement", name: "CALIBRATE", sheet: sheet.name,
    total: sheet.items.length, done: sheet.items.filter(it => it.verdict).length,
  }];
  const sheetPayload = kind => kind === "disagreement"
    ? { kind, sheet: sheet.name, items: sheet.items.map(it => ({ ...it, engines: it.verdict ? it.engines : null })) }
    : { error: `no ${kind} sheet in the demo corpus` };
  function label(req) {
    if (req.kind !== "disagreement") return { error: "no such sheet in the demo" };
    const it = sheet.items.find(i => i.event_id === req.id);
    if (!it) return { error: "no such item" };
    it.verdict = String(req.verdict || "").toUpperCase();
    it.notes = String(req.notes || "");
    return { ok: true, reveal: it.engines };
  }

  /* -- the wire ------------------------------------------------------------ */
  const NEEDS_A_MAC = {
    "/api/term": "the terminal is a shell on a real machine — not part of the demo",
    "/api/intake": "intake files tasks into a real vault — not part of the demo",
    "/api/chat": "chat needs a model and a vault — not part of the demo",
    "/api/campaign": "campaign mode drives a real machine — not part of the demo",
  };
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json; charset=utf-8" },
  });
  const wait = ms => new Promise(res => setTimeout(res, ms));

  async function handle(pathname, body) {
    if (pathname === "/health") return json({ ok: true, service: "tycho", demo: true });
    if (pathname === "/api/instruments") return json(instruments());
    if (pathname.startsWith("/api/sheet/")) {
      const out = sheetPayload(pathname.slice("/api/sheet/".length));
      return json(out, out.error ? 404 : 200);
    }
    if (pathname === "/api/files") {
      const out = files(body || {});
      return json(out.ok ? out : { ...out, error: out.reason }, out.ok ? 200 : 400);
    }
    if (pathname === "/api/label") {
      await wait(180); /* long enough for WRITING… to be seen */
      const out = label(body || {});
      return json(out, out.ok ? 200 : 400);
    }
    if (pathname === "/api/log") return json({ ok: true, accepted: (body?.events || []).length, demo: true });
    if (pathname in NEEDS_A_MAC) return json({ ok: false, reason: NEEDS_A_MAC[pathname], error: NEEDS_A_MAC[pathname] }, 400);
    return json({ error: "not found" }, 404);
  }

  const realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    let url;
    try { url = new URL(input instanceof Request ? input.url : String(input), location.href); }
    catch { return realFetch(input, init); }
    if (url.origin !== location.origin || !(url.pathname === "/health" || url.pathname.startsWith("/api/")))
      return realFetch(input, init);
    return (async () => {
      let body = null;
      const raw = init?.body ?? (input instanceof Request ? await input.text() : null);
      if (raw) { try { body = JSON.parse(typeof raw === "string" ? raw : await new Response(raw).text()); } catch { body = null; } }
      return handle(url.pathname, body);
    })();
  };
  /* the event log's page-exit path; a beacon has no answer to give */
  const realBeacon = navigator.sendBeacon?.bind(navigator);
  navigator.sendBeacon = (u, data) => {
    try { if (new URL(String(u), location.href).pathname.startsWith("/api/")) return true; } catch { /* fall through */ }
    return realBeacon ? realBeacon(u, data) : false;
  };
  /* no offline cache under the host site's origin — boot.js settles on the rejection */
  try {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register: () => Promise.reject(new Error("demo: no service worker")) },
    });
  } catch { /* a locked-down navigator — boot's 3s settle covers it */ }
})();
