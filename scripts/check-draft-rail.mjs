#!/usr/bin/env node
// Draft-rail assertion on a finished build (AGENTS.md "The draft rail").
//
//   VERCEL_ENV=production pnpm build && node scripts/check-draft-rail.mjs
//   pnpm build && node scripts/check-draft-rail.mjs --preview
//
// Collects the slugs of every `status: draft` post in content/research (parsed with the
// site's own front-matter engine and schema, so an absent `status` counts as the draft it
// defaults to) and reads the build's routes from .next/prerender-manifest.json and the
// emitted files under .next/server/app/research/. Production (the default): fail if any
// draft has a route. --preview: fail if any draft lacks one, since previews must render
// drafts for review. With zero drafts it passes and says the result is vacuous; CI adds
// tests/fixtures/draft-rail-probe.mdx first so it never is.
// Options: --content <dir> (default content/research), --next <dir> (default .next).
import "./lib/ts-imports.mjs";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const { engines } = await import("../lib/content/fs.ts");
const { postFrontMatter } = await import("../lib/content/schema.ts");

/** Slugs of the draft posts in a research content directory. */
export function draftSlugs(contentDir) {
  return readdirSync(contentDir)
    .filter((file) => /\.mdx?$/.test(file))
    .filter((file) => {
      const { data } = matter(readFileSync(join(contentDir, file), "utf8"), { engines });
      return postFrontMatter.shape.status.parse(data.status) === "draft";
    })
    .map((file) => file.replace(/\.mdx?$/, ""))
    .sort();
}

/** The subset of `slugs` that the build at `nextDir` generated a /research/<slug> route for. */
export function routedSlugs(slugs, nextDir) {
  const manifestPath = join(nextDir, "prerender-manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`${manifestPath} not found: run the build first`);
  const routes = new Set(Object.keys(JSON.parse(readFileSync(manifestPath, "utf8")).routes ?? {}));
  const emitted = join(nextDir, "server", "app", "research");
  return slugs.filter(
    (slug) =>
      routes.has(`/research/${slug}`) ||
      ["html", "rsc", "meta"].some((ext) => existsSync(join(emitted, `${slug}.${ext}`))),
  );
}

function main() {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
  const preview = args.includes("--preview");
  const slugs = draftSlugs(opt("--content", "content/research"));
  const routed = routedSlugs(slugs, opt("--next", ".next"));
  const list = (s) => s.map((x) => `/research/${x}`).join(", ");
  if (!slugs.length) {
    console.log("draft rail ok (vacuous): no draft posts in content/research, so nothing to check");
    return;
  }
  if (preview) {
    const missing = slugs.filter((s) => !routed.includes(s));
    if (missing.length) {
      console.error(`draft rail BROKEN: a preview build must render drafts, but generated no ${list(missing)}`);
      process.exit(1);
    }
    console.log(`draft rail ok (preview): all ${slugs.length} draft(s) have a route: ${list(slugs)}`);
    return;
  }
  if (routed.length) {
    console.error(`draft rail BROKEN: the production build generated ${list(routed)}`);
    process.exit(1);
  }
  console.log(`draft rail ok (production): ${slugs.length} draft(s), none routed: ${slugs.join(", ")}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
