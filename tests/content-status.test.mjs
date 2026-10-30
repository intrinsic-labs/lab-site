// Post status contract: what a draft, a published and a retired post may appear in.
// Node runs the .ts sources directly (type stripping); the hook below only lets their
// extensionless relative imports ("./areas") resolve to the .ts files, as the bundler does.
import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw err;
    }
  },
});

const { inFeed, isListed, isRoutable } = await import("../lib/content/post-status.ts");
const { postFrontMatter } = await import("../lib/content/schema.ts");
const { readDir } = await import("../lib/content/fs.ts");
const posts = await import("../lib/content/posts.ts");

const withEnv = async (env, fn) => {
  const saved = process.env.VERCEL_ENV;
  if (env === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = env;
  try { return await fn(); } finally {
    if (saved === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = saved;
  }
};

const base = { title: "T", kind: "note", area: "local-compute", date: "2026-10-01", summary: "S" };

test("every content/research post's front matter parses", async () => {
  const entries = await readDir("research");
  assert.ok(entries.length > 0, "no posts found — is cwd the repo root?");
  for (const e of entries) {
    const parsed = postFrontMatter.safeParse(e.data);
    assert.ok(parsed.success, `${e.slug}: ${parsed.success ? "" : JSON.stringify(parsed.error.issues)}`);
  }
});

test("retired requires a retired block, and the block requires retired", () => {
  const retired = { date: "2026-10-30", reason: "No longer accurate." };
  assert.equal(postFrontMatter.safeParse({ ...base, status: "retired" }).success, false);
  assert.equal(postFrontMatter.safeParse({ ...base, status: "published", retired }).success, false);
  assert.equal(postFrontMatter.safeParse({ ...base, status: "retired", retired }).success, true);
  assert.equal(postFrontMatter.safeParse({ ...base, status: "retired", retired: { ...retired, reason: "" } }).success, false);
});

test("status rules: listing, feed/sitemap and routes", () => {
  const draft = { status: "draft" }, published = { status: "published" }, retired = { status: "retired" };
  for (const visible of [true, false]) {
    assert.equal(isListed(published, visible), true);
    assert.equal(isRoutable(published, visible), true);
    assert.equal(isListed(retired, visible), false, "a retired post is never listed");
    assert.equal(isRoutable(retired, visible), true, "a retired post's URL always resolves");
  }
  assert.equal(inFeed(published), true);
  assert.equal(inFeed(retired), false);
  assert.equal(inFeed(draft), false, "the draft rail: never in feed or sitemap");
  assert.equal(isListed(draft, false), false, "the draft rail: not listed in production");
  assert.equal(isRoutable(draft, false), false, "the draft rail: no route in production");
  assert.equal(isListed(draft, true), true);
  assert.equal(isRoutable(draft, true), true);
});

test("against the real content: retired posts are routed in production but listed nowhere", async () => {
  const entries = await readDir("research");
  const bySlug = Object.fromEntries(entries.map((e) => [e.slug, postFrontMatter.parse(e.data)]));
  const retired = Object.keys(bySlug).filter((s) => bySlug[s].status === "retired");
  const drafts = Object.keys(bySlug).filter((s) => bySlug[s].status === "draft");

  for (const env of ["production", "preview", undefined]) {
    await withEnv(env, async () => {
      const listed = (await posts.listablePosts()).map((p) => p.slug);
      const feed = (await posts.publishedPosts()).map((p) => p.slug);
      const routes = await posts.renderableSlugs();
      for (const s of retired) {
        assert.ok(!listed.includes(s), `${s} listed (${env})`);
        assert.ok(!feed.includes(s), `${s} in feed/sitemap (${env})`);
        assert.ok(routes.includes(s), `${s} has no route (${env})`);
        assert.equal((await posts.postBySlug(s))?.status, "retired");
      }
      for (const s of drafts) {
        assert.ok(!feed.includes(s), `draft ${s} in feed/sitemap (${env})`);
        if (env === "production") {
          assert.ok(!routes.includes(s) && !listed.includes(s), `draft ${s} visible in production`);
          assert.equal(await posts.postBySlug(s), undefined);
        }
      }
      // Areas offered as links are exactly those with a listed post.
      const areas = await posts.listedAreas();
      const listedPosts = await posts.listablePosts();
      for (const a of areas) assert.ok(listedPosts.some((p) => p.area === a));
    });
  }
});
