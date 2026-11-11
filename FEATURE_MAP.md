---
feature-map: 1
root: .
revision: 5c6fd22bdce4ccb51920e97d2d33806f2a35547b
reconciled: 2026-11-11
---
# lab-site feature map

One entry per user-visible route of the public site (Next.js App Router, static; no auth, no
database, no `/api`). Start the site and drive it with [VERIFY.md](VERIFY.md). Content is the CMS
(`content/`), so most "Backend" lines name a content directory read at build time.

**Maintenance rule:** change a route, a page's content source or its selector and you update its
entry in the same commit, then run `node scripts/check-feature-map.mjs FEATURE_MAP.md --routes 'app/**/*.{ts,tsx}'`
(CI runs it; errors fail, warnings print). Bump `revision:` only after re-reading the entries the drift
warnings name; bump `reconciled:` only after walking every entry.

Selectors: the site ships no `data-testid`. Entries use accessible roles, titles and landmarks
that exist in the code today, marked `working`; everything else says `none` with its reason.

## Home and shell

### Home
- **ID:** `home.landing`
- **Purpose:** One-sentence tagline, the three operating-measure discs, the products grid, and (when any post is listed) Latest and Research areas.
- **Where:** `/`
- **Reach:** `/`
- **Requires:** none; public site
- **Selector:** none — static prose and a canvas spirograph; use `getByRole('heading', { level: 1 })`
- **Code:** `app/page.tsx`, `components/home/`, `content/pages/home-tagline.md`, `content/pages/home-subtitle.md`, `content/specimen/autonomy.json`
- **Backend:** none — build-time reads of `content/`; `autonomy.json` is written by `scripts/recount-measures.mjs`
- **Status:** live
- **Notes:** With every post retired, no Latest and no Research areas section render. That is correct, not a bug. A null measure value draws no disc.

### Header, footer and navigation
- **ID:** `shell.nav`
- **Purpose:** Wordmark, Research dropdown (Overview plus populated areas), IntrinsicOS, Products, Work, About; footer with RSS, editorial policy, GitHub, email.
- **Where:** every route; phone uses a hamburger menu
- **Reach:** any page; at phone width tap the menu button top right
- **Requires:** viewport width decides desktop nav vs menu
- **Selector:** none — `getByRole('link', { name: 'Products' })`
- **Code:** `app/layout.tsx`, `components/layout/`, `lib/site.ts`
- **Backend:** none — `listedAreas()` from `lib/content/areas.ts` fills the dropdown
- **Status:** live

### Not found
- **ID:** `shell.not-found`
- **Purpose:** 404 page for any unknown URL, and for a draft slug in production.
- **Where:** any unmatched path
- **Reach:** `/no-such-page`
- **Requires:** none
- **Selector:** none — static
- **Code:** `app/not-found.tsx`
- **Backend:** none
- **Status:** live
- **Notes:** `dynamicParams = false` on every dynamic route, so unknown slugs 404 rather than render.

## Research

### Research index
- **ID:** `research.index`
- **Purpose:** Intro, area rows and the filterable list of listed posts; the empty-state copy when nothing is listed.
- **Where:** `/research` (light theme)
- **Reach:** header Research > Overview
- **Requires:** none
- **Selector:** none — `getByRole('heading', { name: 'Research' })`
- **Code:** `app/research/page.tsx`, `app/research/layout.tsx`, `components/research/`, `content/pages/research-intro.md`, `content/pages/research-empty.md`, `lib/content/posts.ts`
- **Backend:** none — `content/research/*.mdx` at build time
- **Status:** live
- **Notes:** Today all six posts are retired, so the index shows the empty state.

