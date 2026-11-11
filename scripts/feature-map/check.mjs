// Checks a feature map against the code it describes: a Node port of the vault skill's
// checker (Tools/skills/feature-mapping/check_map.md, which stays canonical), so CI needs
// only node and git. Errors mean the map is wrong; warnings mean "re-read this".
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { homedir } from "node:os";
import { codePaths, isGlob, parseMap } from "./parse.mjs";
import { inside, isAccounted, resolvePath, routeFiles } from "./paths.mjs";
import { changedSince, isAncestorOfHead, isCommit, isRepo } from "./git.mjs";

const REQUIRED = ["ID", "Purpose", "Where", "Reach", "Requires", "Selector", "Code", "Backend", "Status"];
const STATUSES = ["live", "placeholder", "unavailable", "restricted"];
const SELECTOR_RE = /^(working|proposed|none)(?=\s|—|:|$)/i;

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? "") && !Number.isNaN(Date.parse(v));

function resolveRoot(mapPath, meta, override) {
  const raw = (override ?? meta.root ?? ".").replace(/^~(?=$|\/)/, homedir());
  return isAbsolute(raw) ? raw : resolve(dirname(mapPath), raw);
}

function checkFrontMatter(meta, errors) {
  if (meta.unclosed) errors.push("front matter opens with `---` but never closes");
  else if (meta["feature-map"] !== "1") errors.push("front matter must declare `feature-map: 1`");
  if (!/^[0-9a-f]{40}$/.test(meta.revision ?? ""))
    errors.push("front matter `revision:` must be the full 40-character commit sha the map was reconciled against");
  if (!isDate(meta.reconciled)) errors.push("front matter `reconciled:` must be a YYYY-MM-DD date");
}

function checkEntry(entry, root, where, errors, referenced) {
  for (const f of REQUIRED) if (!entry.fields[f]) errors.push(`${where}: missing **${f}:**`);
  const selector = entry.fields.Selector;
  if (selector && !SELECTOR_RE.test(selector))
    errors.push(`${where}: Selector must start with working, proposed or none`);
  const status = (entry.fields.Status ?? "").split(/\s/)[0].replace(/[ .,;—-]+$/, "").toLowerCase();
  if (entry.fields.Status && !STATUSES.includes(status))
    errors.push(`${where}: Status '${status}' is not one of ${STATUSES.join(", ")}`);
  const paths = codePaths(entry);
  if (entry.fields.Code && !paths.length) errors.push(`${where}: Code lists no \`backticked\` paths`);
  for (const p of paths) {
    if (!inside(root, p)) { errors.push(`${where}: Code path \`${p}\` is outside the map's root ${root}`); continue; }
    const hits = resolvePath(root, p);
    if (!hits.length) errors.push(`${where}: Code path \`${p}\` no longer exists under ${root}`);
    referenced.push(...hits.map((h) => relative(root, h)));
  }
}

function checkDrift(root, rev, entries, errors, warnings) {
  if (!isRepo(root)) {
    errors.push(`root ${root} is not in a git repository, so \`revision:\` can't be verified and drift can't be checked`);
    return;
  }
  if (!isCommit(root, rev)) { errors.push(`revision ${rev} is not a commit in ${root}; drift can't be checked`); return; }
  if (!isAncestorOfHead(root, rev)) {
    errors.push(`revision ${rev} is not an ancestor of HEAD in ${root}, so it isn't a baseline for the checked-out code`);
    return;
  }
  for (const e of entries) {
    const paths = codePaths(e).filter((p) => inside(root, p) && (isGlob(p) || existsSync(resolve(root, p))));
    if (!paths.length) continue;
    const files = changedSince(root, rev, paths);
    if (files.length)
      warnings.push(`[${e.name}] code changed since ${rev.slice(0, 10)}: ${files.slice(0, 4).join(", ")}${files.length > 4 ? " …" : ""} (re-read this entry)`);
  }
}

/** { errors: string[], warnings: string[] } for the map at `mapPath`. */
export function checkMap(mapPath, { root: rootOverride, routes = [] } = {}) {
  const { meta, entries, coverage } = parseMap(readFileSync(mapPath, "utf8"));
  const root = resolveRoot(mapPath, meta, rootOverride);
  const errors = [];
  const warnings = [];
  if (!existsSync(root) || !statSync(root).isDirectory())
    return { errors: [`root ${root} is not a directory (front matter \`root:\` or --root)`], warnings };
  checkFrontMatter(meta, errors);
  if (!entries.length) errors.push("no `### ` feature entries found");

  const seen = new Map();
  const referenced = [];
  for (const e of entries) {
    const where = `${basename(mapPath)}:${e.line} [${e.name}]`;
    const id = (e.fields.ID ?? "").replaceAll("`", "").trim();
    if (id && seen.has(id)) errors.push(`${where}: duplicate ID ${id} (also line ${seen.get(id)})`);
    if (id) seen.set(id, e.line);
    checkEntry(e, root, where, errors, referenced);
  }

  const accounted = [...referenced];
  for (const p of coverage) {
    if (!inside(root, p)) { warnings.push(`Coverage path \`${p}\` is outside the map's root ${root}`); continue; }
    const hits = resolvePath(root, p);
    if (hits.length) accounted.push(...hits.map((h) => relative(root, h)));
    else warnings.push(`Coverage path \`${p}\` no longer exists under ${root}`);
  }

  if (meta.revision && /^[0-9a-f]{40}$/.test(meta.revision)) checkDrift(root, meta.revision, entries, errors, warnings);

  for (const pattern of routes) {
    const files = routeFiles(root, pattern);
    if (!files.length) warnings.push(`--routes \`${pattern}\` matches no files under ${root}`);
    for (const f of files)
      if (!isAccounted(f, accounted)) warnings.push(`route/screen file in no entry and not in Coverage: ${f}`);
  }
  return { errors, warnings };
}
