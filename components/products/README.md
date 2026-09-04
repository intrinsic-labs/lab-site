# components/products

The products surface. Two shapes live here, and they are deliberately different:

- **`/products`** is a **stack of full-width feature sections**, one per product — not a card
  grid. Asher, 2026-09-04: *"they need to look like their own standalone products, whereas
  this looks like a list of blog posts."* A grid flattens five different things into five
  identical cells; a screenful each makes every one arrive on its own.
- **`/products/[slug]`** is a **landing screen, then a carousel, then a document** — in that
  order.

| File | What it is |
|---|---|
| `ProductFeature.tsx` | One product's stage on `/products`: name huge (sans), the one-line `line`, the hero image large over a soft accent glow, a quiet mono status line, and a `See <name> →` button. Desktop alternates image-left / image-right; below `lg` it is image over text. `quiet` is IntrinsicOS's smaller treatment. Server component. |
| `SnapSections.tsx` | Sets `scroll-snap-type: y proximity` on the **document element** for as long as `/products` is mounted, desktop only, and removes it on unmount. Client component; the only reason it exists is that the document is the scroller, so a wrapper `div` cannot carry the property, and a rule in `globals.css` would leak onto every route. |
| `ProductHero.tsx` | The landing screen: name (huge, sans), the one sentence from front matter's `line`, then the hero image centred over a soft accent glow. The title is Neue Montreal (`font-sans`) at `clamp(2.75rem, 12vw, 8.5rem)`, so it scales with the viewport and cannot overflow a phone. **No status chip** — "just say Visit" (Asher, 2026-09-04); `Visit` is the only control. Server component. |
| `Gallery.tsx` | The gallery as a scroll-snap carousel — native horizontal scroll (so touch and trackpad are free), arrow keys, dot indicator. No carousel library. Client component. |

`ProductCard.tsx` is **not** here — it lives in `components/ui/` because the home page's
products row still uses it. `/products` no longer does.

## The carousel: the images are the control

There are **no arrow buttons under the strip** (removed 2026-09-04). Instead:

- clicking **any visible image** scrolls it to the centre;
- hovering a **non-centred** image lays one arrow over it pointing the way it will travel
  (`←` for a slide left of centre, `→` for one right of it) — the whole slide is the button,
  the arrow is decorative;
- the centred slide is full opacity, its neighbours are dimmed, so "which one is focused" is
  legible without a chrome element saying so;
- the **dot + `n / total` indicator is always centred** under the strip, and it is the only
  chrome left.

Touch still gets native snap scrolling and the strip is still focusable with `←` / `→`
stepping it — the click handling is additive, never a replacement for the scroller. If you
add a control here, ask first whether an image could carry it instead.

## Where status is stated

Exactly once per product page, as a quiet mono line at the top of the reading column
(`app/products/[slug]/page.tsx`): `statusNote` when the front matter has one, the plain
`STATUS_LABEL` otherwise — so a product with no note still says "In development" somewhere.
Not a chip, and never in the hero. `ProductFeature` renders the same line on the index.

## The `accent:` front-matter field

Optional, **token names only**: `accent | marker | ember | ink | sky`, each the name of a
semantic token `app/globals.css` already declares. It tints one radial glow behind that
product's image on `/products` and nothing else; absent means the site green. It is parsed in
`lib/content/products.ts` (`PRODUCT_ACCENTS`, `accentVar`) rather than in
`lib/content/schema.ts`, because it is a presentation detail of this surface — and resolved
to a `var()` in exactly one place, so no component here ever learns a colour value. A typo is
a build error, like the rest of the front-matter contract.

## Image conventions

There is no front-matter field for images. `productImages(slug)` (`lib/content/products.ts`)
reads `public/products/<slug>/`: `hero.*` is the hero, `card.*` is the card crop, everything
else is the gallery in filename order. The full convention — including why a hero wants to be
landscape, why `card.*` exists, and how portrait and landscape gallery slides coexist — is
`public/products/README.md`.

Two things follow for anyone editing here:

- **Every image slot must degrade.** A product whose screenshots haven't been captured yet
  still gets a landing screen and a feature section: the hero falls back to the seeded
  `GenerativeCover` at the same size, and `Gallery` renders nothing at all rather than an
  empty strip. The vault is the standing proof of that path.
- **Semantic tokens only.** `bg-paper`, `text-ink`, `text-ink-2`, `border-rule`, `text-accent`,
  and `var(--color-…)` inside the gradient washes. No hex anywhere: the palette is remapped
  in `app/globals.css` and these pages have to follow it without being touched.

## Small screens

The owner reads this site on a Pixel phone and a Pixel Tablet in Chrome, so 390 / 820 /
1180 are as much the target as 1400. Four things carry that and should not be undone:

- the hero title is sized in `vw`, not in breakpoint steps;
- the hero image is `object-contain` under `max-h-[64vh]`, so a portrait screenshot and a
  16:9 plate both fit without either being cropped or pushing the fold away;
- the carousel is a native scroller, so touch already works — and it must never widen the
  page. Its bleed is *padding inside the scroll area*, never a negative margin on an
  ancestor;
- every feature section is `overflow-hidden`, which is load-bearing rather than decorative:
  its glow is inset *negatively* and gave the page 9px of horizontal scroll at 390px until
  the section clipped it. Verified 0px overflow at 390 / 820 / 1400.
