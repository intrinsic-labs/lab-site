#!/usr/bin/env node
/**
 * Vendor the VISR review desk into `public/visr-demo/` for the interactive demo on
 * `/products/visr`, `/products/intrinsic-os` and the full-screen `/visr`.
 *
 *   node scripts/vendor-visr-demo.mjs [path/to/tycho/tycho/os]
 *
 * The real app is the IntrinsicOS review desk served by the Tycho server
 * (`~/dev/investigative/tycho/tycho/os/`): a no-build static shell whose every read and write
 * goes through `/api/*` and `/health`. The demo is that shell with its comments stripped, plus
 * hand-written files under `demo/` that this script never writes:
 *   - `demo/corpus.js` — the invented queue (fictional projects, agents and documents)
 *   - `demo/supt/*.js` — the scripted Superintendent (`window.VISR_DEMO_SUPT`)
 *   - `demo/shim.js`   — in-memory storage, a seeded token, and a fetch/XHR/beacon interceptor
 *                        that answers every `/api/*` route from memory
 *   - `demo/tune.js`   — hides what a visitor cannot use (Settings, Files, the stop switch)
 *
 * Every run: wipes everything in the destination except `demo/`, copies the shell, and
 * re-applies each adaptation below. An adaptation whose anchor is missing fails the run, so
 * upstream drift is caught here rather than in a browser.
 *
 * Adaptations, in order:
 *   1. Left out: `icons/`, `manifest.webmanifest`, `sw.js`, `push/` (install, offline cache
 *      and notifications have no place in a demo on someone else's origin).
 *   2. Comments stripped from every vendored .js (TypeScript's printer, `removeComments`,
 *      target ESNext: a real tokenizer, so strings, templates and regexes are untouched; each
 *      output is parse-checked), .css (a small string-aware tokenizer) and index.html.
 *   3. `index.html`: PWA links/metas dropped, title + noindex + empty favicon, `push/*.js`
 *      tags dropped, the demo's scripts injected (corpus → supt/* → shim before
 *      `kernel/net.js`, the first script that can make a request; tune after `review/app.js`).
 *   4. STRINGS below: literal replacements inside vendored files, each anchor required.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execSync } from "node:child_process";
import ts from "typescript";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, "..");
const SRC = path.resolve(
  process.argv[2] ?? path.join(process.env.HOME ?? "", "dev/investigative/tycho/tycho/os"),
);
const DEST = path.join(REPO, "public/visr-demo");
const SKIP = new Set(["icons", "manifest.webmanifest", "sw.js", "push"]);

/**
 * Literal replacements in vendored files: [file, find, replace, why]. Each `find` must occur
 * at least once after comment stripping, or the run fails. Strings a visitor can never reach
 * (the 403 path, the token prompt) are adapted too, because the shipped files are public.
 */
const STRINGS = [
  [
    "review/wire.js",
    "This device isn't signed in to Tailscale as Asher.",
    "This device isn't allowed to use this desk.",
    "names the founder and the private network",
  ],
  [
    "review/settings.js",
    "until then, edit Mechanical/settings.md in Obsidian.",
    "until then, edit the settings file on the Mac.",
    "an internal vault path (Settings is hidden in the demo; the file still ships)",
  ],
];

const fail = (msg) => {
  console.error(`vendor-visr-demo: ${msg}`);
  process.exit(1);
};
if (!fs.existsSync(path.join(SRC, "index.html"))) fail(`${SRC} is not a VISR shell (no index.html)`);

/* -- comment stripping -------------------------------------------------------------- */

function stripJs(src, file) {
  const out = ts.transpileModule(src, {
    fileName: path.basename(file),
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.Preserve,
      allowJs: true,
      removeComments: true,
      useDefineForClassFields: true,
      newLine: ts.NewLineKind.LineFeed,
    },
  });
  if (out.diagnostics?.length) {
    fail(`${file}: ${ts.flattenDiagnosticMessageText(out.diagnostics[0].messageText, "\n")}`);
  }
  const js = out.outputText.replace(/\n\/\/# sourceMappingURL=.*$/, "");
  // classic scripts sharing one global scope: the printer must not turn one into a module
  if (/^export\s*\{\s*\}|\bexports\.|__esModule/m.test(js) && !/\bexport\b/.test(src)) {
    fail(`${file}: transpile added module syntax`);
  }
  if (/^"use strict"/.test(js) !== /^\s*(\/\*[\s\S]*?\*\/\s*)?"use strict"/.test(src)) {
    fail(`${file}: transpile changed the "use strict" prologue`);
  }
  try {
    new vm.Script(js, { filename: file });
  } catch (e) {
    fail(`${file}: stripped output does not parse: ${e.message}`);
  }
  return js;
}

