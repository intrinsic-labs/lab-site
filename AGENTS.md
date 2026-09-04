# lab-site — Intrinsic Labs' public research site

Next.js (App Router, static), Tailwind v4, MDX content in-repo. Designed for deployment on Vercel to
`intrinsiclabs.co`. The vault project is `Projects/meta/lab/` in the Obsidian vault —
its `_brief.md` is the business-side source of truth; `docs/site-plan-2026-08-17.md`
(sections, decisions D1–D7 + rulings) and `docs/publication-cadence.md` (how a post gets
published) are the design docs. This file is the engineering entry point.

## Layout

```
app/            routes only — thin, compose components + lib
  research/     index, [slug] posts, areas/[area]
  products/     index + [slug] (the company's own bets: GlyphDeck, Liturgos, Tycho, Aspen Grove;
                the vault listed last) + aspen-grove/open-loom (the spec, plain markdown)
  work/         index + [slug] — the CLIENT portfolio (case studies ported from intrinsiclabs-co-v3)
  about/ about/editorial/
  feed.xml/     RSS (published posts only)
  sitemap.ts robots.ts not-found.tsx icon.svg
components/     layout/ ui/ research/ home/ about/ — presentational, no fs access except the
                home plate and ProductsGrid (reads public/products/<slug>/ for images)
content/        the CMS. research/*.mdx, products/*.mdx, work/*.mdx, specimen/ (home-page plate),
                pages/ (static-page prose — see below)
lib/content/    schema.ts (zod, the front-matter contract) · posts.ts · products.ts · work.ts
                areas.ts + kinds.ts (declared vocab) · draft-rail.ts · fs.ts · format.ts
                pages.ts (loads content/pages/*.md)
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

**Prose lives in `content/pages/`, never hardcoded as JSX text.** Static pages (about, editorial,
work, research, the home masthead, `HowThisWorks`) read their copy from
`content/pages/<name>.md` through `pageContent(name)` (`lib/content/pages.ts` — `gray-matter` +
the same js-yaml `JSON_SCHEMA` engine `lib/content/fs.ts` uses) and render it with `<Mdx source={…} />`
(`lib/mdx/render.tsx`). One file per page or per distinct section — there's no requirement to
cram a whole route into one file. Data that's already canonical elsewhere stays there instead of
being duplicated into markdown: `AreaCards` reads its copy from `AREA_INFO` in
`lib/content/areas.ts`, and the `work` page's `PRODUCTS` array stays inline data, not prose. Where
a page needs to splice a live, data-driven element into otherwise-static prose (e.g. the editorial
policy's publication-ladder list, driven by `lib/content/kinds.ts`), write an MDX shortcode —
`<ComponentName />` in the markdown — and pass `components={{ ComponentName }}` to `<Mdx>`; see
`content/pages/editorial.md` + `components/about/KindsList.tsx` for the pattern. Exception: content
that's mostly structured data with one or two dynamic tokens (the about page's Contact block, mailto
links) can stay in TSX rather than round-tripping through a template-substitution hack.

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
- **No `next/font/google` anywhere.** All four faces (Cardo, Neue Montreal, JetBrains Mono,
  Calling Code) are the exact files latent-spaces-web ships, vendored into `public/fonts/`
  and declared with `@font-face` at the top of `app/globals.css`. Don't swap one for a
  Google lookalike — Asher's ruling, 2026-09-04.
- No analytics. Deliberate (Sovereignty beam). Don't add a tracker.
- One colour mode, and it is **pure black** — the latent-spaces-web dark palette with
  `--color-paper: #000000` (re-skinned 2026-09-04; the cream/paper palette is gone). No
  toggle — the D7 ruling of 2026-09-03 still stands, only the mode changed. Every component
  reads the semantic tokens in `app/globals.css`, so the palette lives in exactly one place:
  never hardcode a colour in a component. `docs/style-notes.md` is the provenance table.
- Category/kind labels are **not stroked pills** — text on a low-opacity fill, small radius,
  no border (`.pill` in `globals.css`, `components/ui/Chip.tsx`). Ruled 2026-09-04.

## Commands

`pnpm dev` · `pnpm build` · `pnpm lint` · `VERCEL_ENV=production pnpm build` (rail check)

## The cold-reader gate (standing, since 2026-09-03)

Every change to site copy — `content/pages/*.md`, area/kind descriptions in `lib/content/`,
instrument front matter, any prose in TSX that slipped the rule above — is followed by a
**cold read**: dump the rendered text of every page (curl each route, strip tags) to one
file and hand it to a fresh agent that is told to read nothing else and explore nothing.
It reports as three readers (ML researcher, senior engineer, smart non-technical) on:
undefined/internal terms, sentences that read as marketing, claims wanting evidence, and
whether the front-page plate is legible. Fix or cut; then re-run if the change was large.
Two reads so far found 35 and 56 undefined terms respectively — the vocabulary of the
vault leaks into copy constantly, and nobody inside can see it. The gate exists because
Asher's standing instruction is that the site must register with an outsider who has no
context, and must not read as marketing.

Related house rules from the same session: never narrate honesty ("and we say so") — state
the fact and stop; never assert "every" where the site's own numbers say otherwise; The
Ghost is always "The Ghost" and lives under Tycho; `/products/tycho` is the one dark
page (`theme: dark` in its front matter) — a field that is now **inert**, since the whole
site is dark; it and `.dossier-dark` are kept only so content doesn't break.

Rules from the 2026-09-03 outsider pivot (Asher's feedback on v1.1): **Haiku writes
posts** (or the coordinating session itself) — never Opus, whose drafts ran long; Asher
edits. Posts are short, forward-looking and searching, never self-flagellating, and
never an internal bug report dressed as research — the LM Studio field note is the bar.
**Caveats, corrections and artifacts render only when non-empty.** **Cards, not lists**,
for any collection. Landing page is one sentence + the plate + three grids, ≤120 words
of prose. Post pages match latent-spaces-web's reading column (`docs/style-notes.md`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