### Research post
- **ID:** `research.post`
- **Purpose:** A published post: header, body, then caveats, corrections and artifacts only when non-empty. A `draft` renders only on previews, with a draft chip.
- **Where:** `/research/<slug>`
- **Reach:** the index, an area page, or the URL
- **Requires:** a `published` post (none today) or, for `draft`, a non-production build (`VERCEL_ENV` not `production`)
- **Selector:** none — `getByRole('heading', { level: 1 })`
- **Code:** `app/research/[slug]/page.tsx`, `components/research/`, `lib/content/posts.ts`, `lib/content/post-status.ts`, `lib/content/draft-rail.ts`, `lib/mdx/render.tsx`, `content/research/`
- **Backend:** none — `content/research/<slug>.mdx`; front matter validated by `lib/content/schema.ts`
- **Status:** live
- **Notes:** The draft rail: `VERCEL_ENV=production pnpm build` must emit no route for a draft (`scripts/check-draft-rail.mjs`, in CI). No published or draft post exists today, so the live check is the script's test plus a temporary draft file; see VERIFY.md.

### Retired post notice
- **ID:** `research.retired`
- **Purpose:** A withdrawn post keeps its URL and shows title, original and retirement dates, the reason and a link back to `/research`. The body is never rendered. `noindex`.
- **Where:** `/research/<slug>` for each `status: retired` post
- **Reach:** `/research/when-your-benchmark-saturates` (all six original posts: `a-company-that-runs-out-of-a-folder`, `let-the-model-think-before-the-json`, `lm-studio-divides-context-among-slots`, `the-latency-was-the-reasoning-budget`, `the-reviewer-that-never-saw-the-authors-conversation`, `when-your-benchmark-saturates`)
- **Requires:** none
- **Selector:** none — page has `<meta name="robots" content="noindex, follow">`; assert that
- **Code:** `components/research/RetiredNotice.tsx`, `app/research/[slug]/page.tsx`, `lib/content/post-status.ts`, `content/research/`
- **Backend:** none — `retired{date,reason}` front matter
- **Status:** live

### Research area
- **ID:** `research.area`
- **Purpose:** One area's listed posts; an area with none renders the empty copy and is `noindex`.
- **Where:** `/research/areas/<area>`, area in `elicitation | agent-operations | local-compute`
- **Reach:** header Research dropdown (populated areas only), or the URL (all three always resolve)
- **Requires:** none
- **Selector:** none
- **Code:** `app/research/areas/[area]/page.tsx`, `lib/content/areas.ts`, `content/pages/research-area-empty.md`
- **Backend:** none — `content/research/`
- **Status:** live
- **Notes:** Area slugs are permanent URLs. All three are empty today.

### RSS feed
- **ID:** `research.feed`
- **Purpose:** RSS of published posts only (never draft, never retired).
- **Where:** `/feed.xml`
- **Reach:** footer "RSS feed"
- **Requires:** none
- **Selector:** none — XML; `curl` and check the item count
- **Code:** `app/feed.xml/route.ts`, `lib/content/kinds.ts`
- **Backend:** none — `publishedPosts()` over `content/research/`
- **Status:** live

## Products

### Products index
- **ID:** `products.index`
- **Purpose:** Cards for the company's bets (GlyphDeck, Liturgos). IntrinsicOS, VISR and Aspen Grove have `order` of 100 or more and are not listed.
- **Where:** `/products`
- **Reach:** header Products
- **Requires:** none
- **Selector:** none
- **Code:** `app/products/page.tsx`, `components/ui/`, `lib/content/products.ts`
- **Backend:** none — `content/products/*.mdx` and `public/products/<slug>/` images
- **Status:** live

### Product page
- **ID:** `products.detail`
- **Purpose:** One product's hero, prose and gallery.
- **Where:** `/products/<slug>` for `glyphdeck`, `liturgos`, `aspen-grove`
- **Reach:** a card on `/products` (aspen-grove: by URL, and `/case-studies/aspen-grove` redirects to it)
- **Requires:** none
- **Selector:** none
- **Code:** `app/products/[slug]/page.tsx`, `components/products/`, `lib/content/products.ts`, `content/products/glyphdeck.mdx`, `content/products/liturgos.mdx`, `content/products/aspen-grove.mdx`
- **Backend:** none
- **Status:** live