/** CSS: drop `/* … *\/` outside strings and unquoted `url(…)`. */
function stripCss(src, file) {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      if (end < 0) fail(`${file}: unterminated comment`);
      i = end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === "\\" ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (/^url\(\s*[^"'\s)]/i.test(src.slice(i, i + 6))) {
      const end = src.indexOf(")", i);
      out += src.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    out += c;
    i++;
  }
  // blank lines a removed comment left behind
  return out.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n");
}

/** index.html has no inline script or style (checked), so `<!-- -->` is unambiguous. */
function stripHtml(src, file) {
  if (/<script\b[^>]*>\s*[^<\s]/i.test(src) || /<style\b/i.test(src)) {
    fail(`${file}: inline <script>/<style> present; the HTML comment stripper assumes none`);
  }
  return src.replace(/[ \t]*<!--[\s\S]*?-->[ \t]*\n?/g, "");
}

/* -- copy --------------------------------------------------------------------------- */

const counts = { js: 0, css: 0, html: 0, other: 0 };
function copyDir(src, dest, rel = "") {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src).sort()) {
    const r = rel ? `${rel}/${name}` : name;
    if (SKIP.has(r) || name === ".DS_Store" || name.startsWith(".")) continue;
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) {
      copyDir(s, d, r);
      continue;
    }
    const strip = { ".js": stripJs, ".css": stripCss, ".html": stripHtml }[path.extname(name)];
    if (strip) fs.writeFileSync(d, strip(fs.readFileSync(s, "utf8"), r));
    else fs.copyFileSync(s, d);
    counts[strip ? path.extname(name).slice(1) : "other"]++;
  }
}

for (const name of fs.existsSync(DEST) ? fs.readdirSync(DEST) : []) {
  if (name !== "demo") fs.rmSync(path.join(DEST, name), { recursive: true, force: true });
}
copyDir(SRC, DEST);

/* -- string adaptations ------------------------------------------------------------- */

for (const [file, find, replace] of STRINGS) {
  const p = path.join(DEST, file);
  const text = fs.readFileSync(p, "utf8");
  if (!text.includes(find)) fail(`adaptation anchor not found in ${file}: ${JSON.stringify(find)}`);
  fs.writeFileSync(p, text.split(find).join(replace));
}

/* -- index.html --------------------------------------------------------------------- */

const SUPT_DIR = path.join(DEST, "demo/supt");
const supt = fs.existsSync(SUPT_DIR)
  ? fs.readdirSync(SUPT_DIR).filter((f) => f.endsWith(".js")).sort()
  : [];
if (!supt.length) {
  // TODO(release): make this fail() once demo/supt/ has landed
  console.warn("vendor-visr-demo: WARNING demo/supt/ has no .js files; the chat will refuse every message");
}
for (const must of ["demo/corpus.js", "demo/shim.js", "demo/tune.js"]) {
  if (!fs.existsSync(path.join(DEST, must))) fail(`${must} is missing (hand-written, not vendored)`);
}

