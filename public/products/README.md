# Product images

One folder per product slug (`tycho/`, `vault/`, `glyphdeck/`, `liturgos/`, `aspen-grove/`, …).
`lib/content/products.ts` → `productImages(slug)` reads the folder at build time; there is no
front-matter field for images, the folder IS the declaration.

## The three roles

- **`hero.{png,jpg,jpeg,webp}`** — one per folder. It is the big image on the product page's
  landing screen (`components/products/ProductHero.tsx`, `object-contain`, capped at 64vh)
  and the large image in that product's feature section on `/products`
  (`components/products/ProductFeature.tsx`, also `object-contain`). Both show it
  **uncropped**, so a hero wants to be **landscape and centre-weighted** — roughly 16:9.
- **`card.{png,jpg,jpeg,webp}`** — optional, and the answer to "the images on the home row
  don't work, I just need different images" (Asher, 2026-09-04). The card slot
  (`components/ui/ProductCard.tsx`, the home page's products row) is `object-cover` at **4:3**,
  which crops — and a 16:9 hero often loses its subject to that crop. Drop a
  card-specific file in and the card uses it; leave it out and the card falls back to
  `hero.*` exactly as before. **No code change and no front-matter field either way** — the
  folder is the declaration. Make it 4:3 and subject-centred.
- **every other image** — the gallery (a product whose front matter declares `demo:` shows an
  interactive demo in the gallery's place instead and no hero image — Tycho; see
  `components/products/demos/`), shown in filename order as a carousel
  (`components/products/Gallery.tsx`). Name them so they sort:  `1a-home.png`, `1b-drawer.png`,
  `01-…`, `02-…`. Slides are a **fixed height** with automatic width, so portrait phone
  screenshots come out narrow (several visible at once) and landscape ones come out wide —
  mixing the two in one folder is fine. `hero.*` and `card.*` are excluded from it by name.

A missing image is never an error: with no `hero.*` and no `card.*`, the page, the feature
section and the card all fall back to the seeded `GenerativeCover` at the same size.

Alt text: gallery images render with an empty `alt` (they are decorative in context, and the
prose says what they show); the hero and the card use the product's name.

**Dark screenshots are the one thing to watch.** The site's ground is pure black, so a
screenshot that is itself near-black (Tycho's) reads as a hole in the page rather than as an
image. Nothing in code can detect that — pick or crop a frame with something in it.

## What is where

Everything here is a **copy**, not a link — the site builds standalone. Provenance:

- `glyphdeck/` — `hero.png` is the mint console render; the gallery is the four GlyphDeck
  Studio shots (`.webp`, served as-is — no conversion needed), one raw in-game frame, and
  the five other console colourways. Copied from
  `~/dev/mobile/glyph/website/public/{console,studio,og}`.
- `liturgos/` — `hero.png` is the dashboard (`shot-1`); `01`–`03` are `shot-2`–`shot-4`.
  Copied from `~/dev/web/liturgos/apps/marketing/public/`.
- `tycho/` — the capture harness output: `hero.png` plus `01-cabinet` … `05-mobile`. The
  last is phone-aspect, which the carousel handles beside the landscape ones.
- `aspen-grove/` — `hero.jpg` is the marbled plate (shared with the Open Loom banner at
  `/products/aspen-grove/open-loom`), copied from latent-spaces-web's `openloom.jpg`. The
  fourteen `1a`–`1n` Claude Design screenshots are the gallery; `1a-home.png` was also the
  old hero and that duplicate copy has been removed.
- `vault/` — deliberately empty. It runs on the seeded `GenerativeCover`, which is the
  proof that the fallback path works.

No folder has a `card.*` yet — every card is still falling back to its `hero.*`.
