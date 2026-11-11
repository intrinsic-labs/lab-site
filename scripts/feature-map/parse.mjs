// Parses a feature map (FEATURE_MAP.md) into its front matter, entries and Coverage paths.
// The format is the vault skill Tools/skills/feature-mapping/SKILL.md; this is pure text work.

const FIELD_RE = /^\s*[-*]\s+\*\*([A-Za-z ]+?):\*\*\s*(.*)$/;
const TICK_RE = /`([^`]+)`/g;

/** The path part of a backticked token: text after `#` or `::` is a reader's hint. */
export const stripHint = (raw) => raw.trim().split(/#|::/, 1)[0].trim();

/** Backticked tokens in a field's text. */
export const ticks = (text) => [...(text ?? "").matchAll(TICK_RE)].map((m) => m[1]);

/** True when a path is a glob. Brackets are literal: they are Next's dynamic segments. */
export const isGlob = (p) => /[*?{]/.test(p);

/** Coverage mixes paths with prose; a path has a slash or a glob (`./App.tsx` at the root). */
const isPathish = (t) => !t.includes(" ") && !t.startsWith("/") && (isGlob(t) || t.includes("/"));

/** The `Code:` paths of an entry, hints stripped. */
export const codePaths = (entry) => ticks(entry.fields.Code).map(stripHint).filter(Boolean);

function frontMatter(lines) {
  if (lines[0]?.trim() !== "---") return { meta: {}, start: 0 };
  const meta = {};
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") return { meta, start: i + 1 };
    const at = lines[i].indexOf(":");
    if (at < 0) continue;
    meta[lines[i].slice(0, at).trim()] = lines[i].slice(at + 1).split("#", 1)[0].trim();
  }
  return { meta: { unclosed: true }, start: lines.length };
}

/** { meta, entries: [{ name, line, fields }], coverage: [path] } */
export function parseMap(text) {
  const lines = text.split(/\r?\n/);
  const { meta, start } = frontMatter(lines);
  const entries = [];
  const coverage = [];
  let current = null;
  let lastField = null;
  let inCoverage = false;
  for (let n = start; n < lines.length; n++) {
    const line = lines[n];
    if (line.startsWith("### ")) {
      current = { name: line.slice(4).trim(), line: n + 1, fields: {} };
      entries.push(current);
      lastField = null;
      inCoverage = false;
    } else if (line.startsWith("#")) {
      current = null;
      inCoverage = line.replace(/^#+/, "").trim().toLowerCase() === "coverage";
    } else if (inCoverage) {
      for (const t of ticks(line)) if (isPathish(t.trim())) coverage.push(stripHint(t));
    } else if (current) {
      const m = FIELD_RE.exec(line);
      if (m) {
        lastField = m[1].trim();
        current.fields[lastField] = m[2].trim();
      } else if (lastField && line.startsWith("  ") && line.trim()) {
        current.fields[lastField] += ` ${line.trim()}`;
      }
    }
  }
  return { meta, entries, coverage };
}
