#!/usr/bin/env node
/**
 * Scrub check for the shipped VISR demo payload (`public/visr-demo/`) and its host pages.
 *
 * The denylist is built at run time from private sources and never written into this repo:
 * every project folder, brief title and alias under the vault's client and shelved categories
 * (engine, icebox, _archive); the people, companies and places named in every project brief (bold
 * names, capitalised names, CamelCase and hyphenated names, the "Who it's for" section); the
 * same from the vault's finance notes and agreements; repository folders under ~/dev; and
 * tailnet host names. Pattern checks add Linear-style issue ids, home-directory paths, e-mail
 * addresses, phone numbers, money amounts, private hostnames, IP addresses and token-shaped strings.
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

/* Public names that may appear: the company, its public products, and ordinary words. */
const ALLOWED = new Set(["visr", "intrinsicos", "intrinsic labs", "intrinsic", "intrinsiclabs", "intrinsiclabs.co",
  "superintendent", "tycho", "lab", "the lab", "vault", "docs", "glyphdeck", "liturgos", "aspen grove", "aspen-grove",
  // folder names that are ordinary words in code
  "source", "tools", "skills", "home", "web", "mobile", "business", "scratch", "worktrees", "extensions", "experimental"]);

const terms = new Map(); // term -> source label
const add = (t, why) => {
  const term = t.trim().toLowerCase();
  if (term.length < 3 || ALLOWED.has(term)) return;
  if (!terms.has(term)) terms.set(term, why);
};
const ls = (d) => { try { return fs.readdirSync(d); } catch { return []; } };
const read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return ""; } };

/* An ordinary English word (the system word list's lowercase entries) is never a name on its own. */
const DICT = read("/usr/share/dict/words").split("\n");
const COMMON = new Set(DICT.filter((w) => w && w === w.toLowerCase()));
const FUNCTION = new Set("the for and but with who why how what where when this that its his her our their they she he".split(" "));
const PROPER = new Set(DICT.filter((w) => /^[A-Z][a-z]+$/.test(w) && !FUNCTION.has(w.toLowerCase()))); // names the word list knows
for (const w of ("why who where what how the and for with its our their his her this that brief client user reader stakeholder "
  + "standing decisions eventually repo pr workspace website app dashboard email api cms ci ios android iphone emulator simulator "
  + "github chatgpt figma testflight online").split(" ")) COMMON.add(w);
const ordinary = (w) => {
  const x = w.toLowerCase();
  return [x, x.replace(/s$/, ""), x.replace(/es$/, ""), x.replace(/ies$/, "y"), x.replace(/d$/, ""), x.replace(/ed$/, "")]
    .some((v) => COMMON.has(v));
};

const HEADING = new Set(["Why", "Who", "Where", "What", "How", "Standing", "Decisions", "Brief", "The", "A", "An"]);
const TECH = new Set("repo repos pr prs workspace website app apps dashboard android ios emulator simulator github chatgpt review studio".split(" "));

/* Names in prose: bold spans, runs of capitalised words, CamelCase and hyphenated names. With `all`,
   every run of two or more capitalised words counts (a client's brief: places, products, companies);
   otherwise only runs with a word that isn't ordinary English (people). */
