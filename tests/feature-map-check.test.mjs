// scripts/feature-map/check.mjs against a throwaway git repo shaped like this one.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkMap } from "../scripts/feature-map/check.mjs";

const git = (cwd, ...a) => execFileSync("git", ["-C", cwd, ...a], { encoding: "utf8" }).trim();

const entry = (id, code, extra = "") => `### ${id}
- **ID:** \`${id}\`
- **Purpose:** p
- **Where:** w
- **Reach:** r
- **Requires:** none
- **Selector:** none — static
- **Code:** ${code}
- **Backend:** none
- **Status:** live
${extra}`;

function repo() {
  const root = mkdtempSync(join(tmpdir(), "feature-map-"));
  for (const f of ["app/page.tsx", "app/research/[slug]/page.tsx", "app/layout.tsx", "content/pages/about-a.md"]) {
    mkdirSync(join(root, dirname(f)), { recursive: true });
    writeFileSync(join(root, f), "x");
  }
  git(root, "init", "-q");
  git(root, "-c", "user.email=t@t", "-c", "user.name=t", "add", ".");
  git(root, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "init");
  return { root, rev: git(root, "rev-parse", "HEAD") };
}

function map(root, rev, body, coverage = "## Coverage\n- `app/layout.tsx` — shell\n") {
  const path = join(root, "FEATURE_MAP.md");
  writeFileSync(path, `---\nfeature-map: 1\nroot: .\nrevision: ${rev}\nreconciled: 2026-11-11\n---\n# m\n\n${body}\n${coverage}`);
  return path;
}

const good = "`app/page.tsx`, `app/research/[slug]/page.tsx`, `content/pages/about-*.md`";

test("a complete map with bracketed Next folders passes clean", () => {
  const { root, rev } = repo();
  try {
    const r = checkMap(map(root, rev, entry("home.landing", good)), { routes: ["app/**/*.{ts,tsx}"] });
    assert.deepEqual(r, { errors: [], warnings: [] });
  } finally { rmSync(root, { recursive: true }); }
});

test("a removed file, a duplicate ID, a bad status and a stateless selector are errors", () => {
  const { root, rev } = repo();
  try {
    const body = entry("a.b", "`app/gone.tsx`") + entry("a.b", good).replace("live", "shipping").replace("none — static", "button");
    const { errors } = checkMap(map(root, rev, body));
    assert.ok(errors.some((e) => e.includes("`app/gone.tsx` no longer exists")));
    assert.ok(errors.some((e) => e.includes("duplicate ID a.b")));
    assert.ok(errors.some((e) => e.includes("Status 'shipping'")));
    assert.ok(errors.some((e) => e.includes("Selector must start")));
  } finally { rmSync(root, { recursive: true }); }
});

test("a missing field, a path outside the root and bad front matter are errors", () => {
  const { root } = repo();
  try {
    const body = entry("a.b", "`../elsewhere.ts`").replace("- **Backend:** none\n", "");
    const { errors } = checkMap(map(root, "abc123", body));
    assert.ok(errors.some((e) => e.includes("missing **Backend:**")));
    assert.ok(errors.some((e) => e.includes("outside the map's root")));
    assert.ok(errors.some((e) => e.includes("`revision:` must be the full")));
  } finally { rmSync(root, { recursive: true }); }
});

test("a revision that is not a commit here is an error", () => {
  const { root } = repo();
  try {
    const { errors } = checkMap(map(root, "f".repeat(40), entry("a.b", good)));
    assert.ok(errors.some((e) => e.includes("is not a commit")));
  } finally { rmSync(root, { recursive: true }); }
});

test("an unmapped route and drift since revision (untracked files too) are warnings", () => {
  const { root, rev } = repo();
  try {
    writeFileSync(join(root, "app/research/[slug]/page.tsx"), "changed");
    mkdirSync(join(root, "app/work"));
    writeFileSync(join(root, "app/work/page.tsx"), "new");
    writeFileSync(join(root, "content/pages/about-b.md"), "new");
    const { errors, warnings } = checkMap(map(root, rev, entry("home.landing", good)), { routes: ["app/**/*.tsx"] });
    assert.deepEqual(errors, []);
    assert.ok(warnings.some((w) => w.includes("app/research/[slug]/page.tsx") && w.includes("changed since")));
    assert.ok(warnings.some((w) => w.includes("content/pages/about-b.md")));
    assert.ok(warnings.some((w) => w === "route/screen file in no entry and not in Coverage: app/work/page.tsx"));
  } finally { rmSync(root, { recursive: true }); }
});

test("a stale Coverage path and a route glob matching nothing are warnings", () => {
  const { root, rev } = repo();
  try {
    const path = map(root, rev, entry("a.b", good), "## Coverage\n- `app/old.tsx` — gone\n- `app/layout.tsx`\n");
    const { warnings } = checkMap(path, { routes: ["pages/**/*.tsx"] });
    assert.ok(warnings.some((w) => w.includes("Coverage path `app/old.tsx` no longer exists")));
    assert.ok(warnings.some((w) => w.includes("matches no files")));
  } finally { rmSync(root, { recursive: true }); }
});
