// Resolving a map's backticked paths against its root. Brackets in a path are literal
// (Next's `[slug]` folders), so a glob escapes them before matching.
import { existsSync, globSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { isGlob } from "./parse.mjs";

const escapeBrackets = (p) => p.replace(/[[\]]/g, (c) => `[${c}]`);

/** True when `p` is relative and stays inside `root`. */
export function inside(root, p) {
  if (isAbsolute(p) || p.startsWith("~")) return false;
  const rel = relative(root, resolve(root, p));
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

/** Absolute paths that `p` names under `root`: the file or folder itself, or a glob's hits. */
export function resolvePath(root, p) {
  if (!isGlob(p)) return existsSync(resolve(root, p)) ? [resolve(root, p)] : [];
  return globSync(escapeBrackets(p), { cwd: root })
    .map((hit) => resolve(root, hit))
    .filter((hit) => inside(root, relative(root, hit)));
}

/** Files (not folders) a `--routes` glob matches, relative to `root`. */
export const routeFiles = (root, pattern) =>
  globSync(pattern, { cwd: root, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => relative(root, resolve(d.parentPath, d.name)));

/** True when `file` is one of `accounted` or sits under one of them. */
export const isAccounted = (file, accounted) =>
  accounted.some((a) => file === a || file.startsWith(a + sep));