function names(text, why, { all = false } = {}) {
  const body = text.replace(/^---[\s\S]*?\n---\n/, "").replace(/\[\[[^\]]*\]\]|\]\([^)]*\)/g, " ");
  for (const m of body.matchAll(/\*\*([^*\n]{3,60})\*\*/g)) {
    const span = m[1].replace(/[.:,;]+$/, "").trim();
    if (/^[A-Z][\w'’-]*( [A-Z][\w'’-]*){0,3}$/.test(span) && !span.split(" ").every(ordinary)) add(span, why);
  }
  for (const m of body.matchAll(/\b[A-Z][a-z]+[A-Z]\w*\b|\b[A-Z]{2,}[a-z]\w*\b|\b[A-Z][a-z]+-[A-Z][a-z]+\b/g)) {
    if (ordinary(m[0])) continue;
    add(m[0], why);
    if (m[0].includes("-")) add(m[0].replace(/-/g, " "), why);
  }
  for (const m of body.matchAll(/\b[A-Z][\w'’]+(?:[ -][A-Z][\w'’]+){1,3}\b/g)) {
    const words = m[0].split(/[ -]/);
    if (words.every((w) => ["The", "A", "An", "Why", "Who", "Where", "What", "How"].includes(w))) continue;
    const plain = (w) => HEADING.has(w) || ALLOWED.has(w.toLowerCase()) || TECH.has(w.toLowerCase());
    if (all ? !words.every(plain) : !words.every(ordinary)) add(m[0], why);
  }
}
/* The "Who it's for" section: single capitalised words that aren't ordinary English are names. */
function people(text, why) {
  const who = text.match(/^## Who[^\n]*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1] || "";
  const lines = [who, ...text.split("\n").filter((l) => /stakeholder|client|contact|owner|reader|\bwho\b/i.test(l))].join("\n");
  for (const m of lines.matchAll(/\b[A-Z][a-z]{2,}\b/g)) if (!ordinary(m[0]) || PROPER.has(m[0])) add(m[0], why);
  names(lines, why);
}

const CLIENTISH = new Set(["engine", "icebox", "_archive"]);
const LINEAR = new Set(); // issue-id prefixes the vault's projects declare
for (const cat of ls(path.join(VAULT, "Projects"))) {
  if (cat.startsWith(".") || cat === "_TEMPLATE") continue;
  const client = CLIENTISH.has(cat);
  for (const p of ls(path.join(VAULT, "Projects", cat))) {
    if (p.startsWith(".") || !fs.statSync(path.join(VAULT, "Projects", cat, p)).isDirectory()) continue;
    if (client) {
      add(p, "vault project");
      if (p.includes("-")) add(p.replace(/-/g, " "), "vault project");
    }
    const dir = path.join(VAULT, "Projects", cat, p);
    const brief = read(path.join(dir, "_brief.md")) || read(path.join(dir, "README.md"));
    if (!brief) continue;
    const title = brief.match(/^# (.+)$/m)?.[1]?.replace(/\s+[—–-]+\s+Brief$/i, "").trim();
    if (title && client && !(title.split(" ").length === 1 && ordinary(title))) add(title, "project title");
    const linear = brief.match(/^linear:\s*([A-Za-z_]+)/m)?.[1];
    if (linear) LINEAR.add(linear.toLowerCase());
    people(brief, client ? "person (client brief)" : "person (brief)");
    if (client) names(brief, "name (client brief)", { all: true });
  }
}
for (const f of ls(path.join(VAULT, "Mechanical", "finance"))) if (f.endsWith(".md")) names(read(path.join(VAULT, "Mechanical", "finance", f)), "name (finance)");
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
  ["phone", /(?<![\w.])(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}(?![\w.])/g],
  ["money", /[$€£]\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?|[$€£]\s?\d+\.\d{2}\b|[$€£]\s?\d{3,}|[$€£]\s?\d+(?:\.\d+)?\s?[kKmM]\b|\b\d[\d,]*(?:\.\d+)?\s?(?:USD|dollars)\b/g],
  ["private host", /\b[\w-]+\.(?:ts\.net|local|internal)\b|\b(?:127\.0\.0\.1|localhost):\d+|\b(?:\d{1,3}\.){3}\d{1,3}\b/g],
  ...(LINEAR.size ? [["linear id (declared prefix)", new RegExp(`\\b(?:${[...LINEAR].join("|")})-\\d+\\b`, "gi")]] : []),
  ["token-shaped", /\b(?:sk|ghp|gho|xox[bp]|op|lin_api)[-_][A-Za-z0-9_-]{16,}\b|\b[a-f0-9]{40,}\b/g],
];

const files = [];
const walk = (d) => { for (const n of ls(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else files.push(p); } };
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
