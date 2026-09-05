#!/usr/bin/env node
/**
 * Vendor the TychoOS shell into `public/tycho-demo/` for the interactive demo on
 * `/products/tycho`.
 *
 * The real app (`~/dev/experimental/ghost/tycho/`) is a Python server plus a no-build static
 * shell under `tycho/os/`; every byte of state goes through `/api/*`. The demo is that shell,
 * byte-for-byte, with three things laid beside it under `demo/` (hand-written, never copied):
 *   - `corpus.js` — the synthetic corpus (fictional; nothing real)
 *   - `shim.js`   — a `fetch` interceptor that answers `/api/*` and `/health` from that corpus
 *   - `tune.js`   — hides the programs that need a Mac (TERM, INTAKE, GOLDEN), shortens the boot
 * This script copies the shell and patches `index.html` to load those scripts; it is the only
 * way the vendored copy should ever change. Re-run it to pick up upstream shell changes:
 *
 *   node scripts/vendor-tycho-demo.mjs [path/to/ghost/tycho/os]
 *
 * Left out on purpose: `icons/` + the manifest (PWA install surface — a demo is not installed),
 * `sw.js` (an offline cache under the site's origin would outlive the page), and xterm (only
 * TERM needs it, and TERM needs a pty on Asher's Mac).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, "..");
const SRC = path.resolve(
  process.argv[2] ?? path.join(process.env.HOME ?? "", "dev/experimental/ghost/tycho/os"),
);
const DEST = path.join(REPO, "public/tycho-demo");

const SKIP = new Set([
  "icons",
  "manifest.webmanifest",
  "sw.js",
  "vendor/xterm.js",
  "vendor/xterm.css",
  "vendor/addon-fit.js",
  "vendor/LICENSE-xterm",
]);

function copyDir(src, dest, rel = "") {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const r = rel ? `${rel}/${name}` : name;
    if (SKIP.has(r)) continue;
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

// Patch index.html: no PWA/icon links, no xterm, the shim first and the tuning last.
const idx = path.join(DEST, "index.html");
let html = fs.readFileSync(idx, "utf8");
const drop = [
  /^\s*<link rel="manifest".*\n/m,
  /^\s*<link rel="apple-touch-icon".*\n/m,
  /^\s*<link rel="icon".*\n/gm,
  /^\s*<link rel="stylesheet" href="vendor\/xterm.css">\n/m,
  /^\s*<script src="vendor\/xterm.js"><\/script>\n/m,
  /^\s*<script src="vendor\/addon-fit.js"><\/script>\n/m,
  /^\s*<!-- "black" = a solid black status bar[\s\S]*?-->\n/m,
  /^\s*<meta name="apple-mobile-web-app-.*\n/gm,
];
for (const re of drop) html = html.replace(re, "");
html = html.replace(
  "<title>TYCHO</title>",
  '<title>TYCHO — demo</title>\n  <meta name="robots" content="noindex">\n' +
    // no favicon request: the icons were left out, and the host page has its own
    '  <link rel="icon" href="data:,">',
);
html = html.replace(
  '  <script src="kernel/helpers.js"></script>',
  '  <!-- DEMO: the mock server, installed before the first fetch (demo/shim.js) -->\n' +
    '  <script src="demo/corpus.js"></script>\n' +
    '  <script src="demo/shim.js"></script>\n' +
    '  <script src="kernel/helpers.js"></script>',
);
html = html.replace(
  '  <script src="fs-cabinet.js"></script>',
  '  <script src="fs-cabinet.js"></script>\n' +
    "  <!-- DEMO: hide the programs that need a Mac, shorten the boot (demo/tune.js) -->\n" +
    '  <script src="demo/tune.js"></script>',
);
for (const must of ["demo/corpus.js", "demo/shim.js", "demo/tune.js"]) {
  if (!html.includes(must)) throw new Error(`patch failed: ${must} not inserted`);
}
fs.writeFileSync(idx, html);

let rev = "unknown";
try {
  rev = execSync("git rev-parse --short HEAD", { cwd: SRC, encoding: "utf8" }).trim();
} catch {
  /* not a checkout */
}
fs.writeFileSync(
  path.join(DEST, "VENDORED.md"),
  `# Vendored TychoOS shell

Copied from \`${SRC}\` at commit \`${rev}\` on ${new Date().toISOString().slice(0, 10)} by
\`scripts/vendor-tycho-demo.mjs\`. Do not edit by hand — re-run the script. Everything under
\`demo/\` is hand-written and survives a re-run.

Fonts: Departure Mono (SIL OFL 1.1, \`fonts/LICENSE-DepartureMono\`). three.js (MIT,
\`vendor/three/LICENSE\`). No other third-party assets.
`,
);
console.log(`vendored ${SRC}@${rev} → ${path.relative(REPO, DEST)}`);