### IntrinsicOS with the embedded VISR demo
- **ID:** `products.intrinsic-os`
- **Purpose:** What the runtime is, its three parts, and the live VISR desk embedded mid-page.
- **Where:** `/products/intrinsic-os`; the demo sits under "the VISR" section
- **Reach:** header IntrinsicOS
- **Requires:** none; at tablet (1024x768) and desktop widths the Superintendent chat docks beside the deck, at phone width it does not. The frame is lazy, so scroll it into view before judging it
- **Selector:** working — `section[aria-label="Interactive demo"]` and `iframe[title="VISR, interactive demo with sample data"]`
- **Code:** `content/products/intrinsic-os.mdx`, `components/products/demos/VisrDemo.tsx`, `components/products/demos/index.tsx`, `components/products/SystemCards.tsx`, `public/visr-demo/`
- **Backend:** none — the demo's `public/visr-demo/demo/shim.js` answers every `/api/*` call in memory; zero network `/api` requests by design
- **Status:** live
- **Notes:** The demo's data is sample data (`public/visr-demo/demo/corpus.js`). Run the scrub check after changing it; see VERIFY.md.

### VISR product page
- **ID:** `products.visr`
- **Purpose:** The review desk, with the same embedded demo and a link to full screen.
- **Where:** `/products/visr`
- **Reach:** linked from the IntrinsicOS page; not in the nav or index
- **Requires:** as `products.intrinsic-os`
- **Selector:** working — same as `products.intrinsic-os`
- **Code:** `content/products/visr.mdx`, `app/products/[slug]/page.tsx`, `components/products/demos/VisrDemo.tsx`
- **Backend:** none — as above
- **Status:** live

### OpenLoom spec
- **ID:** `products.openloom`
- **Purpose:** The OpenLoom specification as documentation: banner, side contents, one page per `##` section.
- **Where:** `/products/aspen-grove/open-loom` and `/products/aspen-grove/open-loom/<section>`
- **Reach:** link on the Aspen Grove page
- **Requires:** none
- **Selector:** none — `getByRole('navigation')` for the contents rail
- **Code:** `app/products/aspen-grove/open-loom/`, `components/products/openloom/`, `lib/openloom/spec.ts`, `content/products/aspen-grove/open-loom.md`
- **Backend:** none — the one markdown file is split on `##` at build time; the first section redirects (permanent) to the base URL
- **Status:** live

### VISR demo, full screen
- **ID:** `visr.fullscreen`
- **Purpose:** The same vendored desk over the whole viewport; tablet and desktop dock the Superintendent chat. `noindex`, not in the sitemap.
- **Where:** `/visr`
- **Reach:** "Open full screen" under the embedded demo
- **Requires:** none; a phone shows the phone layout, tablet (1024x768) and desktop show the docked chat
- **Selector:** working — `iframe[title="VISR, interactive demo with sample data"]`
- **Code:** `app/visr/page.tsx`, `components/products/demos/VisrDemo.tsx`, `public/visr-demo/`
- **Backend:** none — in-memory shim; scripted Superintendent in `public/visr-demo/demo/supt/`
- **Status:** live
- **Notes:** Never hand-edit `public/visr-demo/` outside `demo/`; re-vendor with `scripts/vendor-visr-demo.mjs`. Demo checks (zero console errors, zero `/api`, zero off-origin requests) are in VERIFY.md.

## Work and About

### Work index
- **ID:** `work.index`
- **Purpose:** Client portfolio grid, then the open-source grid, each card with a 3D wireframe cover.
- **Where:** `/work`
- **Reach:** header Work
- **Requires:** WebGL for the covers; headless Chromium renders them
- **Selector:** none — canvas covers
- **Code:** `app/work/page.tsx`, `app/work/_components/WorkCard.tsx`, `components/work/`, `lib/content/work.ts`, `content/pages/work-client.md`, `content/pages/work-open-source.md`
- **Backend:** none — `content/work/*.mdx`
- **Status:** live

