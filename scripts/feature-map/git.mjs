// The git questions a feature-map check asks: is this a repo, is the baseline on HEAD's
// history, and what changed under these paths since it.
import { spawnSync } from "node:child_process";
import { isGlob } from "./parse.mjs";

function git(root, ...args) {
  const r = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  return r.status === 0 ? r.stdout : null;
}

// Pathspec magic: brackets in a literal path must not act as a git glob.
const pathspec = (p) => (isGlob(p) ? `:(glob)${p}` : `:(literal)${p}`);

export const isRepo = (root) => git(root, "rev-parse", "--git-dir") !== null;
export const isCommit = (root, rev) => git(root, "cat-file", "-e", `${rev}^{commit}`) !== null;
export const isAncestorOfHead = (root, rev) =>
  git(root, "merge-base", "--is-ancestor", rev, "HEAD") !== null;

/** Files under `paths` changed since `rev` (committed, staged or not) or new and untracked. */
export function changedSince(root, rev, paths) {
  const specs = paths.map(pathspec);
  const out = (git(root, "diff", "--name-only", rev, "--", ...specs) ?? "") +
    (git(root, "ls-files", "--others", "--exclude-standard", "--", ...specs) ?? "");
  return [...new Set(out.split("\n").filter(Boolean))].sort();
}
