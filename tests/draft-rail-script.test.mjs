// scripts/check-draft-rail.mjs against throwaway content and build trees.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { draftSlugs, routedSlugs } from "../scripts/check-draft-rail.mjs";

const SCRIPT = new URL("../scripts/check-draft-rail.mjs", import.meta.url).pathname;
const post = (status) => `---\ntitle: "T"\n${status === undefined ? "" : `status: ${status}\n`}---\nBody\n`;

function fixture({ routes = [], files = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), "draft-rail-"));
  const content = join(root, "content");
  const next = join(root, ".next");
  mkdirSync(content);
  mkdirSync(join(next, "server", "app", "research"), { recursive: true });
  writeFileSync(join(content, "a-draft.mdx"), post("draft"));
  writeFileSync(join(content, "b-published.mdx"), post("published"));
  writeFileSync(join(content, "c-retired.mdx"), post("retired"));
  writeFileSync(join(content, "d-quoted.mdx"), post('"draft"'));
  writeFileSync(join(content, "e-no-status.mdx"), post(undefined));
  writeFileSync(
    join(next, "prerender-manifest.json"),
    JSON.stringify({ routes: Object.fromEntries(routes.map((r) => [r, {}])) }),
  );
  for (const f of files) writeFileSync(join(next, "server", "app", "research", f), "");
  return { root, content, next };
}

const run = (f, ...flags) => {
  try {
    return { code: 0, out: execFileSync("node", [SCRIPT, "--content", f.content, "--next", f.next, ...flags], { encoding: "utf8", stdio: "pipe" }) };
  } catch (e) {
    return { code: e.status, out: `${e.stdout}${e.stderr}` };
  }
};

const DRAFTS = ["a-draft", "d-quoted", "e-no-status"];

test("draftSlugs finds status: draft, quoted or not, and a post with no status (the schema default)", () => {
  const f = fixture();
  try { assert.deepEqual(draftSlugs(f.content), DRAFTS); } finally { rmSync(f.root, { recursive: true }); }
});

test("the probe fixture CI uses is a draft", () => {
  const dir = mkdtempSync(join(tmpdir(), "draft-rail-probe-"));
  try {
    copyFileSync(new URL("./fixtures/draft-rail-probe.mdx", import.meta.url), join(dir, "zz-draft-rail-probe.mdx"));
    assert.deepEqual(draftSlugs(dir), ["zz-draft-rail-probe"]);
  } finally { rmSync(dir, { recursive: true }); }
});

test("routedSlugs reads the prerender manifest and the emitted files", () => {
  const f = fixture({ routes: ["/research/a-draft", "/research/b-published"], files: ["d-quoted.html"] });
  try { assert.deepEqual(routedSlugs(DRAFTS, f.next), ["a-draft", "d-quoted"]); } finally { rmSync(f.root, { recursive: true }); }
});

test("production: passes with no draft routes, fails on one", () => {
  const clean = fixture({ routes: ["/research/b-published", "/research"], files: ["b-published.html"] });
  const leaky = fixture({ routes: ["/research/e-no-status"] });
  try {
    assert.equal(run(clean).code, 0);
    const r = run(leaky);
    assert.equal(r.code, 1);
    assert.match(r.out, /BROKEN.*\/research\/e-no-status/);
  } finally { rmSync(clean.root, { recursive: true }); rmSync(leaky.root, { recursive: true }); }
});

test("--preview: passes when every draft is routed, fails when one is missing", () => {
  const all = fixture({ routes: DRAFTS.map((s) => `/research/${s}`) });
  const some = fixture({ routes: ["/research/a-draft"] });
  try {
    assert.equal(run(all, "--preview").code, 0);
    const r = run(some, "--preview");
    assert.equal(r.code, 1);
    assert.match(r.out, /must render drafts.*d-quoted/);
  } finally { rmSync(all.root, { recursive: true }); rmSync(some.root, { recursive: true }); }
});

test("a missing build fails loudly", () => {
  const f = fixture();
  try {
    assert.throws(() => routedSlugs(["x"], join(f.root, "nope")), /run the build first/);
  } finally { rmSync(f.root, { recursive: true }); }
});
