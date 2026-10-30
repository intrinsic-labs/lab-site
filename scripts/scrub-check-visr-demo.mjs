#!/usr/bin/env node
/**
 * Scrub check for the shipped VISR demo payload (`public/visr-demo/`) and its host pages.
 *
 * The denylist is built at run time from private sources and never written into this repo:
 * the vault's project folders and brief titles, people named in project briefs and agreements,
 * repository folders under ~/dev, and tailnet host names. Pattern checks add Linear-style issue
 * ids, home-directory paths, e-mail addresses, private hostnames and token-shaped strings.
 *
 *   node scripts/scrub-check-visr-demo.mjs --vault <vault> [--dev ~/dev] [--extra a,b] [--out report.md]
 *
 * Exits 1 when anything matches. Generic words (e.g. "vault", "lab") are reported with their
 * context for a person to judge, so a match is a prompt for review, not automatically a leak.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const VAULT = opt("vault");
if (!VAULT) { console.error("usage: scrub-check-visr-demo.mjs --vault <vault> [--dev <dir>] [--extra a,b] [--out file]"); process.exit(2); }
const DEV = opt("dev", path.join(os.homedir(), "dev"));
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const TARGETS = ["public/visr-demo", "components/products/demos", "app/visr"].map((p) => path.join(REPO, p));

/* Public names that may appear: the product and company branding, and the fictional world. */
const ALLOWED = new Set(["visr", "intrinsicos", "intrinsic labs", "intrinsic", "superintendent", "tycho", "lab", "vault", "docs",
  // folder names that are ordinary words in code
  "source", "tools", "skills", "home", "web", "mobile", "business", "scratch", "worktrees", "extensions", "experimental"]);

const terms = new Map(); // term -> source label
const add = (t, why) => {
  const term = t.trim().toLowerCase();
  if (term.length < 3 || ALLOWED.has(term)) return;
  if (!terms.has(term)) terms.set(term, why);
};
const ls = (d) => { try { return fs.readdirSync(d); } catch { return []; } };

for (const cat of ls(path.join(VAULT, "Projects"))) {
  if (cat.startsWith("_") || cat.startsWith(".")) continue;
  for (const p of ls(path.join(VAULT, "Projects", cat))) {
    if (p.startsWith(".")) continue;
    add(p, "vault project");
    if (p.includes("-")) add(p.replace(/-/g, " "), "vault project");
    const brief = path.join(VAULT, "Projects", cat, p, "_brief.md");
    if (!fs.existsSync(brief)) continue;
    const text = fs.readFileSync(brief, "utf8");
    const title = text.match(/^# (.+)$/m)?.[1];
    if (title) add(title, "project title");
    // People: two capitalised words in a brief's who/stakeholder lines.
    for (const line of text.split("\n").filter((l) => /stakeholder|client|contact|who|owner|reader/i.test(l))) {
      for (const m of line.matchAll(/\b([A-Z][a-z]+) ([A-Z][a-z]+)\b/g)) add(m[0], "person (brief)");
    }
  }
}
for (const f of ls(path.join(VAULT, "Mechanical", "agreements"))) add(f.replace(/\.[a-z]+$/i, "").replace(/[-_]/g, " "), "agreement");
for (const group of ls(DEV)) for (const r of ls(path.join(DEV, group))) if (!r.startsWith(".")) add(r, "repository");
try {
  for (const line of execSync("tailscale status", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n")) {
    const host = line.trim().split(/\s+/)[1];
    if (host) add(host, "tailnet host");
  }
} catch { /* no tailscale */ }
for (const name of ["asher", "pope", "emily", "david", "bernard", "homiebro", "guilty spark", "arbiter"]) add(name, "internal name");
for (const e of (opt("extra", "") || "").split(",").filter(Boolean)) add(e, "extra");

const PATTERNS = [
  ["linear id", /\b[A-Z]{2,6}-\d{1,5}\b/g],
  ["home path", /\/Users\/[a-z]+|~\/(?:dev|Documents|\.local)\b/g],
  ["email", /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g],
  ["private host", /\b[\w-]+\.(?:ts\.net|local|internal)\b|\b(?:127\.0\.0\.1|localhost):\d+/g],
  ["token-shaped", /\b(?:sk|ghp|gho|xox[bp]|op|lin_api)[-_][A-Za-z0-9_-]{16,}\b|\b[a-f0-9]{40,}\b/g],
];

const files = [];
const walk = (d) => { for (const n of ls(d)) { const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p) : files.push(p); } };
TARGETS.forEach(walk);

const hits = [];
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const termRes = [...terms].map(([t, why]) => [t, why, new RegExp(`(?<![\\w-])${escape(t)}(?![\\w-])`, "gi")]);
for (const f of files) {
  if (/\.(woff2?|png|jpe?g|webp|ico)$/i.test(f)) continue;
  const text = fs.readFileSync(f, "utf8");
  const rel = path.relative(REPO, f);
  const ctx = (i) => text.slice(Math.max(0, i - 50), i + 70).replace(/\s+/g, " ");
  for (const [t, why, re] of termRes) for (const m of text.matchAll(re)) hits.push({ rel, kind: why, term: t, at: ctx(m.index) });
  for (const [kind, re] of PATTERNS) for (const m of text.matchAll(re)) hits.push({ rel, kind, term: m[0], at: ctx(m.index) });
}

const lines = [
  `# VISR demo scrub check`, ``,
  `${files.length} files scanned under ${TARGETS.map((t) => path.relative(REPO, t)).join(", ")}; ${terms.size} private terms from the vault, ~/dev and the tailnet, plus ${PATTERNS.length} patterns.`, ``,
  hits.length ? `**${hits.length} matches to review:**` : `**No matches.**`, ``,
  ...hits.map((h) => `- \`${h.rel}\` · ${h.kind} · **${h.term}** · …${h.at}…`),
];
const out = opt("out");
if (out) fs.writeFileSync(out, lines.join("\n") + "\n");
console.log(lines.slice(0, 6).join("\n"));
if (!out) console.log(lines.slice(6).join("\n"));
process.exit(hits.length ? 1 : 0);
