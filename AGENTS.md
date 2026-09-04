# lab-site — Intrinsic Labs' public research site

Next.js (App Router, static), Tailwind v4, MDX content in-repo. Deployed on Vercel as
`intrinsiclabs.co`. The vault project is `Projects/meta/lab/` in the Obsidian vault —
its `_brief.md` is the business-side source of truth; `docs/site-plan-2026-08-17.md`
(sections, decisions D1–D7 + rulings) and `docs/publication-cadence.md` (how a post gets
published) are the design docs. This file is the engineering entry point.

## Layout

```
app/            routes only — thin, compose components + lib
  research/     index, [slug] posts, areas/[area]
  instruments/  index + [slug]
  work/ about/ about/editorial/
  feed.xml/     RSS (published posts only)
  sitemap.ts robots.ts not-found.tsx icon.svg
components/     layout/ ui/ research/ home/ — presentational, no fs access except Specimen
content/        the CMS. research/*.mdx, instruments/*.mdx, specimen/ (home-page plate)
lib/content/    schema.ts (zod, the front-matter contract) · posts.ts · instruments.ts
                areas.ts + kinds.ts (declared vocab) · draft-rail.ts · fs.ts · format.ts
lib/mdx/        render.tsx — next-mdx-remote-client RSC + remark-gfm
lib/site.ts     name, url, email, github
```

## The content model

A post is `content/research/<slug>.mdx` with front matter validated by `lib/content/schema.ts`:
`title · kind (paper|note|field-note) · area (elicitation|agent-operations|local-compute) ·
date (ISO string) · summary · status (draft|published) · caveats[] · artifacts[{label,href?,note?}]
· artifactsNote · corrections[{date,text}]`. A build fails loudly on a bad file.

**Caveats render in the header, above the fold. Corrections are appended, dated, never silent
edits. An empty artifacts block says why.** Those three are the house style — don't remove them.

Areas and kinds are closed vocabularies in `lib/content/areas.ts` / `kinds.ts`; area slugs are
permanent URLs (ruled 2026-09-03).

## The draft rail (publication-cadence.md §5.2) — do not weaken

`status: draft` posts are excluded from the feed and sitemap always, and their routes are
**not generated when `VERCEL_ENV === "production"`** (`lib/content/draft-rail.ts`,
`renderableSlugs()`, `dynamicParams = false` → 404). On previews, drafts render and are listed
with a `draft` chip so a reviewer can navigate to them. Publishing is a one-word diff:
`status: draft` → `status: published`. Verify with `VERCEL_ENV=production pnpm build` — no
`/research/<slug>` routes for drafts should appear.

## Publishing flow

An agent drafts a post as a branch + PR; Vercel builds a preview; Asher reads it, corrects it,
flips `status`, merges. Production promotion is a human act — there is no agent path to prod.

## Gotchas

- `gray-matter` is configured with js-yaml's `JSON_SCHEMA` so `date: 2026-09-03` stays a string.
  A summary that starts with `-` or contains `: ` must be quoted (YAML).
- `next/font/google` Newsreader is a variable font: `axes: ["opsz"]` and **no `weight`** array.
- No analytics. Deliberate (Sovereignty beam). Don't add a tracker.
- One colour mode (cream). No dark toggle — ruled 2026-09-03 (D7).

## Commands

`pnpm dev` · `pnpm build` · `pnpm lint` · `VERCEL_ENV=production pnpm build` (rail check)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