const idx = path.join(DEST, "index.html");
let html = fs.readFileSync(idx, "utf8");
const edit = (re, to, what) => {
  if (!re.test(html)) fail(`index.html: anchor not found: ${what}`);
  html = html.replace(re, to);
};
edit(/^\s*<link rel="manifest".*\n/m, "", "manifest link");
edit(/^\s*<link rel="apple-touch-icon".*\n/m, "", "apple-touch-icon");
edit(/^\s*<link rel="icon".*\n/gm, "", "icon links");
edit(/^\s*<meta name="apple-mobile-web-app-.*\n/gm, "", "apple-mobile-web-app metas");
edit(/^\s*<script src="push\/[a-z-]+\.js"><\/script>\n/gm, "", "push/*.js script tags");
edit(
  /<title>VISR<\/title>/,
  '<title>VISR demo</title>\n  <meta name="robots" content="noindex">\n  <link rel="icon" href="data:,">',
  "<title>",
);
const tag = (src) => `  <script src="${src}"></script>\n`;
edit(
  /^  <script src="kernel\/net\.js"><\/script>\n/m,
  tag("demo/corpus.js") + supt.map((f) => tag(`demo/supt/${f}`)).join("") + tag("demo/shim.js") + tag("kernel/net.js"),
  "kernel/net.js",
);
edit(/^  <script src="review\/app\.js"><\/script>\n/m, tag("review/app.js") + tag("demo/tune.js"), "review/app.js");

// the first script tag must be platform.js (no storage, no requests) or the shim itself
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
const firstShell = scripts.findIndex((s) => !s.startsWith("demo/") && s !== "kernel/platform.js");
if (scripts.indexOf("demo/shim.js") > firstShell) fail("demo/shim.js must load before the first shell script that may touch storage or the network");
if (/rel="manifest"|icons\/|push\/|serviceWorker|apple-mobile-web-app/.test(html)) fail("index.html: install/push surface remains");
for (const s of scripts) {
  if (!fs.existsSync(path.join(DEST, s)) && !s.startsWith("demo/supt/")) fail(`index.html loads ${s}, which is not in the copy`);
}
fs.writeFileSync(idx, html);

/* -- provenance ---------------------------------------------------------------------- */

const git = (cmd) => {
  try {
    return execSync(`git ${cmd}`, { cwd: SRC, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
};
const full = git("rev-parse HEAD") ?? "unknown";
const short = git("rev-parse --short HEAD") ?? "unknown";
const status = git("status --porcelain -- .");
const dirty = status == null ? "unknown (not a git checkout)" : status ? "yes (uncommitted changes under the source path)" : "no";
const home = process.env.HOME ?? "";
const shownSrc = home && SRC.startsWith(home) ? `~${SRC.slice(home.length)}` : SRC;

fs.writeFileSync(
  path.join(DEST, "VENDORED.md"),
  `# Vendored VISR shell

Generated by \`scripts/vendor-visr-demo.mjs\` on ${new Date().toISOString().slice(0, 10)}. Do not
edit anything outside \`demo/\` by hand: re-run the script. \`demo/\` is hand-written and never
overwritten.

- Source: \`${shownSrc}\`
- Revision: \`${full}\` (\`${short}\`)
- Source tree dirty: ${dirty}
- Copied: ${counts.js} JS, ${counts.css} CSS, ${counts.html} HTML (comments stripped), ${counts.other} other files
- Demo scripts: \`demo/corpus.js\`, ${supt.length ? supt.map((f) => `\`demo/supt/${f}\``).join(", ") : "no `demo/supt/` files yet"}, \`demo/shim.js\` (before \`kernel/net.js\`); \`demo/tune.js\` (after \`review/app.js\`)

## Adaptations

1. Left out: ${[...SKIP].map((s) => `\`${s}\``).join(", ")}. No service worker, push, manifest or install surface.
2. Comments stripped from JS (TypeScript printer, \`removeComments\`, ESNext; each file parse-checked), CSS and HTML.
3. \`index.html\`: manifest, icon and \`apple-mobile-web-app-*\` tags removed; \`push/*.js\` tags removed;
   title \`VISR demo\`, \`<meta name="robots" content="noindex">\`, empty favicon; demo scripts injected.
4. String literals:
${STRINGS.map(([f, find, rep, why]) => `   - \`${f}\`: ${JSON.stringify(find)} → ${JSON.stringify(rep)} (${why})`).join("\n")}

Fonts: Departure Mono (SIL OFL 1.1, \`fonts/LICENSE-DepartureMono\`). No other third-party assets.
`,
);
console.log(`vendored ${shownSrc}@${short}${dirty.startsWith("yes") ? " (dirty)" : ""} → ${path.relative(REPO, DEST)}`);