### Work case study
- **ID:** `work.case`
- **Purpose:** One client case study or open-source project.
- **Where:** `/work/<slug>`: `big-sleep-mps`, `blackthorn-geomatics`, `church-ops`, `dog-body-mind`, `gfbr`, `loom-swift`, `record-machine`, `retina`, `sophron-studies`, `timelogger`, `weft`
- **Reach:** a card on `/work`
- **Requires:** none
- **Selector:** none
- **Code:** `app/work/[slug]/page.tsx`, `lib/content/work.ts`, `content/work/`
- **Backend:** none
- **Status:** live

### About
- **ID:** `about.index`
- **Purpose:** Intro, bio, beliefs, operations, operating measures and contact.
- **Where:** `/about`
- **Reach:** header About
- **Requires:** none
- **Selector:** none
- **Code:** `app/about/page.tsx`, `components/about/`, `content/pages/about-*.md`, `content/pages/operating-measures.md`, `content/pages/how-this-works.md`
- **Backend:** none
- **Status:** live

### Editorial policy
- **ID:** `about.editorial`
- **Purpose:** How something gets published and what each rung (kind) claims.
- **Where:** `/about/editorial`
- **Reach:** footer "Editorial policy"
- **Requires:** none
- **Selector:** none
- **Code:** `app/about/editorial/page.tsx`, `components/about/KindsList.tsx`, `content/pages/editorial.md`, `content/pages/editorial-intro.md`, `lib/content/kinds.ts`
- **Backend:** none
- **Status:** live

## Crawlers and redirects

### Sitemap and robots
- **ID:** `seo.sitemap-robots`
- **Purpose:** `/sitemap.xml` lists the static pages, populated areas, published posts, products, the OpenLoom base and case studies; `/robots.txt` allows all and names the sitemap.
- **Where:** `/sitemap.xml`, `/robots.txt`
- **Reach:** URL
- **Requires:** none
- **Selector:** none — XML and text
- **Code:** `app/sitemap.ts`, `app/robots.ts`, `lib/site.ts`
- **Backend:** none
- **Status:** live
- **Notes:** Drafts, retired posts and `/visr` never appear.

### Redirects
- **ID:** `seo.redirects`
- **Purpose:** Old URLs land on their counterparts, all permanent except the resume PDF.
- **Where:** `next.config.ts`; order matters (first match wins)
- **Reach:** `curl -sI` each. `/products/vault` to `/products/intrinsic-os`; `/products/tycho` and `/instruments/tycho|ghost` to `/products`; `/instruments/<slug>` to `/products/<slug>`; `/instruments` to `/products`; `/case-studies/aspen-grove` to `/products/aspen-grove`; `/case-studies/<slug>` to `/work/<slug>`; `/case-studies` to `/work`; `/W_ASHER_POPE_Resume_20260325.pdf` (temporary) to the retired site's host
- **Requires:** none
- **Selector:** none — HTTP status and `location` header
- **Code:** `next.config.ts`
- **Backend:** none; the apex-to-www redirect is a Vercel domain setting, not in the repo
- **Status:** live

## Coverage
- `app/research/layout.tsx` — light-theme wrapper for the research surfaces
- `app/work/_components/WorkCard.tsx` — card used by `work.index`
- `app/products/aspen-grove/open-loom/layout.tsx` — banner and contents shell for `products.openloom`
- `app/products/aspen-grove/open-loom/[section]/page.tsx` — the per-section pages of `products.openloom`
- `app/layout.tsx` — root shell (fonts, header, footer, RSS alternate link), see `shell.nav`
- `./app/icon.png`, `./app/apple-icon.png`, `./app/opengraph-image.jpg`, `./app/twitter-image.jpg` — site icons and share images, no page of their own
- `./app/globals.css` — tokens and theme remap, no route
- `public/visr-demo/` — vendored VISR desk served inside the iframe; not a Next route
- `scripts/` — maintenance and verification scripts, not site features
