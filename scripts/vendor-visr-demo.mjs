#!/usr/bin/env node
/**
 * Vendor the VISR review desk into `public/visr-demo/` for the interactive demo on
 * `/products/visr`.
 *
 * The real app is the IntrinsicOS review desk served by the Tycho server
 * (`~/dev/investigative/tycho/tycho/os/`): a no-build static shell whose every read and write
 * goes through `/api/*` (review/wire.js, plus kernel/log.js and the `/health` probe). The demo
 * is that shell, byte-for-byte, with three things laid beside it under `demo/` (hand-written,
 * never copied):
 *   - `corpus.js` — a small invented queue (fictional projects; nothing real)
 *   - `shim.js`   — a `fetch`/XHR/beacon interceptor that answers `/api/*` and `/health` from
 *                   that queue, and keeps the service worker from registering
 *   - `tune.js`   — hides what a visitor cannot use (Settings), nothing else
 * This script copies the shell and patches `index.html` to load those scripts; it is the only
 * way the vendored copy should ever change. Re-run it to pick up upstream shell changes:
 *
 *   node scripts/vendor-visr-demo.mjs [path/to/tycho/tycho/os]
 *
 * Left out on purpose: `icons/` + the manifest (PWA install surface — a demo is not
 * installed) and `sw.js` (an offline cache under the site's origin would outlive the page).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, "..");
const SRC = path.resolve(
  process.argv[2] ?? path.join(process.env.HOME ?? "", "dev/investigative/tycho/tycho/os"),
);
const DEST = path.join(REPO, "public/visr-demo");

const SKIP = new Set(["icons", "manifest.webmanifest", "sw.js"]);

function copyDir(src, dest, rel = "") {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const r = rel ? `${rel}/${name}` : name;
    if (SKIP.has(r) || name === ".DS_Store") continue;
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d, r);
    else fs.copyFileSync(s, d);
  }
}

// Wipe everything except demo/ (hand-written), then copy.
for (const name of fs.existsSync(DEST) ? fs.readdirSync(DEST) : []) {
  if (name !== "demo") fs.rmSync(path.join(DEST, name), { recursive: true, force: true });
}
copyDir(SRC, DEST);

// Patch index.html: no PWA/icon links, the corpus and shim first, the tuning last.
const idx = path.join(DEST, "index.html");
let html = fs.readFileSync(idx, "utf8");
const drop = [
  /^\s*<link rel="manifest".*\n/m,
  /^\s*<link rel="apple-touch-icon".*\n/m,
  /^\s*<link rel="icon".*\n/gm,
  /^\s*<meta name="apple-mobile-web-app-.*\n/gm,
];
for (const re of drop) html = html.replace(re, "");
html = html.replace(
  "<title>VISR</title>",
  '<title>VISR — demo</title>\n  <meta name="robots" content="noindex">\n' +
    // no favicon request: the icons were left out, and the host page has its own
    '  <link rel="icon" href="data:,">',
);
html = html.replace(
  '  <script src="kernel/net.js"></script>',
  "  <!-- DEMO: the mock server, installed before the first request (demo/shim.js) -->\n" +
    '  <script src="demo/corpus.js"></script>\n' +
    '  <script src="demo/shim.js"></script>\n' +
    '  <script src="kernel/net.js"></script>',
);
html = html.replace(
  '  <script src="review/app.js"></script>',
  '  <script src="review/app.js"></script>\n' +
    "  <!-- DEMO: hide what a visitor cannot use (demo/tune.js) -->\n" +
    '  <script src="demo/tune.js"></script>',
);
for (const must of ["demo/corpus.js", "demo/shim.js", "demo/tune.js"]) {
  if (!html.includes(must)) throw new Error(`patch failed: ${must} not inserted`);
}
if (/rel="manifest"|icons\//.test(html)) throw new Error("patch failed: PWA links remain");
fs.writeFileSync(idx, html);

let rev = "unknown";
try {
  rev = execSync("git rev-parse --short HEAD", { cwd: SRC, encoding: "utf8" }).trim();
} catch {
  /* not a checkout */
}
fs.writeFileSync(
  path.join(DEST, "VENDORED.md"),
  `# Vendored VISR shell

Copied from \`${SRC}\` at commit \`${rev}\` on ${new Date().toISOString().slice(0, 10)} by
\`scripts/vendor-visr-demo.mjs\`. Do not edit by hand — re-run the script. Everything under
\`demo/\` is hand-written and survives a re-run.

Fonts: Departure Mono (SIL OFL 1.1, \`fonts/LICENSE-DepartureMono\`). No other third-party
assets.
`,
);
console.log(`vendored ${SRC}@${rev} → ${path.relative(REPO, DEST)}`);
