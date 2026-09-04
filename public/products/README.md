# Product images

One folder per product slug (`tycho/`, `vault/`, `glyphdeck/`, `liturgos/`, `aspen-grove/`, …).
`lib/content/products.ts` → `productImages(slug)` reads the folder at build time; there is no
front-matter field for images, the folder IS the declaration.

## The two roles

- **`hero.{png,jpg,jpeg,webp}`** — one per folder. It is the product card image on `/products`
  and the home grid (`object-cover`, 4:3 crop) and the big centred image in the product page's
  landing screen (`components/products/ProductHero.tsx`, `object-contain`, capped at 60vh).
  Because it is cropped in one place and uncropped in the other, a hero wants to be
  **landscape and centre-weighted** — roughly 16:9, subject away from the edges. A missing
  hero is not an error: the page and the card both fall back to the seeded `GenerativeCover`
  at the same size.
- **every other image** — the gallery, shown in filename order as a carousel
  (`components/products/Gallery.tsx`). Name them so they sort:  `1a-home.png`, `1b-drawer.png`,
  `01-…`, `02-…`. Slides are a **fixed height** with automatic width, so portrait phone
  screenshots come out narrow (several visible at once) and landscape ones come out wide —
  mixing the two in one folder is fine.

Alt text: gallery images render with an empty `alt` (they are decorative in context, and the
prose says what they show); the hero uses the product's name.

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
